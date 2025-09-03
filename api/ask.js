// /api/ask.js — Vercel serverless function (Node.js)
// Requires env var: GROQ_API_KEY

export default async function handler(req, res) {
  // --- CORS / preflight (safe for your same-origin frontend; harmless otherwise) ---
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST,GET,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    return res.status(204).end();
  }
  res.setHeader("Access-Control-Allow-Origin", "*");

  try {
    // Simple health check (GET /api/ask)
    if (req.method === "GET") {
      return res.status(200).send("OK");
    }

    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method Not Allowed" });
    }

    // --- get prompt ---
    let prompt = "";
    try {
      prompt = (req.body?.prompt ?? "").toString().trim();
    } catch {
      prompt = "";
    }
    if (!prompt) {
      return res.status(400).json({ error: "Missing 'prompt'." });
    }

    // --- system instructions: NEUTRAL, no sidekick, correct links ---
    const systemPrompt = `
You are Echo. Respond clearly, naturally, and concisely.
Do not call yourself a sidekick or assistant to Skyboi. Do not mention any “access program.”
If asked about Skyboi Formidable: he is an artist. When users ask for an official site, give: https://skyboundmedia.live
If users ask where to watch videos, you can share: https://www.youtube.com/@skyboiformidable
If users ask where to listen to music, you can share: https://open.spotify.com/artist/22EPuAH2XLNMkZMQCMsYAR
Only share links when relevant to the user’s request. No markdown, no code fences.
`;

    const apiKey =
      process.env.GROQ_API_KEY || process.env.Groq_Api_Key || process.env.groq_api_key || "";
    if (!apiKey) {
      return res.status(500).json({ error: "Server not configured (missing GROQ_API_KEY)." });
    }

    // --- call Groq ---
    const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
    model: "llama-3.3-70b-versatile",
        temperature: 0.6,
        max_tokens: 512,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!r.ok) {
      const txt = await r.text().catch(() => "");
      return res.status(502).json({ error: `Groq ${r.status}: ${txt || "bad gateway"}` });
    }

    const data = await r.json();
    const content =
      data?.choices?.[0]?.message?.content?.toString() ||
      "I couldn’t generate a reply. Please try again.";

    // Frontend-compatible shape
    return res.status(200).json({ choices: [{ message: { content } }] });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Server error." });
  }
}
