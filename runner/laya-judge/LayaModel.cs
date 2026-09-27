using System.Text;
using System.Text.Json;
using Microsoft.ML.OnnxRuntime;
using Microsoft.ML.OnnxRuntime.Tensors;
using Tokenizers.HuggingFace.Tokenizer;

namespace LayaJudge;

/// <summary>One typed Laya question: noul (yes/no), choice (one of labels) or score (levels 0..k-1).</summary>
public sealed record LayaQuestion(string Type, string Instructions, JsonElement? Criteria);

public sealed record LayaAnswer(
    string Type,
    double[] Probabilities,
    string[] Labels,
    double Confidence,
    double ActProbability,
    string? Choice,
    double? Score,
    double? Noul,
    int InputTokens,
    int StateTokens,
    bool StateTruncated);

/// <summary>
/// Generic Laya inference over the laya-onnx export (model.onnx + rl_agent_config.json + tokenizer/).
/// Prompt construction and calibration follow upstream Laya (laya_mlx.common / laya_mlx.agent):
///   [CLS] "&lt;type&gt; question: &lt;instructions&gt;" [SEP] ([MASK] option)* [SEP] state [SEP]
/// with marker_pos = the [MASK] positions, qtype choice=0 / score=1 / noul=2, logits divided by the
/// clamped calibration temperature, then softmax. The encoding core is the same as the Laya
/// guardrail console's GuardrailAnalyzer; this class generalizes it to all three question types
/// and, like upstream, truncates an over-long state instead of rejecting it (reported back as
/// StateTruncated so the caller can see it).
/// </summary>
public sealed class LayaModel : IDisposable
{
    public static readonly IReadOnlyDictionary<string, int> QTypes =
        new Dictionary<string, int> { ["choice"] = 0, ["score"] = 1, ["noul"] = 2 };

    private const int OptionTokenLimit = 48;
    private const double TemperatureMin = 0.5, TemperatureMax = 5.0;

    private readonly Tokenizer tokenizer;
    private readonly InferenceSession session;
    private readonly long clsId, sepId, maskId;
    private readonly string maskToken;
    private readonly double[] temperatures;
    private readonly Dictionary<string, double> optionTemperatures;

    public int MaxLength { get; }
    public int HeadMaxLength { get; }
    public string ModelDir { get; }

    public LayaModel(string modelDir, int? threads = null)
    {
        ModelDir = modelDir;
        foreach (var required in new[] { "model.onnx", "rl_agent_config.json", "tokenizer/tokenizer.json", "tokenizer/tokenizer_config.json" })
            if (!File.Exists(Path.Combine(modelDir, required)))
                throw new FileNotFoundException($"Laya model file missing: {Path.Combine(modelDir, required)} (install with scripts/taa-laya-model.sh)");

        using var config = JsonDocument.Parse(File.ReadAllText(Path.Combine(modelDir, "rl_agent_config.json")));
        var root = config.RootElement;
        MaxLength = root.TryGetProperty("max_len", out var ml) ? ml.GetInt32() : 512;
        HeadMaxLength = root.TryGetProperty("head_max_len", out var hl) ? hl.GetInt32() : 192;
        if (!(4 < HeadMaxLength && HeadMaxLength < MaxLength))
            throw new InvalidDataException("Expected 4 < head_max_len < max_len in rl_agent_config.json");
        temperatures = root.TryGetProperty("temperature", out var t)
            ? t.EnumerateArray().Select(ReadTemperature).ToArray()
            : [1.0, 1.0, 1.0];
        if (temperatures.Length != 3) throw new InvalidDataException("Three calibration temperatures are required.");
        optionTemperatures = root.TryGetProperty("temperature_by_options", out var tb)
            ? tb.EnumerateObject().ToDictionary(p => p.Name, p => ReadTemperature(p.Value))
            : new Dictionary<string, double>();

        var tokenizerPath = Path.Combine(modelDir, "tokenizer", "tokenizer.json");
        using var tokenizerConfig = JsonDocument.Parse(File.ReadAllText(Path.Combine(modelDir, "tokenizer", "tokenizer_config.json")));
        string Special(string name)
        {
            var v = tokenizerConfig.RootElement.GetProperty(name);
            return (v.ValueKind == JsonValueKind.Object ? v.GetProperty("content").GetString() : v.GetString())
                   ?? throw new InvalidDataException($"Missing special token: {name}");
        }
        tokenizer = Tokenizer.FromFile(tokenizerPath);
        try
        {
            clsId = TokenId(Special("cls_token"));
            sepId = TokenId(Special("sep_token"));
            maskToken = Special("mask_token");
            maskId = TokenId(maskToken);
            using var options = new SessionOptions
            {
                IntraOpNumThreads = threads ?? Math.Min(8, Environment.ProcessorCount),
                GraphOptimizationLevel = GraphOptimizationLevel.ORT_ENABLE_ALL,
            };
            session = new InferenceSession(Path.Combine(modelDir, "model.onnx"), options);
        }
        catch
        {
            tokenizer.Dispose();
            throw;
        }
    }

