// ===== BACKEND ENDPOINTS (Vercel – LIVE) =====
// If Vercel changes your URL again, just update this one line.
const BASE_URL   = "https://website-git-main-skyboi-formidables-projects.vercel.app";
const API_URL    = `${BASE_URL}/api/ask`;
const HEALTH_URL = `${BASE_URL}/api/health`;

// ===== UTIL =====
const $   = (sel) => document.querySelector(sel);
const out = (t)    => { const el = $("#ai-response"); if (el) el.innerText = t; };

// Wake the functions so the first call isn’t slow
async function autoWake() {
  try { await fetch(HEALTH_URL, { cache: "no-store" }); } catch {}
}
window.addEventListener("load", autoWake);

// ===== Core call to your backend =====
async function askEcho(prompt) {
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 30000); // 30s guard

  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
    signal: ctrl.signal
  }).catch((e) => { throw new Error("Network error: " + (e?.message || "failed")); });

  clearTimeout(timeout);

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Backend ${res.status}: ${txt || "error"}`);
  }

  const data = await res.json().catch(() => ({}));
  return (
    data?.choices?.[0]?.message?.content ||
    data?.text ||
    data?.answer ||
    "No response."
  );
}

// ===== Voice flow =====
function startVoiceAI() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { out("Voice not supported on this device."); return; }

  const recognition = new SR();
  recognition.lang = "en-US";
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.start();

  recognition.onresult = async (e) => {
    const transcript = e.results[e.results.length - 1][0].transcript.trim();
    out(`You said: ${transcript}`);

    try {
      out("Thinking...");
      const reply = await askEcho(transcript);
      out(reply);
      speak(reply);
    } catch (err) {
      out("Backend offline. Try again shortly.");
    }
  };

  recognition.onerror = () => out("Voice recognition error. Try again.");
}

// ===== Text flow =====
async function sendText() {
  const inputEl = document.getElementById("text-input");
  const msg = (inputEl?.value || "").trim();
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

// ===== Simple TTS =====
function speak(text) {
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US"; u.rate = 1; u.pitch = 1.05;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  } catch {}
}

// ===== Wire up buttons =====
document.getElementById("voiceBtn")?.addEventListener("click", startVoiceAI);
document.getElementById("sendBtn")?.addEventListener("click", sendText);
