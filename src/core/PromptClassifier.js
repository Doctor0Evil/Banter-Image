// Path: src/core/PromptClassifier.js

export class PromptClassifier {
  constructor() {
    this.lexicons = {
      violenceSoft: [
        "battle", "fight", "warrior", "zombie", "monster",
        "video game", "boss fight", "demon", "dragon", "apocalypse",
        "shootout", "swordfight", "arena"
      ],
      violenceGraphic: [
        "gore", "disemboweled", "decapitated", "organs", "intestines",
        "splatter", "eviscerated", "dismembered", "blood everywhere",
        "brutal execution", "torn apart", "mutilated"
      ],
      sexualNudity: [
        "nude", "naked", "topless", "fully nude", "explicit",
        "pornographic", "bare breasts", "bare chest"
      ],
      sexualNonExplicit: [
        "lingerie", "bikini", "underwear", "seductive",
        "sensual", "boudoir", "suggestive pose"
      ],
      minors: [
        "child", "kid", "toddler", "schoolgirl",
        "schoolboy", "teen", "underage", "minor"
      ],
      hate: [
        "nazi", "kkk", "swastika", "lynching",
        "ethnic cleansing", "genocide"
      ],
      selfHarm: [
        "suicide", "self harm", "cutting myself",
        "kill myself", "overdose", "slit my wrists"
      ]
    };
  }

  async classify(promptText) {
    const text = (promptText || "").toLowerCase();

    const flags = {
      violenceSoft: this._matchAny(text, this.lexicons.violenceSoft),
      violenceGraphic: this._matchAny(text, this.lexicons.violenceGraphic),
      sexualNudity: this._matchAny(text, this.lexicons.sexualNudity),
      sexualNonExplicit: this._matchAny(text, this.lexicons.sexualNonExplicit),
      minors: this._matchAny(text, this.lexicons.minors),
      hate: this._matchAny(text, this.lexicons.hate),
      selfHarm: this._matchAny(text, this.lexicons.selfHarm),
      profanity: this._containsProfanity(text)
    };

    const severity = this._computeSeverity(flags);

    return {
      flags,
      severity,
      rawText: promptText
    };
  }

  _matchAny(text, terms) {
    return terms.some(term => text.includes(term));
  }

  _containsProfanity(text) {
    const list = [
      "fuck", "shit", "bitch", "asshole", "motherfucker",
      "bastard", "cunt", "dick", "prick"
    ];
    return list.some(w => text.includes(w));
  }

  _computeSeverity(flags) {
    if (flags.selfHarm || flags.violenceGraphic || (flags.sexualNudity && flags.minors)) {
      return "critical";
    }
    if (flags.sexualNudity || flags.hate) {
      return "high";
    }
    if (flags.sexualNonExplicit || flags.violenceSoft || flags.profanity) {
      return "medium";
    }
    return "low";
  }
}