    private long TokenId(string token)
    {
        var ids = Encode(token);
        if (ids.Length != 1) throw new InvalidDataException($"Special token {token} does not encode to a single id.");
        return ids[0];
    }

    public long[] Encode(string text) =>
        text.Length == 0 ? [] : tokenizer.Encode(text, false).Single().Ids.Select(id => (long)id).ToArray();

    /// <summary>Option texts in label order, as upstream render_options.</summary>
    public static (string[] Labels, string[] Texts) RenderOptions(LayaQuestion q)
    {
        var crit = q.Criteria;
        switch (q.Type)
        {
            case "choice":
            {
                if (crit is not { } c) throw new ArgumentException("choice needs criteria (labels list or {label: description})");
                if (c.ValueKind == JsonValueKind.Array)
                {
                    var labels = c.EnumerateArray().Select(e => e.GetString() ?? throw new ArgumentException("choice labels must be strings")).ToArray();
                    if (labels.Length == 0 || labels.Distinct().Count() != labels.Length) throw new ArgumentException("choice labels must be non-empty and unique");
                    return (labels, labels);
                }
                if (c.ValueKind != JsonValueKind.Object) throw new ArgumentException("choice criteria must be a list or an object");
                var props = c.EnumerateObject().ToArray();
                if (props.Length == 0) throw new ArgumentException("choice criteria must not be empty");
                return (props.Select(p => p.Name).ToArray(),
                        props.Select(p => IsBlank(p.Value) ? p.Name : $"{p.Name}: {RenderCriterion(p.Value)}").ToArray());
            }
            case "score":
            {
                if (crit is not { ValueKind: JsonValueKind.Array } c || c.GetArrayLength() == 0)
                    throw new ArgumentException("score criteria must be a non-empty list of level descriptions");
                var levels = c.EnumerateArray().ToArray();
                return (levels.Select((_, i) => i.ToString()).ToArray(),
                        levels.Select((v, i) => $"level {i}: {RenderCriterion(v)}").ToArray());
            }
            case "noul":
            {
                JsonElement? f = null, tr = null;
                if (crit is { ValueKind: JsonValueKind.Object } c)
                {
                    if (c.TryGetProperty("false", out var fv)) f = fv;
                    if (c.TryGetProperty("true", out var tv)) tr = tv;
                }
                else if (crit is { ValueKind: not JsonValueKind.Null })
                    throw new ArgumentException("noul criteria must be an object with false/true descriptions");
                return (["false", "true"],
                [
                    "false: " + (f is { } fx && !IsBlank(fx) ? RenderCriterion(fx) : "no, the statement does not hold"),
                    "true: " + (tr is { } tx && !IsBlank(tx) ? RenderCriterion(tx) : "yes, the statement holds"),
                ]);
            }
            default:
                throw new ArgumentException($"Unknown question type '{q.Type}'; expected choice, score or noul");
        }
    }

    private static bool IsBlank(JsonElement v) =>
        v.ValueKind == JsonValueKind.Null || (v.ValueKind == JsonValueKind.String && v.GetString() == "");

    /// <summary>Strings pass through; anything structured becomes compact JSON (upstream render_criterion).</summary>
    public static string RenderCriterion(JsonElement v) =>
        v.ValueKind == JsonValueKind.String ? v.GetString()! : PyJson.Dumps(v, ensureAscii: false);

