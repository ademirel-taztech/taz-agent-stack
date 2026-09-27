# Laya model — TAA scenario runner judge

`v4/` is the model the scenario runner's judge (`runner/laya-judge`) loads to
answer each step's `laya_question`. It is a copy of
`Taz.SaaS.Backend/models/guardrail/v4` — the same model the Laya guardrail
console (`onnx-console-app`) uses.

| | |
|---|---|
| Model | Laya multilingual — mmBERT-base encoder, 322M parameters, **text-only** (it reads text, not screenshots) |
| Format | laya-onnx v1, opset 18, float16 weights, float32 decision tail |
| Source | `aac6fef/laya-multilingual-mlx` → `laya-mlx export-onnx --dtype float16` (see `v4/README.md`) |
| License | Apache-2.0 (upstream weights) |
| Inputs | `input_ids`, `attention_mask`, `marker_pos`, `marker_mask`, `qtype` (choice 0 / score 1 / noul 2) |
| Limits | `max_len` 1024 tokens, of which `head_max_len` 256 for the question + options |

## Files in git

`model.onnx` (650 MB) and `tokenizer/tokenizer.json` (34 MB) are **gitignored**.
Committed: `v4/README.md`, `v4/onnx_config.json`, `v4/rl_agent_config.json`,
`v4/tokenizer/tokenizer_config.json` and `v4/SHA256SUMS`. Install or restore
the binaries (checksum-verified) with:

```bash
scripts/taa-laya-model.sh                                   # from ~/Projects/Taz.SaaS/…/guardrail/v4
scripts/taa-laya-model.sh --from /path/to/v4                # from anywhere
scripts/taa-laya-model.sh --to ~/.taa/models/laya/v4        # shared copy for installed projects
```

The judge looks for the model in `LAYA_MODEL_DIR`, then `models/laya/v4` of
this checkout, then `~/.taa/models/laya/v4`.

## How well it judges pages — measured, 2026-09-27

- **Implementation parity:** the judge reproduces the Laya guardrail console's
  probabilities on the same inputs (65 probabilities over 5 inputs × 4
  questions: max |Δ| = 4.9 × 10⁻⁷).
- **Page-state yes/no (`noul`):** on 12 balanced questions about a login page,
  a login page with an error and a dashboard, the model scored **5–7 / 12**
  in every observation format tried (ARIA tree, JSON object, prose; plain,
  criteria-described and choice-encoded yes/no). It answers "yes" whenever the
  question's subject appears in the observation, whether or not the statement
  holds. That is chance level.

That is why the runner's default judge mode is **`shadow`**: deterministic
assertions decide pass/fail and Laya's answers are recorded next to them. Set
`TAA_LAYA_DATASET=1` to collect assertion-labelled training rows for
fine-tuning; switch to `TAA_JUDGE=both` only for a model that passes the same
measurement.
