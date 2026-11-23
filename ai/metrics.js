'use strict';
const state = { requests: 0, failures: 0, visionRequests: 0, startedAt: Date.now(), totalLatencyMs: 0 };
function record({ ok, latencyMs = 0, vision = false } = {}) {
  state.requests += 1;
  if (!ok) state.failures += 1;
  if (vision) state.visionRequests += 1;
  state.totalLatencyMs += Math.max(0, Number(latencyMs) || 0);
}
function snapshot() {
  return Object.freeze({ ...state, averageLatencyMs: state.requests ? Math.round(state.totalLatencyMs / state.requests) : 0 });
}
module.exports = { record, snapshot };
