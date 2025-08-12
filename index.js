// ===== Echo frontend (Vercel) =====

// Endpoints (same domain on Vercel)
const API_URL  = "/api/ask";
const HEALTH_URL = "/api/health";

// Helpers
const $ = (sel) => document.querySelector(sel);
const out = (t) => { const el = $("#ai-response"); if (el) el.textContent = t; };

// ---------- Welcome TTS ----------
const welcomeLine =
  "What if our voices carried more than words? Welcome to Skybound Media official website. Echo is listening.";

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
    const voice =
      voices.find(v => v.lang?.toLowerCase().includes("en") && v.name?.toLowerCase().includes("female")) ||
      voices[0];
    const u = new SpeechSynthesisUtterance(text);
    u.voice = voice; u.pitch = 1.05; u.rate = 1; u.volume = 1;
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  } catch {}
}

window.addEventListener("load", async () => {
  setTimeout(() => speak(welcomeLine), 600);
  try { await fetch(HEALTH_URL, { cache: "no-store" }); } catch {}
});

// ---------- Backend call ----------
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
  if (!SR) { out("Voice not supported on this device."); return; }

  const rec = new SR();
  rec.lang = "en-US"; rec.continuous = false; rec.interimResults = false;
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

// Wire up
$("#sendBtn")?.addEventListener("click", askByText);
$("#voiceBtn")?.addEventListener("click", askByVoice);

// ---------- HERO rotation (cross-fade) ----------
const slides = ["bg1.jpg","bg2.jpg","bg3.jpg","bg4.jpg","bg5.jpg","bg6.jpg","bg7.jpg"]; // lowercase
const heroA = document.querySelector(".hero-a");
const heroB = document.querySelector(".hero-b");
const layers = [heroA, heroB];

// Preload to avoid flicker
slides.forEach(src => { const im = new Image(); im.src = src; });

let i = 0;      // next slide index
let active = 0; // visible layer: 0/1

function showInitial() {
  if (!heroA || !heroB) return;
  heroA.style.backgroundImage = `url(${slides[0]})`;
  heroA.classList.add("show");
  i = 1;
}
function crossfade() {
  if (!heroA || !heroB) return;
  const show = layers[active ^ 1];
  const hide = layers[active];

  show.style.backgroundImage = `url(${slides[i]})`;
  requestAnimationFrame(() => {
    show.classList.add("show");
    hide.classList.remove("show");
  });

  active ^= 1;
  i = (i + 1) % slides.length;
}

showInitial();
setInterval(crossfade, 6000);
