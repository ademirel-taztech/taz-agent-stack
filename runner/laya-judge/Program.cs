using System.Diagnostics;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Json.Nodes;
using LayaJudge;

// Laya judge — answers typed test-scenario questions (noul / choice / score) about a textual
// observation of a page or an HTTP response, using the local Laya multilingual ONNX model.
//
//   LayaJudge serve [--model-dir DIR]            JSON-lines over stdin/stdout (used by the runner)
//   LayaJudge ask --type noul --question "…" --state "…" [--criteria JSON] [--model-dir DIR]
//
// Model directory: --model-dir, else LAYA_MODEL_DIR, else <repo>/models/laya/v4, else
// ~/.taa/models/laya/v4.

var json = new JsonSerializerOptions
{
    Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
    PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
};

try
{
    if (args.Length == 0 || args[0] is "--help" or "-h")
    {
        Console.WriteLine("usage: LayaJudge serve [--model-dir DIR] | ask --type noul|choice|score --question TEXT --state TEXT [--criteria JSON] [--model-dir DIR]");
        return 0;
    }
    string mode = args[0];
    string? modelDir = null, type = null, question = null, state = null, criteria = null;
    for (int i = 1; i < args.Length; i++)
    {
        string Value() => ++i < args.Length ? args[i] : throw new ArgumentException($"Missing value for {args[i - 1]}");
        switch (args[i])
        {
            case "--model-dir": modelDir = Value(); break;
            case "--type": type = Value(); break;
            case "--question": question = Value(); break;
            case "--state": state = Value(); break;
            case "--criteria": criteria = Value(); break;
            default: throw new ArgumentException($"Unknown argument: {args[i]}");
        }
    }
    modelDir = ResolveModelDir(modelDir);

    var load = Stopwatch.StartNew();
    using var model = new LayaModel(modelDir);
    load.Stop();

    if (mode == "ask")
    {
        if (type is null || question is null || state is null)
            throw new ArgumentException("ask needs --type, --question and --state");
        JsonElement? crit = criteria is null ? null : JsonDocument.Parse(criteria).RootElement.Clone();
        var answer = model.Ask(new LayaQuestion(type, question, crit), state);
        Console.WriteLine(JsonSerializer.Serialize(ToWire(null, answer, 0), new JsonSerializerOptions(json) { WriteIndented = true }));
        return 0;
    }
    if (mode != "serve") throw new ArgumentException($"Unknown mode: {mode}");

    Console.Out.Flush();
    var stdout = new StreamWriter(Console.OpenStandardOutput()) { AutoFlush = true };
    stdout.WriteLine(JsonSerializer.Serialize(new
    {
        ready = true,
        model = "laya-multilingual",
        model_dir = modelDir,
        max_len = model.MaxLength,
        head_max_len = model.HeadMaxLength,
        load_ms = load.ElapsedMilliseconds,
    }, json));

    string? line;
    while ((line = Console.In.ReadLine()) is not null)
    {
        if (string.IsNullOrWhiteSpace(line)) continue;
        string? id = null;
        try
        {
            var req = JsonNode.Parse(line)?.AsObject() ?? throw new ArgumentException("Request must be a JSON object");
            id = req["id"]?.ToString();
            string qType = req["type"]?.GetValue<string>() ?? throw new ArgumentException("Missing type");
            string instructions = req["instructions"]?.GetValue<string>() ?? throw new ArgumentException("Missing instructions");
            JsonElement? crit = req["criteria"] is { } c ? JsonDocument.Parse(c.ToJsonString()).RootElement.Clone() : null;
            // State may be a string or structured JSON; structured state is serialized the way
            // upstream serialize_state does (Python json.dumps, ensure_ascii=False).
            string st = req["state"] switch
            {
                null => "",
                JsonValue v when v.GetValueKind() == JsonValueKind.String => v.GetValue<string>(),
                var node => PyJson.Dumps(JsonDocument.Parse(node.ToJsonString()).RootElement, ensureAscii: false),
            };
            var sw = Stopwatch.StartNew();
            var answer = model.Ask(new LayaQuestion(qType, instructions, crit), st);
            stdout.WriteLine(JsonSerializer.Serialize(ToWire(id, answer, sw.ElapsedMilliseconds), json));
        }
        catch (Exception ex) when (ex is not OutOfMemoryException)
        {
            stdout.WriteLine(JsonSerializer.Serialize(new { id, ok = false, error = ex.Message }, json));
        }
    }
    return 0;
}
catch (Exception ex)
{
    Console.Error.WriteLine($"[laya-judge] {ex.Message}");
    return 2;
}

static object ToWire(string? id, LayaAnswer a, long elapsedMs) => new
{
    id,
    ok = true,
    type = a.Type,
    noul = a.Noul,
    choice = a.Choice,
    score = a.Score,
    probabilities = a.Labels.Zip(a.Probabilities).ToDictionary(x => x.First, x => Math.Round(x.Second, 6)),
    confidence = Math.Round(a.Confidence, 6),
    act_probability = Math.Round(a.ActProbability, 6),
    input_tokens = a.InputTokens,
    state_tokens = a.StateTokens,
    state_truncated = a.StateTruncated,
    latency_ms = elapsedMs,
};

static string ResolveModelDir(string? explicitDir)
{
    var candidates = new List<string?>
    {
        explicitDir,
        Environment.GetEnvironmentVariable("LAYA_MODEL_DIR"),
    };
    // <repo>/models/laya/v4 when running from runner/.laya-judge-bin or runner/laya-judge/bin/...
    for (var dir = new DirectoryInfo(AppContext.BaseDirectory); dir is not null; dir = dir.Parent)
        candidates.Add(Path.Combine(dir.FullName, "models", "laya", "v4"));
    candidates.Add(Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), ".taa", "models", "laya", "v4"));
    foreach (var c in candidates)
        if (!string.IsNullOrEmpty(c) && File.Exists(Path.Combine(c, "model.onnx")))
            return c;
    throw new FileNotFoundException(
        "Laya model not found. Set LAYA_MODEL_DIR or install it with scripts/taa-laya-model.sh (looked in: "
        + string.Join(", ", candidates.Where(c => !string.IsNullOrEmpty(c)).Distinct()) + ")");
}
