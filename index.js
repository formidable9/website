// ===== Echo Frontend (Vercel backend) =====

// API endpoints on the same Vercel deployment
const API_URL = "/api/ask";
const HEALTH_URL = "/api/health";

// DOM helpers
const $ = (sel) => document.querySelector(sel);
const out = (t) => {
  const el = $("#ai-response");
  if (el) el.textContent = t;
};

// Welcome line
const welcomeLine =
  "What if our voices carried more than words? Welcome to Skybound Media's official website. Echo is listening.";

// Voice setup
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
  } catch (err) {
    console.error("Speech synthesis error:", err);
  }
}

// Fire welcome line after load + warm backend
window.addEventListener("load", async () => {
  setTimeout(() => speak(welcomeLine), 600);
  try {
    await fetch(HEALTH_URL, { cache: "no-store" });
  } catch {
    console.warn("Backend health check failed");
  }
});

// Call backend
async function askEcho(prompt) {
  if (!prompt || !prompt.trim()) return "Say something first 🙂";

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 30000);

  let res;
  try {
    res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
      signal: ctrl.signal,
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

// Text-based question
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

// Wire up Send button
$("#sendBtn")?.addEventListener("click", askByText);
