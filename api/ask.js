// /api/ask.js — Vercel serverless function for Echo

export default async function handler(req, res) {
  // Health check: GET /api/health (or /api/ask?health=1)
  if (req.method === "GET") {
    if (req.url.includes("/health") || "health" in (req.query ?? {})) {
      return res.status(200).send("OK");
    }
    return res.status(405).json({ error: "Use POST for /api/ask" });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const prompt = (body?.prompt ?? "").toString().trim();
    if (!prompt) return res.status(400).json({ error: "Missing prompt" });

    const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama3-70b-8192",
        messages: [
          { role: "system", content: "You are Echo, Skyboi Formidable’s helpful assistant. Keep answers concise and friendly." },
          { role: "user", content: prompt }
        ],
        temperature: 0.7
      })
    });

    if (!r.ok) {
      const txt = await r.text().catch(() => "");
      return res.status(502).json({ error: `Groq ${r.status}: ${txt}` });
    }

    const data = await r.json();
    return res.status(200).json({
      choices: [{ message: { content: data?.choices?.[0]?.message?.content ?? "" } }]
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Server error" });
  }
}
