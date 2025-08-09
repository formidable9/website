// ------- BACKEND ENDPOINTS (Render - LIVE) -------
const API_URL    = "/api/ask";

// ------- UTIL -------
const $ = (sel) => document.querySelector(sel);
const out = (t) => ($("#ai-response").innerText = t);

// Wake the free Render instance so first call isn't slow
async function autoWake() { try { await fetch(HEALTH_URL, { cache: "no-store" }); } catch (_) {} }
window.addEventListener("load", autoWake);

// Core call to your backend
async function askEcho(prompt) {
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 30000); // 30s guard

  l
  
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
    signal: ctrl.signal
  }).catch((e) => { throw new Error("Network error: " + e.message); });

  clearTimeout(timeout);

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Backend ${res.status}: ${txt || "error"}`);
  }
  const data = await res.json();
  // Groq-style response: {choices:[{message:{content}}]}
  return data?.choices?.[0]?.message?.content || data?.message || "No response.";
}

// ------- TEXT INPUT FLOW -------
async function handleSend() {
  const btn = $("#sendBtn");
  const input = $("#text-input");
  const msg = (input.value || "").trim();
  if (!msg) return;

  btn.disabled = true; out("Thinking...");
  try {
    const reply = await askEcho(msg);
    out(reply);
  } catch (err) {
    out("Backend offline. Try again shortly.");
    console.error(err);
  } finally {
    btn.disabled = false;
  }
}

// ------- VOICE INPUT FLOW (optional) -------
function handleVoice() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { out("Voice input not supported on this device."); return; }

  const rec = new SR();
  rec.lang = "en-US"; rec.continuous = false; rec.interimResults = false; rec.start();

  rec.onresult = async (ev) => {
    const transcript = ev.results[ev.results.length - 1][0].transcript.trim();
    $("#text-input").value = transcript;
    out("Thinking...");
    try {
      const reply = await askEcho(transcript);
      out(reply);
      // speak back
      try {
        const u = new SpeechSynthesisUtterance(reply);
        u.rate = 1; u.pitch = 1.1; speechSynthesis.speak(u);
      } catch (_) {}
    } catch (err) {
      out("Backend offline. Try again shortly.");
      console.error(err);
    }
  };
  rec.onerror = () => out("Voice recognition error. Try again.");
}

// ------- HOOK UI -------
document.addEventListener("DOMContentLoaded", () => {
  $("#sendBtn")?.addEventListener("click", handleSend);
  $("#text-input")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") handleSend();
  });
  $("#voiceBtn")?.addEventListener("click", handleVoice);
});