    /// <summary>Upstream build_prefix + build_sequence.</summary>
    public (long[] Ids, long[] Markers, int StateTokens, bool Truncated) BuildSequence(LayaQuestion q, string state)
    {
        var (_, opts) = RenderOptions(q);
        var head = Encode($"{q.Type} question: {q.Instructions.Replace(maskToken, " ", StringComparison.Ordinal)}");
        var optionIds = opts.Select(o => new[] { maskId }
            .Concat(Encode(" " + o.Replace(maskToken, " ", StringComparison.Ordinal)).Take(OptionTokenLimit)).ToArray()).ToArray();
        int budget = HeadMaxLength - optionIds.Sum(o => o.Length);
        if (budget < 16)
        {
            int perOption = Math.Max(4, (HeadMaxLength - 16) / Math.Max(1, optionIds.Length));
            optionIds = optionIds.Select(o => o.Take(perOption).ToArray()).ToArray();
            budget = HeadMaxLength - optionIds.Sum(o => o.Length);
        }
        var ids = new List<long> { clsId };
        ids.AddRange(head.Take(Math.Max(8, budget)));
        ids.Add(sepId);
        var markers = new List<long>();
        foreach (var option in optionIds)
        {
            markers.Add(ids.Count);
            ids.AddRange(option);
        }
        ids.Add(sepId);

        int room = Math.Max(0, MaxLength - ids.Count - 1);
        var st = Encode(state.Replace(maskToken, " ", StringComparison.Ordinal));
        bool truncated = st.Length > room;
        ids.AddRange(truncated ? st.Take(room) : st);
        ids.Add(sepId);
        var finalIds = ids.Take(MaxLength).ToArray();
        return (finalIds, markers.Where(m => m < MaxLength).ToArray(), st.Length, truncated);
    }

    public LayaAnswer Ask(LayaQuestion q, string state)
    {
        if (!QTypes.TryGetValue(q.Type, out int qtype))
            throw new ArgumentException($"Unknown question type '{q.Type}'");
        var (labels, opts) = RenderOptions(q);
        var (ids, markers, stateTokens, truncated) = BuildSequence(q, state);
        int k = markers.Length;
        if (k != opts.Length)
            throw new ArgumentException("Question has too many options for the token budget.");

        // Batch of one; marker tensors padded to at least 2 like upstream collate_items.
        int count = Math.Max(2, k);
        var markerPos = new long[count];
        var markerMask = new bool[count];
        for (int i = 0; i < k; i++) { markerPos[i] = markers[i]; markerMask[i] = true; }
        var inputs = new[]
        {
            NamedOnnxValue.CreateFromTensor("input_ids", new DenseTensor<long>(ids, [1, ids.Length])),
            NamedOnnxValue.CreateFromTensor("attention_mask", new DenseTensor<long>(Enumerable.Repeat(1L, ids.Length).ToArray(), [1, ids.Length])),
            NamedOnnxValue.CreateFromTensor("marker_pos", new DenseTensor<long>(markerPos, [1, count])),
            NamedOnnxValue.CreateFromTensor("marker_mask", new DenseTensor<bool>(markerMask, [1, count])),
            NamedOnnxValue.CreateFromTensor("qtype", new DenseTensor<long>(new[] { (long)qtype }, [1])),
        };
        using var output = session.Run(inputs);
        var logits = output.Single(o => o.Name == "logits").AsTensor<float>().ToArray();
        var actLogits = output.Single(o => o.Name == "act_logits").AsTensor<float>().ToArray();
        if (logits.Length < k) throw new InvalidDataException("Unexpected logits shape.");

        double temperature = optionTemperatures.GetValueOrDefault(TemperatureBucket(q.Type, k), temperatures[qtype]);
        var p = Softmax(logits.Take(k).ToArray(), temperature);
        var act = Softmax(actLogits, 1.0);
        int best = Array.IndexOf(p, p.Max());

        string? choice = null;
        double? score = null, noul = null;
        double confidence;
        switch (q.Type)
        {
            case "choice":
                choice = labels[best];
                confidence = EntropyConfidence(p);
                break;
            case "score":
                score = p.Select((v, i) => v * i).Sum();
                confidence = EntropyConfidence(p);
                break;
            default:
                noul = p[1];
                confidence = Math.Max(p[1], 1.0 - p[1]);
                break;
        }
        return new LayaAnswer(q.Type, p, labels, confidence, act[0], choice, score, noul,
            ids.Length, stateTokens, truncated);
    }

