# Yuki v6 architecture

The v6 release introduces modular foundations while retaining the mature existing WhatsApp engine and command modules to minimize regressions.

- `core/command-runtime.js`: isolated command error normalization and safe user-facing failure messages.
- `permissions/access-control.js`: canonical Owner identity normalization and fail-closed role snapshot helper.
- `ai/groq-vision.js`: bounded Baileys sticker download and Groq multimodal content builder.
- `ai/metrics.js`: request, failure, vision and latency counters.
- `responses/response-engine.js`: reusable Yuki command response layouts.
- `performance/resource-manager.js`: process-local resource counters and memory/uptime snapshot.

The existing `index.js` still coordinates WhatsApp events, and `features.js` continues to own the established feature-command registry. The broadcast path is not modified.
