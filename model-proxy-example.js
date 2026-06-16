const http = require("http");

const port = Number(process.env.PORT || 8787);
const modelApiUrl = process.env.MODEL_API_URL || "";
const modelApiKey = process.env.MODEL_API_KEY || "";
const modelName = process.env.MODEL_NAME || "";

function sendJson(res, status, data) {
  res.writeHead(status, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Content-Type": "application/json; charset=utf-8",
  });
  res.end(JSON.stringify(data));
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    sendJson(res, 204, {});
    return;
  }

  if (req.method !== "POST" || req.url !== "/api/ai-report") {
    sendJson(res, 404, { message: "Not found" });
    return;
  }

  if (!modelApiUrl || !modelApiKey || !modelName) {
    sendJson(res, 500, {
      message: "请先配置 MODEL_API_URL、MODEL_API_KEY、MODEL_NAME 环境变量。",
    });
    return;
  }

  try {
    const body = await readJson(req);
    const modelRequest = {
      ...(body.request || {}),
      model: body.request?.model || modelName,
    };

    const upstream = await fetch(modelApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${modelApiKey}`,
      },
      body: JSON.stringify(modelRequest),
    });

    const text = await upstream.text();
    res.writeHead(upstream.status, {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": upstream.headers.get("content-type") || "application/json; charset=utf-8",
    });
    res.end(text);
  } catch (error) {
    sendJson(res, 500, { message: error.message || "Model proxy error" });
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Model proxy listening on http://127.0.0.1:${port}/api/ai-report`);
});
