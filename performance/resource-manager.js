'use strict';
const counters = { cacheHits: 0, cacheMisses: 0, outboundPayloadBytes: 0, inboundMediaBytes: 0 };
function add(name, amount = 1) {
  if (!(name in counters)) return;
  counters[name] += Math.max(0, Number(amount) || 0);
}
function snapshot() { return Object.freeze({ ...counters, memory: process.memoryUsage ? process.memoryUsage() : null, uptimeSeconds: Math.floor(process.uptime()) }); }
module.exports = { add, snapshot };
