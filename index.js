// --- Frontend wiring for Echo on Vercel ---

// endpoints (relative to the same Vercel domain)
const API_URL = "/api/ask";
const HEALTH_URL = "/api/health";

const $ = (sel) => document.querySelector(sel);
const out = (t) => ($("#ai-response").innerText = t);

// Speak in a pleasant female EN voice when available
async function getVoicesOnce() {
  return new Promise((resolve) => {
    const v = speechSynthesis.getVoices();
    if (v.length) return resolve(v);
    speechSynthesis.onvoiceschanged = () => resolve(speechSynthesis.getVoices());
  });
}
async function speak(text) {
  try {
    const voices = await getVoicesOnce();
    const voice = voices.find(
      v => v.lang?.includes("en") && v.name?.toLowerCase().includes("female")
    ) || voices[0];
    const u = new SpeechSynthesisUtterance(text);
    u.voice = voice; u.pitch = 1.05; u.rate = 1; u.volume = 1;
    speechSynthesis.cancel(); speechSynthesis.speak(u);
  } catch {}
}

// Wake the function once so first call isn’t slow
window.addEventListener("load", async () => {
  try { await fetch(HEALTH_URL, { cache: "no-store" }); } catch {}
});

// Core call
async function askEcho(prompt) {
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 30000);

  const r = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
    signal: ctrl.signal
  }).catch((e) => {
    throw new Error(e?.message || "Network error");
  });

  clearTimeout(timeout);

  if (!r.ok) {
    const txt = await r.text().catch(()=>"");
    throw new Error(`Backend ${r.status}: ${txt || "error"}`);
  }
  const data = await r.json().catch(() => ({}));
  return data?.choices?.[0]?.message?.content || "No response.";
}

// Text flow
async function askByText() {
  const input = $("#text-input").value.trim();
  if (!input) return;
  out("Thinking…");
  try {
    const reply = await askEcho(input);
    out(reply);
    speak(reply);
  } catch {
    out("Backend offline. Try again shortly.");
  }
}

// Voice flow
function askByVoice() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return out("Voice not supported on this device.");
  const rec = new SR();
  rec.lang = "en-US"; rec.continuous = false; rec.interimResults = false;
  rec.start();

  rec.onresult = async (e) => {
    const transcript = e.results[e.results.length - 1][0].transcript.trim();
    out(`You said: ${transcript}\nThinking…`);
    try {
      const reply = await askEcho(transcript);
      out(reply);
      speak(reply);
    } catch {
      out("Backend offline. Try again shortly.");
    }
  };
  rec.onerror = () => out("Voice recognition error. Try again.");
}

$("#voiceBtn").addEventListener("click", askByVoice);
$("#sendBtn").addEventListener("click", askByText);
