// Path: src/imageCompliance/index.js

import { PromptClassifier } from "../core/PromptClassifier.js";
import { PolicyEngine } from "../core/PolicyEngine.js";
import { PromptRewriter } from "../core/PromptRewriter.js";
import { AuditTrail } from "../core/AuditTrail.js";

/**
 * status:
 *   "allow" | "allow_with_filters" | "age_gate" | "reject"
 */
export async function assessImagePrompt(promptText, options = {}) {
  const {
    userAge = null,
    locale = "global",
    policyProfile = "default",
  } = options;

  const classifier = new PromptClassifier();
  const policyEngine = new PolicyEngine();
  const rewriter = new PromptRewriter();
  const audit = AuditTrail.getInstance();

  const now = new Date().toISOString();
  const id = `trace_${now.replace(/[^0-9]/g, "")}`;

  const classification = await classifier.classify(promptText);
  const initialDecision = policyEngine.evaluate({
    promptText,
    classification,
    userAge,
    locale,
    policyProfile
  });

  let rewrittenPrompt = promptText;
  let mitigations = [];
  let finalDecision = initialDecision;
  let postClassification = classification;

  if (initialDecision.status === "reject" && initialDecision.canMitigate) {
    const rewriteResult = await rewriter.rewrite(promptText, classification, initialDecision);
    rewrittenPrompt = rewriteResult.prompt;
    mitigations = rewriteResult.mitigations;

    postClassification = await classifier.classify(rewrittenPrompt);
    finalDecision = policyEngine.evaluate({
      promptText: rewrittenPrompt,
      classification: postClassification,
      userAge,
      locale,
      policyProfile
    });
  }

  const successStatuses = ["allow", "allow_with_filters", "age_gate"];
  const effectiveStatus = successStatuses.includes(finalDecision.status)
    ? finalDecision.status
    : initialDecision.status;

  audit.record({
    id,
    timestamp: now,
    originalPrompt: promptText,
    rewrittenPrompt: rewrittenPrompt === promptText ? null : rewrittenPrompt,
    classification,
    postClassification,
    policyDecision: finalDecision,
    mitigations,
    note:
      effectiveStatus === "reject"
        ? "Prompt rejected after evaluation/mitigation."
        : "Prompt approved with current policy."
  });

  return {
    id,
    status: effectiveStatus,
    requiresAgeCheck: effectiveStatus === "age_gate",
    allowReasons: finalDecision.allowReasons,
    blockReasons: finalDecision.blockReasons,
    filters: finalDecision.filters,
    prompt: rewrittenPrompt,
    mitigations,
    uiMessage: buildUiMessage(promptText, rewrittenPrompt, effectiveStatus, finalDecision, mitigations)
  };
}

function buildUiMessage(original, rewritten, status, decision, mitigations) {
  if (status === "allow") {
    return "ok! here's your image.";
  }
  if (status === "allow_with_filters") {
    const f = decision.filters.length ? ` (with filters: ${decision.filters.join(", ")})` : "";
    return `ok! here's your image${f}.`;
  }
  if (status === "age_gate") {
    return "age check required before generating this image.";
  }
  // reject: soft, explicit
  const reason = decision.blockReasons.join(", ") || "policy_violation";
  const mitigationNote = mitigations.length
    ? ` A safer variant was attempted via: ${mitigations.join(", ")}.`
    : "";
  const same = original.trim() === rewritten.trim();
  const rewriteNote = same
    ? ""
    : ` Suggested safer prompt: "${rewritten}".`;
  return `image-generation failed due to ${reason}.${rewriteNote}${mitigationNote}`;
}
