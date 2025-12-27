// Path: src/core/AuditTrail.js

export class AuditTrail {
  constructor() {
    this.buffer = [];
    this.maxEntries = 2048;
  }

  static getInstance() {
    if (!AuditTrail._instance) {
      AuditTrail._instance = new AuditTrail();
    }
    return AuditTrail._instance;
  }

  record(entry) {
    const normalized = {
      id: entry.id,
      timestamp: entry.timestamp || new Date().toISOString(),
      originalPrompt: entry.originalPrompt,
      rewrittenPrompt: entry.rewrittenPrompt || null,
      classification: entry.classification || null,
      postClassification: entry.postClassification || null,
      policyDecision: entry.policyDecision || null,
      mitigations: entry.mitigations || [],
      note: entry.note || null
    };

    this.buffer.push(normalized);
    if (this.buffer.length > this.maxEntries) {
      this.buffer.shift();
    }

    if (typeof console !== "undefined" && console.debug) {
      console.debug("[ImageComplianceAudit]", JSON.stringify(normalized));
    }
  }

  getRecent(limit = 100) {
    return this.buffer.slice(-limit);
  }

  clear() {
    this.buffer = [];
  }
}
