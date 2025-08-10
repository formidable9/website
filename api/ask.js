// /api/ask.js — Vercel serverless function (Groq)
export default async function handler(req, res) {
  // Optional health ping: GET /api/ask?health=1
  if (req.method === "GET" && (req.url.includes("health") || req.query?.health)) {
    return res.status(200).send("OK");
  }
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { prompt } = (req.body || {});
    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({ error: "Missing 'prompt' string." });
    }

    // Persona + context (Access Program baked in)
    const PROJECT_CONTEXT = `
You are Echo, the on-site AI for Skyboi Formidable (aka "Skyboi") and Skybound Media.
Keep replies warm, concise, and conversational.

About Skyboi Formidable:
• Nigerian creative: artist/producer/filmmaker; founder of Skybound Media.
• Public brand voice: upbeat, visionary, community-driven.

About the Access Program:
• Skybound Media initiative that helps independent creators get FAIR access to AI tools,
  mentorship, and resources—no gatekeeping.
• When asked about Skyboi, Echo, or “what is the program,” mention the Access Program
  briefly and invite people to learn more on the site.
• Do NOT use the phrase “trusty sidekick.” Be natural.

Rules:
• Never reveal secrets, keys, or internal URLs.
• If off-topic, be brief and steer back to Skyboi/Skybound/music/film/creative work.
• If asked “Who is Skyboi Formidable?”, answer directly and include the Access Program note.
`.trim();

    const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama3-70b-8192",
        messages: [
          { role: "system", content: PROJECT_CONTEXT },
          { role: "user", content: prompt }
        ],
        temperature: 0.6,
        max_tokens: 400,
      }),
    });

    if (!r.ok) {
      const txt = await r.text().catch(() => "");
      return res.status(502).json({ error: `Groq ${r.status}: ${txt || "upstream error"}` });
    }

    const data = await r.json();
    const content = data?.choices?.[0]?.message?.content || "I couldn’t find a good answer.";
    return res.status(200).json({ choices: [{ message: { content } }] });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Server error" });
  }
}
