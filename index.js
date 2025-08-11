// ===== Frontend (runs in browser) =====

// Our backend lives on the same domain in Vercel:
const API_URL = "/api/ask";   // <— DO NOT change this

const $ = (sel) => document.querySelector(sel);
const statusEl = $("#status");
const answerEl = $("#answer");
const inputEl  = $("#prompt");
const sendBtn  = $("#send");

// Quick warm-up on page load so free cold starts feel faster
window.addEventListener("load", () => {
  // Fire and forget; if it fails, we just stay quiet
  fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: "ping" })
  }).catch(() => {});
});

sendBtn.addEventListener("click", askEcho);
inputEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter") askEcho();
});

async function askEcho() {
  const text = inputEl.value.trim();
  if (!text) {
    inputEl.focus();
    return;
  }

  // UI state
  sendBtn.disabled = true;
  statusEl.textContent = "Thinking…";
  answerEl.textContent = "";

  // Timeout guard so we never hang forever
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 30000); // 30s

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: text }),
      signal: ctrl.signal
    });

    clearTimeout(timeout);

    if (!res.ok) {
      // Read any text error from server for easier debugging
      const msg = await res.text().catch(() => "");
      throw new Error(`Backend error (${res.status}). ${msg}`);
    }

    const data = await res.json();
    const reply = data?.text || "No response.";
    answerEl.textContent = reply;
    statusEl.textContent = "OK";
  } catch (err) {
    const offline = (err && (err.name === "AbortError")) ? "timeout" : "network";
    statusEl.textContent = offline === "timeout"
      ? "Backend timeout. Try again."
      : "Backend offline. Try again shortly.";
    answerEl.textContent = (err && err.message) ? err.message : "";
  } finally {
    sendBtn.disabled = false;
  }
}