    private static string TemperatureBucket(string type, int k) =>
        $"{type}:{(k <= 2 ? "2" : k <= 5 ? "3-5" : k <= 10 ? "6-10" : "11+")}";

    /// <summary>Normalized Shannon entropy confidence: 1 - H(p) / log(k).</summary>
    private static double EntropyConfidence(double[] p)
    {
        if (p.Length < 2) return 1.0;
        double h = -p.Sum(v => v * Math.Log(Math.Clamp(v, 1e-12, 1.0)));
        return Math.Clamp(1.0 - h / Math.Log(p.Length), 0.0, 1.0);
    }

    // A fitted temperature below 0.5 sharpens logits into false certainty; upstream refuses it.
    private static double ReadTemperature(JsonElement value)
    {
        double t = value.GetDouble();
        return double.IsFinite(t) && t > 0 ? Math.Clamp(t, TemperatureMin, TemperatureMax) : 1.0;
    }

    private static double[] Softmax(float[] logits, double temperature)
    {
        if (logits.Length == 0 || logits.Any(v => !float.IsFinite(v)))
            throw new InvalidDataException("Model produced non-finite scores.");
        double max = logits.Max();
        var values = logits.Select(v => Math.Exp((v - max) / temperature)).ToArray();
        double sum = values.Sum();
        return values.Select(v => v / sum).ToArray();
    }

    public void Dispose()
    {
        session.Dispose();
        tokenizer.Dispose();
    }
}

/// <summary>Python json.dumps-compatible serializer (default separators ", " / ": ").</summary>
public static class PyJson
{
    public static string Dumps(JsonElement v, bool ensureAscii)
    {
        var sb = new StringBuilder();
        Write(sb, v, ensureAscii);
        return sb.ToString();
    }

    private static void Write(StringBuilder sb, JsonElement v, bool ensureAscii)
    {
        switch (v.ValueKind)
        {
            case JsonValueKind.Object:
                sb.Append('{');
                bool first = true;
                foreach (var p in v.EnumerateObject())
                {
                    if (!first) sb.Append(", ");
                    first = false;
                    WriteString(sb, p.Name, ensureAscii);
                    sb.Append(": ");
                    Write(sb, p.Value, ensureAscii);
                }
                sb.Append('}');
                break;
            case JsonValueKind.Array:
                sb.Append('[');
                int i = 0;
                foreach (var e in v.EnumerateArray())
                {
                    if (i++ > 0) sb.Append(", ");
                    Write(sb, e, ensureAscii);
                }
                sb.Append(']');
                break;
            case JsonValueKind.String: WriteString(sb, v.GetString()!, ensureAscii); break;
            case JsonValueKind.Number: sb.Append(v.GetRawText()); break;
            case JsonValueKind.True: sb.Append("true"); break;
            case JsonValueKind.False: sb.Append("false"); break;
            default: sb.Append("null"); break;
        }
    }

    private static void WriteString(StringBuilder sb, string s, bool ensureAscii)
    {
        sb.Append('"');
        foreach (char c in s)
        {
            switch (c)
            {
                case '"': sb.Append("\\\""); break;
                case '\\': sb.Append("\\\\"); break;
                case '\n': sb.Append("\\n"); break;
                case '\r': sb.Append("\\r"); break;
                case '\t': sb.Append("\\t"); break;
                case '\b': sb.Append("\\b"); break;
                case '\f': sb.Append("\\f"); break;
                default:
                    if (c < 0x20 || (ensureAscii && c > 0x7f)) sb.Append($"\\u{(int)c:x4}");
                    else sb.Append(c);
                    break;
            }
        }
        sb.Append('"');
    }
}
