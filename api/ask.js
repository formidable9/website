// /api/ask.js  — Vercel serverless function
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  try {
    const prompt = (req.body?.prompt || "").toString();
    if (!prompt) return res.status(400).json({ error: "Send JSON: { prompt: '...' }" });

    const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: "llama3-70b-8192",
        messages: [
          { role: "system", content: "You are Echo, a confident and intelligent female AI who responds clearly and naturally." },
          { role: "user", content: prompt }
        ]
      })
    });

    if (!r.ok) {
      const txt = await r.text().catch(() => "");
      return res.status(502).json({ error: `Groq ${r.status}: ${txt}` });
    }

    const data = await r.json();
    return res.status(200).json({
      choices: [{ message: { content: data?.choices?.[0]?.message?.content || "…" } }]
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Server error" });
  }
}
