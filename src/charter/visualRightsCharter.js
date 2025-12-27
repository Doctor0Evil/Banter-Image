// Path: src/charter/visualRightsCharter.js

/**
 * Javaspectre Visual Rights Charter (v1)
 * Encodes the 10 rules as a machine-readable object
 * and provides helpers to map policy decisions to rights.
 */
export function getVisualRightsCharter() {
  return {
    version: "1.0.0",
    name: "Javaspectre Visual Rights Charter",
    updatedAt: "2025-12-26T23:14:00Z",
    principles: [
      {
        id: "R1_MATURE_EXPRESSION",
        title: "Right to Mature Expression (Banter & Violence)",
        description:
          "Users may generate fictional, stylized, and game-like content with profanity and intense or graphic combat, so long as no real minors, real individuals, or protected groups are harmed or dehumanized."
      },
      {
        id: "R2_NO_SEXUALIZED_MINORS",
        title: "Absolute Prohibition on Sexualized Minors",
        description:
          "Any sexual or nudity-related depiction involving minors (real or implied) is strictly banned, non-mitigable, and always rejected at the policy layer and in the codebase."
      },
      {
        id: "R3_NO_NONCONSENSUAL_REAL_WORLD_EXPLOITATION",
        title: "No Non-Consensual Real-World Exploitation",
        description:
          "Content depicting real, identifiable people in non-consensual sexual, violent, or reputationally destructive scenarios is forbidden, even if an underlying vendor model would allow it."
      },
      {
        id: "R4_STYLIZED_HORROR_PROTECTED",
        title: "Stylized Horror and Violence as Protected Fiction",
        description:
          "Horror, gore, and extreme stylized violence in fictional or game universes are allowed in designated modes with clear labeling and optional filters to avoid hyper-realistic depictions."
      },
      {
        id: "R5_TRANSPARENT_MODERATION",
        title: "Right to Transparent Moderation",
        description:
          "Every blocked or mitigated request must return a human-readable reason, the triggered safety category, and, when possible, a suggested safer reformulation instead of a generic refusal."
      },
      {
        id: "R6_CONFIGURABLE_SAFETY_MODES",
        title: "Right to Configurable Safety Modes",
        description:
          "Users may choose documented safety profiles (Default, Gaming, Adult Platform). Each profile’s scope and limits must be published, versioned, and auditable."
      },
      {
        id: "R7_NO_SHADOW_FILTERS",
        title: "No Secret Shadow Filters",
        description:
          "Any change in moderation behavior (new block list, category, or threshold) must be recorded in a changelog and, when feasible, surfaced via a policyVersion field in responses."
      },
      {
        id: "R8_LAYERED_PROTECTION",
        title: "Layered Protection, Not Single-Point Censorship",
        description:
          "Safety is implemented as a visible stack—classifier, policy engine, rewriter, audit trail—prioritizing mitigation and user adjustment over outright censorship."
      },
      {
        id: "R9_JURISDICTION_AWARE_RIGHTS_FORWARD",
        title: "Jurisdiction-Aware but Rights-Forward",
        description:
          "Deployments may adapt to local law, but the default profile maximizes adult expressive freedom while protecting children, vulnerable groups, and real-world safety."
      },
      {
        id: "R10_APPEAL_AND_OVERSIGHT",
        title: "Appeal and Oversight Mechanism",
        description:
          "Users must be able to submit blocked prompts or logs for review in governed spaces, enabling correction of false positives and refinement of policies and lexicons."
      }
    ]
  };
}

/**
 * Maps a low-level policy decision to charter rights
 * so the UI and logs can say which rights were honored or limited.
 *
 * @param {Object} decision - output from PolicyEngine.evaluate()
 * @returns {Object} { honored, limited }
 */
export function mapDecisionToCharter(decision) {
  const honored = [];
  const limited = [];

  if (decision.allowReasons && decision.allowReasons.length) {
    honored.push("R1_MATURE_EXPRESSION");
    honored.push("R4_STYLIZED_HORROR_PROTECTED");
  }

  if (decision.blockReasons && decision.blockReasons.length) {
    if (decision.blockReasons.includes("sexual_content_with_minors")) {
      limited.push("R2_NO_SEXUALIZED_MINORS");
    }
    if (decision.blockReasons.includes("self_harm_request")) {
      limited.push("R9_JURISDICTION_AWARE_RIGHTS_FORWARD");
    }
    if (decision.blockReasons.includes("hate_or_extremist_content")) {
      limited.push("R3_NO_NONCONSENSUAL_REAL_WORLD_EXPLOITATION");
    }
  }

  return { honored: Array.from(new Set(honored)), limited: Array.from(new Set(limited)) };
}
