/**
 * Ponte entre questoes.html e o Cursor (SDK).
 * Rode: npm install && npm run tutor
 * Deixe este terminal aberto enquanto estuda.
 */
import http from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = 3847;
const HOST = "127.0.0.1";

function loadEnv() {
  const envPath = join(__dirname, ".env");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}

loadEnv();

let Agent;
try {
  ({ Agent } = await import("@cursor/sdk"));
} catch (e) {
  console.error("Rode primeiro: npm install");
  process.exit(1);
}

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  cors(res);

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = req.url?.split("?")[0];

  if (url === "/health" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(
      JSON.stringify({
        ok: true,
        hasKey: Boolean(process.env.CURSOR_API_KEY),
      })
    );
    return;
  }

  if (url === "/explain" && req.method === "POST") {
    if (!process.env.CURSOR_API_KEY) {
      res.writeHead(503, { "Content-Type": "application/json; charset=utf-8" });
      res.end(
        JSON.stringify({
          error:
            "Crie o arquivo .env com CURSOR_API_KEY=... (veja .env.example)",
        })
      );
      return;
    }

    try {
      const raw = await readBody(req);
      const { prompt } = JSON.parse(raw || "{}");
      if (!prompt?.trim()) {
        res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ error: "Campo prompt vazio" }));
        return;
      }

      console.log("[tutor] Pergunta recebida, consultando Cursor...");
      const result = await Agent.prompt(prompt, {
        apiKey: process.env.CURSOR_API_KEY,
        model: { id: "composer-2.5" },
        local: { cwd: __dirname },
      });

      const texto =
        typeof result?.result === "string"
          ? result.result
          : result?.result != null
            ? JSON.stringify(result.result, null, 2)
            : `Status: ${result?.status ?? "sem resposta"}`;

      console.log("[tutor] Resposta ok.");
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ resposta: texto }));
    } catch (e) {
      console.error("[tutor] Erro:", e.message);
      res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ error: e.message || String(e) }));
    }
    return;
  }

  res.writeHead(404);
  res.end("Not found");
});

server.listen(PORT, HOST, () => {
  console.log("");
  console.log("  Tutor Cursor — ligado");
  console.log(`  http://${HOST}:${PORT}`);
  console.log(
    process.env.CURSOR_API_KEY
      ? "  API key: ok"
      : "  AVISO: crie .env com CURSOR_API_KEY (veja .env.example)"
  );
  console.log("  Deixe este terminal aberto e use Explicar aqui no questoes.html");
  console.log("");
});
