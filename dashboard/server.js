const http = require("http");
const fs = require("fs");
const path = require("path");
const url = require("url");

const PORT = process.env.PORT || 4173;
const PUBLIC_DIR = path.join(__dirname, "public");
const DATA_FILE = path.join(__dirname, "data", "status.json");

/** @type {Set<http.ServerResponse>} */
const clients = new Set();

function sendJson(res, code, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(code, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Cache-Control": "no-store",
  });
  res.end(body);
}

function readStatus() {
  const raw = fs.readFileSync(DATA_FILE, "utf8");
  return JSON.parse(raw);
}

function writeStatus(status) {
  const normalized = {
    ...status,
    project: {
      ...status.project,
      lastUpdated: new Date().toISOString(),
      overallProgress: calculateOverall(status.agents || []),
    },
  };
  fs.writeFileSync(DATA_FILE, `${JSON.stringify(normalized, null, 2)}\n`, "utf8");
  broadcast(normalized);
  return normalized;
}

function calculateOverall(agents) {
  if (!agents.length) return 0;
  const sum = agents.reduce((acc, agent) => acc + clamp(agent.progress || 0), 0);
  return Math.round(sum / agents.length);
}

function clamp(value) {
  if (value < 0) return 0;
  if (value > 100) return 100;
  return value;
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
      if (data.length > 2 * 1024 * 1024) {
        reject(new Error("Request body too large"));
      }
    });
    req.on("end", () => {
      if (!data) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(data));
      } catch {
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

function contentType(filePath) {
  if (filePath.endsWith(".html")) return "text/html; charset=utf-8";
  if (filePath.endsWith(".js")) return "application/javascript; charset=utf-8";
  if (filePath.endsWith(".css")) return "text/css; charset=utf-8";
  if (filePath.endsWith(".json")) return "application/json; charset=utf-8";
  return "text/plain; charset=utf-8";
}

function serveStatic(req, res, pathname) {
  const safePath = pathname === "/" ? "/index.html" : pathname;
  const fullPath = path.normalize(path.join(PUBLIC_DIR, safePath));
  if (!fullPath.startsWith(PUBLIC_DIR)) {
    sendJson(res, 403, { error: "Forbidden path" });
    return;
  }
  fs.readFile(fullPath, (err, file) => {
    if (err) {
      sendJson(res, 404, { error: "Not found" });
      return;
    }
    res.writeHead(200, {
      "Content-Type": contentType(fullPath),
      "Cache-Control": "no-store",
    });
    res.end(file);
  });
}

function broadcast(status) {
  const payload = `data: ${JSON.stringify(status)}\n\n`;
  for (const client of clients) {
    client.write(payload);
  }
}

function handleEvents(req, res) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-store, must-revalidate",
    Connection: "keep-alive",
    "Access-Control-Allow-Origin": "*",
  });

  clients.add(res);
  const initial = readStatus();
  res.write(`data: ${JSON.stringify(initial)}\n\n`);

  req.on("close", () => {
    clients.delete(res);
  });
}

const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url || "/", true);
  const pathname = parsed.pathname || "/";

  if (req.method === "GET" && pathname === "/health") {
    sendJson(res, 200, { ok: true, time: new Date().toISOString() });
    return;
  }

  if (req.method === "GET" && pathname === "/api/status") {
    sendJson(res, 200, readStatus());
    return;
  }

  if (req.method === "POST" && pathname === "/api/status") {
    try {
      const body = await parseBody(req);
      if (!body || !Array.isArray(body.agents) || !body.project) {
        sendJson(res, 400, { error: "status must include project and agents[]" });
        return;
      }
      const saved = writeStatus(body);
      sendJson(res, 200, saved);
    } catch (error) {
      sendJson(res, 400, { error: error.message });
    }
    return;
  }

  if (req.method === "POST" && pathname === "/api/agent-update") {
    try {
      const body = await parseBody(req);
      const { id, ...updates } = body || {};
      if (!id) {
        sendJson(res, 400, { error: "id is required" });
        return;
      }

      const status = readStatus();
      const idx = status.agents.findIndex((item) => item.id === id);
      if (idx === -1) {
        sendJson(res, 404, { error: "Agent not found" });
        return;
      }

      status.agents[idx] = {
        ...status.agents[idx],
        ...updates,
      };
      if (typeof status.agents[idx].progress === "number") {
        status.agents[idx].progress = clamp(status.agents[idx].progress);
      }

      const saved = writeStatus(status);
      sendJson(res, 200, saved);
    } catch (error) {
      sendJson(res, 400, { error: error.message });
    }
    return;
  }

  if (req.method === "GET" && pathname === "/events") {
    handleEvents(req, res);
    return;
  }

  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    res.end();
    return;
  }

  if (req.method === "GET") {
    serveStatic(req, res, pathname);
    return;
  }

  sendJson(res, 405, { error: "Method not allowed" });
});

fs.watchFile(DATA_FILE, { interval: 1000 }, () => {
  try {
    broadcast(readStatus());
  } catch (error) {
    // noop: skip malformed interim writes
  }
});

server.listen(PORT, () => {
  console.log(`Agent dashboard running at http://localhost:${PORT}`);
});
