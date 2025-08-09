// Render backend for Echo (CommonJS, no ESM headaches)
const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch"); // v2.x

const app = express();
app.use(cors());
app.use(express.json());

// health check
app.get("/", (_req, res) => res.send("OK"));

// optional: check key is loaded
app.get("/keycheck", (_req, res) => {
  const k = process.env.GROQ_API_KEY || "";
  res.json({ ok: !!k, len: k.length, head: k.slice(0, 6) + "..." });
});

// main endpoint your site calls
app.post("/api/ask", async (req, res) => {
  try {
    const prompt = req.body?.prompt;
    if (!prompt) return res.status(400).json({ error: "Prompt is required" });

    const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: "llama3-70b-8192",
        messages: [
          { role: "system", content: "You are Echo, a helpful AI assistant." },
          { role: "user", content: prompt }
        ],
        temperature: 0.9
      })
    });

    const data = await r.json();
    res.status(r.status).json(data);
  } catch (e) {
    res.status(500).json({ error: "Proxy error", detail: String(e) });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Echo backend running on " + PORT));
