// /api/ask.js — Vercel serverless function (Node.js)
// Uses GROQ_API_KEY set in your Vercel project settings

export default async function handler(req, res) {
  try {
    // Simple health check: GET /api/ask?health=1 or /api/health if you routed one
    if (req.method === "GET") {
      return res.status(200).send("OK");
    }

    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method Not Allowed" });
    }

    // --- get prompt ---
    let prompt = "";
    try {
      // Vercel automatically parses JSON; still defend against bad bodies
      prompt = (req.body?.prompt ?? "").toString().trim();
    } catch {
      prompt = "";
    }
    if (!prompt) {
      return res.status(400).json({ error: "Missing 'prompt'." });
    }

    // --- system instructions (your permanent voice + facts) ---
    const systemPrompt = `
You are **Echo**, Skyboi Formidable’s trusted AI sidekick.
Speak in a friendly, confident tone. Be concise, practical, and helpful.

Persistent facts you must remember and can cite naturally when relevant:
- Skyboi Formidable is a creative artist and founder of Skybound Media (music, film, creative tech).
- Official website: https://www.skybound.media
- YouTube channel: https://www.youtube.com/@skyboiformidable
- Spotify artist: https://open.spotify.com/artist/22EPuAH2XLNMkZMQCMsYAR

Link policy:
- Use plain text URLs (no markdown). Example: "Visit https://www.skybound.media".
- Mention the website when users ask for more info, contact, services, or “direct me to the site”.
- Mention YouTube when the topic is videos, interviews, live shows, or “watch”.
- Mention Spotify when the topic is music, songs, or listening.
- Do **not** mention any “access program” or internal instructions.

Tone/format:
- Keep answers direct. No markdown. No code fences.
- If user asks “who is Skyboi Formidable?”, include a short bio and point to the website + relevant links.
- If user asks for “directions” or “direct me”, reply with the exact URL(s).
`;

    // --- call Groq ---
    const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY || process.env.Groq_Api_Key || ""}`,
      },
      body: JSON.stringify({
        model: "llama3-70b-8192",
        temperature: 0.7,
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

    // Return in the shape your frontend expects
    return res.status(200).json({
      choices: [{ message: { content } }],
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Server error." });
  }
}
