// Path: src/imageCompliance/index.js

import { PromptClassifier } from "../core/PromptClassifier.js";
import { PolicyEngine } from "../core/PolicyEngine.js";
import { PromptRewriter } from "../core/PromptRewriter.js";
import { AuditTrail } from "../core/AuditTrail.js";
import {
  getVisualRightsCharter,
  mapDecisionToCharter
} from "../charter/visualRightsCharter.js";

/**
 * status:
 *   "allow" | "allow_with_filters" | "age_gate" | "reject"
 */
export async function assessImagePrompt(promptText, options = {}) {
  const {
    userAge = null,
    locale = "global",
    policyProfile = "default",
    uiMode = "developer" // "developer" | "end_user"
  } = options;

  const classifier = new PromptClassifier();
  const policyEngine = new PolicyEngine();
  const rewriter = new PromptRewriter();
  const audit = AuditTrail.getInstance();
  const charter = getVisualRightsCharter();

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

  const charterMapping = mapDecisionToCharter(finalDecision);

  const uiMessage = buildUiMessage({
    originalPrompt: promptText,
    rewrittenPrompt,
    status: effectiveStatus,
    decision: finalDecision,
    mitigations,
    charterMapping,
    uiMode
  });

  const response = {
    id,
    status: effectiveStatus,
    requiresAgeCheck: effectiveStatus === "age_gate",
    allowReasons: finalDecision.allowReasons,
    blockReasons: finalDecision.blockReasons,
    filters: finalDecision.filters,
    prompt: rewrittenPrompt,
    mitigations,
    uiMessage,
    charter: {
      version: charter.version,
      honored: charterMapping.honored,
      limited: charterMapping.limited
    },
    policyProfile,
    locale,
    classification,
    policyVersion: "v1.0.0"
  };

  audit.record({
    ...response,
    timestamp: now,
    originalPrompt: promptText,
    note:
      effectiveStatus === "reject"
        ? "Prompt rejected after evaluation and mitigation."
        : "Prompt approved under active policy with Visual Rights Charter applied."
  });

  return response;
}

function buildUiMessage({
  originalPrompt,
  rewrittenPrompt,
  status,
  decision,
  mitigations,
  charterMapping,
  uiMode
}) {
  const same = originalPrompt.trim() === rewrittenPrompt.trim();
  const rightsHonored = charterMapping.honored.join(", ");
  const rightsLimited = charterMapping.limited.join(", ");

  if (status === "allow") {
    if (uiMode === "end_user") {
      return "ok! here's your image.";
    }
    return `ok! here's your image. (rights honored: ${rightsHonored || "R1_MATURE_EXPRESSION"})`;
  }

  if (status === "allow_with_filters") {
    const f = decision.filters.length ? ` with filters: ${decision.filters.join(", ")}` : "";
    if (uiMode === "end_user") {
      return `ok! here's your image${f}.`;
    }
    return `ok! here's your image${f}. (rights honored: ${rightsHonored || "R1_MATURE_EXPRESSION"})`;
  }

  if (status === "age_gate") {
    if (uiMode === "end_user") {
      return "age verification required before generating this image.";
    }
    return `age verification required. (limited rights: ${rightsLimited || "R9_JURISDICTION_AWARE_RIGHTS_FORWARD"})`;
  }

  const reason = decision.blockReasons.join(", ") || "policy_violation";
  const mitigationNote = mitigations.length
    ? ` A safer variant was attempted via: ${mitigations.join(", ")}.`
    : "";
  const rewriteNote = same
    ? ""
    : ` Suggested safer prompt: "${rewrittenPrompt}".`;
  if (uiMode === "end_user") {
    return `image-generation failed due to ${reason}.${rewriteNote}`;
  }
  return `image-generation failed due to ${reason}.${rewriteNote}${mitigationNote} (rights limited: ${rightsLimited || "none"})`;
}
