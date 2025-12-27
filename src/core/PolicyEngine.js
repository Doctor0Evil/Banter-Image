// Path: src/core/PolicyEngine.js

export class PolicyEngine {
  constructor() {
    this.profiles = {
      default: {
        allowGraphicViolence: true,
        allowNonGraphicSexual: true,
        allowNudity: false,
        allowHateSymbols: false,
        allowSelfHarm: false,
        allowMinorsInSexualContext: false,
        requireAgeForViolence: 16,
        requireAgeForNonGraphicSex: 18,
        allowProfanityInPrompt: true
      },
      gaming: {
        allowGraphicViolence: true,
        allowNonGraphicSexual: false,
        allowNudity: false,
        allowHateSymbols: false,
        allowSelfHarm: false,
        allowMinorsInSexualContext: false,
        requireAgeForViolence: 15,
        requireAgeForNonGraphicSex: 18,
        allowProfanityInPrompt: true
      },
      adult_platform: {
        allowGraphicViolence: false,
        allowNonGraphicSexual: true,
        allowNudity: true,
        allowHateSymbols: false,
        allowSelfHarm: false,
        allowMinorsInSexualContext: false,
        requireAgeForViolence: 18,
        requireAgeForNonGraphicSex: 18,
        allowProfanityInPrompt: true
      }
    };
  }

  evaluate({ classification, userAge, policyProfile }) {
    const profile = this.profiles[policyProfile] || this.profiles.default;
    const { flags, severity } = classification;

    const blockReasons = [];
    const allowReasons = [];
    const filters = [];
    let status = "allow";
    let canMitigate = true;

    if (flags.minors && (flags.sexualNudity || flags.sexualNonExplicit)) {
      blockReasons.push("sexual_content_with_minors");
      return { status: "reject", blockReasons, allowReasons, filters, canMitigate: true };
    }

    if (flags.selfHarm && !profile.allowSelfHarm) {
      blockReasons.push("self_harm_request");
      return { status: "reject", blockReasons, allowReasons, filters, canMitigate: true };
    }

    if (flags.hate && !profile.allowHateSymbols) {
      blockReasons.push("hate_or_extremist_content");
      return { status: "reject", blockReasons, allowReasons, filters, canMitigate: true };
    }

    if (flags.violenceGraphic) {
      if (!profile.allowGraphicViolence) {
        blockReasons.push("graphic_violence_disallowed");
        status = "reject";
      } else {
        filters.push("no_realistic_gore");
        allowReasons.push("graphic_violence_allowed_with_stylization_filters");
        status = "allow_with_filters";
      }
    }

    if (!flags.violenceGraphic && flags.violenceSoft) {
      if (userAge !== null && userAge < profile.requireAgeForViolence) {
        status = "age_gate";
        blockReasons.push("soft_violence_requires_older_user");
      } else {
        allowReasons.push("soft_violence_permitted");
      }
    }

    if (flags.sexualNudity) {
      if (!profile.allowNudity) {
        blockReasons.push("nudity_disallowed");
        status = "reject";
      } else {
        if (userAge !== null && userAge < profile.requireAgeForNonGraphicSex) {
          status = "age_gate";
          blockReasons.push("nudity_requires_older_user");
        } else {
          filters.push("non_explicit_pose");
          allowReasons.push("nudity_allowed_with_non_explicit_constraints");
          status = "allow_with_filters";
        }
      }
    } else if (flags.sexualNonExplicit) {
      if (!profile.allowNonGraphicSexual) {
        blockReasons.push("sexual_tone_disallowed");
        status = "reject";
      } else {
        if (userAge !== null && userAge < profile.requireAgeForNonGraphicSex) {
          status = "age_gate";
          blockReasons.push("sexual_tone_requires_older_user");
        } else {
          allowReasons.push("non_explicit_sexual_tone_permitted");
        }
      }
    }

    if (!profile.allowProfanityInPrompt && classification.flags.profanity) {
      filters.push("strip_profanity_from_caption");
      allowReasons.push("profanity_removed_from_prompt");
      if (status === "allow") status = "allow_with_filters";
    }

    if (status === "allow" && severity === "low") {
      allowReasons.push("no_sensitive_content_detected");
    }

    return { status, blockReasons, allowReasons, filters, canMitigate };
  }
}
