// ===== Echo Frontend (Vercel) =====

// API Endpoints
const API_URL = "/api/ask";
const HEALTH_URL = "/api/health";

// Helpers
const $ = (selector) => document.querySelector(selector);
const out = (text) => {
  const el = $("#ai-response");
  if (el) el.textContent = text;
};

// ---------- Welcome TTS ----------
const welcomeLine =
  "What if our voices carried more than words? Welcome to Skybound Media official website. Echo is listening.";

async function getVoicesOnce() {
  return new Promise((resolve) => {
    const voices = speechSynthesis.getVoices();
    if (voices.length) return resolve(voices);
    speechSynthesis.onvoiceschanged = () => resolve(speechSynthesis.getVoices());
  });
}

async function speak(text) {
  try {
    const voices = await getVoicesOnce();
    const voice =
      voices.find(
        (v) =>
          v.lang?.toLowerCase().includes("en") &&
          v.name?.toLowerCase().includes("female")
      ) || voices[0];
    const utter = new SpeechSynthesisUtterance(text);
    utter.voice = voice;
    utter.pitch = 1.05;
    utter.rate = 1;
    utter.volume = 1;
    speechSynthesis.cancel();
    speechSynthesis.speak(utter);
  } catch (err) {
    console.error("TTS error:", err);
  }
}

// On load → intro line + warm backend
window.addEventListener("load", async () => {
  setTimeout(() => speak(welcomeLine), 600);
  try {
    await fetch(HEALTH_URL, { cache: "no-store" });
  } catch {}
});

// ---------- Core backend call ----------
async function askEcho(prompt) {
  if (!prompt || !prompt.trim()) return "Say something first 🙂";

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 30000); // 30s timeout

  let res;
  try {
    res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
      signal: ctrl.signal,
    });
  } catch (err) {
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

// ---------- Text Input Flow ----------
async function askByText() {
  const input = $("#text-input");
  const msg = (input?.value || "").trim();
  if (!msg) return;

  out("Thinking...");
  try {
    const reply = await askEcho(msg);
    out(reply);
    speak(reply);
  } catch (err) {
    out("Backend offline. Try again shortly.");
  }
}

// ---------- Voice Input Flow ----------
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

  rec.onresult = async (event) => {
    const transcript =
      event.results[event.results.length - 1][0].transcript.trim();
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

// ---------- Event Listeners ----------
$("#sendBtn")?.addEventListener("click", askByText);
$("#voiceBtn")?.addEventListener("click", askByVoice);
