// ===== Echo frontend (Vercel) =====

// Endpoints (same domain on Vercel)
const API_URL = "/api/ask";
const HEALTH_URL = "/api/health";

// Helpers
const $ = (sel) => document.querySelector(sel);
const out = (t) => {
  const el = $("#ai-response");
  if (el) el.textContent = t;
};

// ---------- Welcome TTS ----------
const welcomeLine =
  "what if our voices are more than word. Welcome to skyboundmedia official website. i am Echo your a.i assistant and am listening.";
async function getVoicesOnce() {
  return new Promise((resolve) => {
    const v = speechSynthesis.getVoices();
    if (v.length) return resolve(v);
    speechSynthesis.onvoiceschanged = () =>
      resolve(speechSynthesis.getVoices());
  });
}
async function speak(text) {
  try {
    const voices = await getVoicesOnce();
    const voice =
      voices.find(
        (v) => v.lang?.includes("en") && v.name?.toLowerCase().includes("female")
      ) || voices[0];
    const u = new SpeechSynthesisUtterance(text);
    u.voice = voice;
    u.pitch = 1.05;
    u.rate = 1;
    u.volume = 1;
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  } catch {}
}
window.addEventListener("load", async () => {
  // Say the welcome line shortly after load
  setTimeout(() => speak(welcomeLine), 600);
  // Warm up backend so first call isn't slow
  try {
    await fetch(HEALTH_URL, { cache: "no-store" });
  } catch {}
});

// ---------- Core call to backend ----------
async function askEcho(prompt) {
  if (!prompt || !prompt.trim()) return "Say something first 🙂";

  // 30s timeout guard
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 30000);

  let res;
  try {
    res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
      signal: ctrl.signal
    });
  } catch (e) {
    clearTimeout(timer);
    throw new Error("Network error, try again.");
  }

  clearTimeout(timer);

  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(`Backend ${res.status}: ${msg || "error"}`);
  }

  const data = await res.json().catch(() => ({}));
  return (
    data?.choices?.[0]?.message?.content ||
    data?.text ||
    data?.answer ||
    "No response."
  );
}

// ---------- Text flow ----------
async function askByText() {
  const input = $("#text-input");
  const msg = (input?.value || "").trim();
  if (!msg) return;

  out("Thinking...");
  try {
    const reply = await askEcho(msg);
    out(reply);
    speak(reply);
  } catch (e) {
    out("Backend offline. Try again shortly.");
  }
}

// ---------- Voice flow ----------
function askByVoice() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    out("Voice not supported on this device.");
    return;
  }

  const rec = new SR();
  rec.lang = "en-US";
  rec.continuous = false;
  rec.interimResults = false;
  rec.start();

  rec.onresult = async (e) => {
    const transcript = e.results[e.results.length - 1][0].transcript.trim();
    out(`You said: ${transcript}\nThinking...`);
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

// Wire up buttons
$("#sendBtn")?.addEventListener("click", askByText);
$("#voiceBtn")?.addEventListener("click", askByVoice);
