import { Agent } from "@cursor/sdk";

export const config = {
  maxDuration: 120,
};

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  if (!process.env.CURSOR_API_KEY) {
    res.status(503).json({
      error:
        "Configure CURSOR_API_KEY nas variáveis de ambiente da Vercel (Settings → Environment Variables).",
    });
    return;
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
    const prompt = body.prompt?.trim();
    if (!prompt) {
      res.status(400).json({ error: "Campo prompt vazio" });
      return;
    }

    const result = await Agent.prompt(prompt, {
      apiKey: process.env.CURSOR_API_KEY,
      model: { id: "composer-2.5" },
      cloud: {},
    });

    const texto =
      typeof result?.result === "string"
        ? result.result
        : result?.result != null
          ? JSON.stringify(result.result, null, 2)
          : `Status: ${result?.status ?? "sem resposta"}`;

    res.status(200).json({ resposta: texto });
  } catch (e) {
    res.status(500).json({ error: e.message || String(e) });
  }
}
