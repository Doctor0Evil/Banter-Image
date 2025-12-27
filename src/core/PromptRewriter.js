// Path: src/core/PromptRewriter.js

export class PromptRewriter {
  async rewrite(promptText, classification) {
    let prompt = promptText;
    const mitigations = [];

    if (classification.flags.minors && (classification.flags.sexualNudity || classification.flags.sexualNonExplicit)) {
      prompt = prompt
        .replace(/child|kid|toddler|schoolgirl|schoolboy|teen/gi, "adult")
        .replace(/underage|minor/gi, "adult");
      mitigations.push("replaced_minor_terms_with_adult");
    }

    if (classification.flags.selfHarm) {
      prompt = prompt.replace(
        /suicide|self harm|kill myself|cutting myself|overdose|slit my wrists/gi,
        "dark abstract symbolism"
      );
      mitigations.push("converted_self_harm_request_to_abstract_symbolism");
    }

    if (classification.flags.hate) {
      prompt = prompt.replace(
        /nazi|kkk|swastika|lynching|ethnic cleansing|genocide/gi,
        "generic villainous regime symbol"
      );
      mitigations.push("replaced_extremist_symbols_with_vague_villainous_motifs");
    }

    if (classification.flags.violenceGraphic) {
      prompt = prompt.replace(
        /\b(gore|gory|disemboweled|decapitated|organs|intestines|eviscerated|dismembered|mutilated)\b/gi,
        "intense stylized action"
      );
      mitigations.push("reduced_graphic_violence_to_stylized_action");
    }

    if (classification.flags.sexualNudity) {
      prompt = prompt.replace(
        /fully nude|nude|naked|topless|explicit|pornographic|bare breasts|bare chest/gi,
        "tasteful, non-explicit composition"
      );
      mitigations.push("converted_explicit_nudity_to_non_explicit_style");
    }

    if (classification.flags.profanity) {
      prompt = prompt.replace(/\bfuck\b/gi, "intense");
      prompt = prompt.replace(/\bshit\b/gi, "mess");
      prompt = prompt.replace(/\bbitch\b/gi, "rival");
      prompt = prompt.replace(/\basshole\b/gi, "jerk");
      prompt = prompt.replace(/\bmotherfucker\b/gi, "dangerous enemy");
      prompt = prompt.replace(/\bbastard\b/gi, "enemy");
      prompt = prompt.replace(/\bcunt\b/gi, "villain");
      mitigations.push("softened_profanity_in_prompt");
    }

    return { prompt, mitigations };
  }
}
