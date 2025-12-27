// Path: server.js

import http from "node:http";
import { assessImagePrompt } from "./src/imageCompliance/index.js";
import { AuditTrail } from "./src/core/AuditTrail.js";

const PORT = process.env.PORT || 8080;

function sendJson(res, statusCode, body) {
  const payload = JSON.stringify(body, null, 2);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(payload)
  });
  res.end(payload);
}

function parseJson(body) {
  try {
    return body ? JSON.parse(body) : {};
  } catch {
    return null;
  }
}

async function handleAssess(req, res) {
  let body = "";
  req.on("data", chunk => {
    body += chunk;
    if (body.length > 1024 * 32) {
      req.destroy();
    }
  });
  req.on("end", async () => {
    const data = parseJson(body);
    if (!data) {
      return sendJson(res, 400, { error: "invalid_json" });
    }

    const promptText = data.prompt || "";
    const userAge = typeof data.userAge === "number" ? data.userAge : null;
    const policyProfile = data.policyProfile || "default";
    const locale = data.locale || "global";
    const uiMode = data.uiMode || "end_user";

    try {
      const decision = await assessImagePrompt(promptText, {
        userAge,
        policyProfile,
        locale,
        uiMode
      });
      return sendJson(res, 200, decision);
    } catch (err) {
      return sendJson(res, 500, {
        error: "internal_error",
        message: "image-generation failed due to internal_error.",
        details: err && err.message ? err.message : null
      });
    }
  });
}

async function handleAppeal(req, res) {
  let body = "";
  req.on("data", chunk => {
    body += chunk;
    if (body.length > 1024 * 16) {
      req.destroy();
    }
  });
  req.on("end", () => {
    const data = parseJson(body);
    if (!data) {
      return sendJson(res, 400, { error: "invalid_json" });
    }

    const decisionId = data.decisionId || null;
    const userStatement = data.userStatement || "";
    const audit = AuditTrail.getInstance();
    const recent = audit.getRecent(500);

    const matched = decisionId
      ? recent.find(entry => entry.id === decisionId)
      : null;

    const appealRecord = {
      id: `appeal_${Date.now()}`,
      decisionId,
      userStatement,
      matchedDecisionSummary: matched
        ? {
            id: matched.id,
            status: matched.status,
            blockReasons: matched.blockReasons,
            charter: matched.charter
          }
        : null,
      createdAt: new Date().toISOString()
    };

    console.log("[ImageComplianceAppeal]", JSON.stringify(appealRecord));

    return sendJson(res, 200, {
      status: "received",
      appealId: appealRecord.id,
      message:
        "Your appeal has been recorded. In governed spaces, a human moderator can review this decision.",
      matchedDecision: appealRecord.matchedDecisionSummary
    });
  });
}

const server = http.createServer((req, res) => {
  const { method, url } = req;

  if (method === "POST" && url === "/assess-image-prompt") {
    return handleAssess(req, res);
  }

  if (method === "POST" && url === "/appeal") {
    return handleAppeal(req, res);
  }

  if (method === "GET" && url === "/health") {
    return sendJson(res, 200, { status: "ok" });
  }

  return sendJson(res, 404, { error: "not_found" });
});

server.listen(PORT, () => {
  console.log(`Javaspectre Visual Rights server running on port ${PORT}`);
});
