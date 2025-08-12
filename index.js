// ===== Echo Frontend (Vercel) — text in, spoken reply out (female voice) =====

const API_URL = "/api/ask";
const HEALTH_URL = "/api/health"; // optional

// ---------- DOM helpers ----------
const $  = (s) => document.querySelector(s);
const out = (t) => { const el = $("#ai-response"); if (el) el.textContent = t; };

// ---------- TTS: mobile-safe priming + female voice pick ----------
let ttsReady = false;

async function getVoicesOnce() {
  return new Promise((resolve) => {
    const v = speechSynthesis.getVoices();
    if (v.length) return resolve(v);
    speechSynthesis.onvoiceschanged = () => resolve(speechSynthesis.getVoices());
  });
}

async function primeTTS() {
  // iOS/Android need a user gesture before audio; call this on first Send tap
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (Ctx) { const ctx = new Ctx(); await ctx.resume().catch(() => {}); }
  } catch {}
  await getVoicesOnce();
  ttsReady = true;
}

function pickFemaleVoice(voices) {
  // Prefer common female voices on phones first, otherwise any English, else fallback
  const preferredNames = ["Samantha","Ava","Allison","Victoria","Eloquence","Google UK English Female","Google US English"];
  return (
    voices.find(v => preferredNames.includes(v.name)) ||
    voices.find(v => v.name?.toLowerCase().includes("female")) ||
    voices.find(v => v.lang?.toLowerCase().startsWith("en")) ||
    voices[0]
  );
}

async function speak(text) {
  if (!ttsReady || !text) return;        // must be primed by a user tap first
  try { speechSynthesis.cancel(); } catch {}
  const voices = await getVoicesOnce();
  const voice = pickFemaleVoice(voices);

  const u = new SpeechSynthesisUtterance(text);
  u.voice = voice;
  u.rate = 1;          // keep near 1 on mobile
  u.pitch = 1.05;
  u.volume = 1;

  setTimeout(() => speechSynthesis.speak(u), 0);  // nudge iOS to start
}

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
  } catch {
    clearTimeout(timer);
    throw new Error("Network error");
  }
  clearTimeout(timer);

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(txt || `Backend ${res.status}`);
  }

  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    const j = await res.json().catch(() => ({}));
    return j?.choices?.[0]?.message?.content || j?.answer || j?.text || "No response.";
  } else {
    return await res.text();
  }
}

// ---------- UI handlers ----------
async function handleSend() {
  const input = $("#text-input");
  const msg = (input?.value || "").trim();
  if (!msg) return;

  out("Thinking...");
  try {
    // first user tap primes audio so phones can speak
    if (!ttsReady) await primeTTS();

    const reply = await askEcho(msg);
    out(reply);
    speak(reply);            // will speak on phone after priming
  } catch (e) {
    out(`Backend offline. Try again shortly.\n${e.message || ""}`);
  }
}

$("#sendBtn")?.addEventListener("click", handleSend);
$("#text-input")?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") handleSend();
});

// Optional: warm backend so first call is faster
fetch(HEALTH_URL, { method: "GET", cache: "no-store" }).catch(() => {});
