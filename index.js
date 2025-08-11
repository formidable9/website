// ===== Echo frontend (Vercel) =====
const API_URL   = "/api/ask";
const HEALTH_URL= "/api/health";

// Hero background rotation (bg1.jpg ... bg7.jpg)
const bgImages = ["bg1.jpg","bg2.jpg","bg3.jpg","bg4.jpg","bg5.jpg","bg6.jpg","bg7.jpg"];
function startHeroRotation(){
  const hero = document.getElementById("hero");
  if (!hero) return;
  let i = 0;
  const set = () => {
    hero.style.backgroundImage = `url('${bgImages[i]}')`;
    i = (i + 1) % bgImages.length;
  };
  set();
  setInterval(set, 6000);
}

// Helpers
const $   = (sel) => document.querySelector(sel);
const out = (t, kind="ok") => {
  const el = $("#ai-response");
  if(!el) return;
  el.classList.remove("ok","err");
  el.classList.add(kind);
  el.textContent = t;
};

// Welcome line
const welcomeLine = "What if our voices carried more than words? welcome to skyboundmedia official website, i am echo and am listening";

// Speech
async function getVoicesOnce(){
  return new Promise((resolve)=>{
    const v = speechSynthesis.getVoices();
    if (v.length) return resolve(v);
    speechSynthesis.onvoiceschanged = () => resolve(speechSynthesis.getVoices());
  });
}
async function speak(text){
  try{
    const voices = await getVoicesOnce();
    const voice = voices.find(v => v.lang?.includes("en")) || voices[0];
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.voice = voice; u.pitch = 1.05; u.rate = 1.0;
    speechSynthesis.speak(u);
  }catch{}
}

// API
async function askEcho(message){
  const r = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message })
  });
  if(!r.ok) throw new Error(await r.text());
  const data = await r.json();
  return data.reply ?? String(data);
}

// Actions
async function askByText(){
  const msg = $("#text-input")?.value?.trim();
  if(!msg) return;
  out("Thinking...");
  try{
    const reply = await askEcho(msg);
    out(reply,"ok");
    speak(reply);
  }catch(e){
    out("Backend offline. Try again shortly.","err");
  }
}

function askByVoice(){
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SR){ out("Voice not supported on this browser.","err"); return; }
  const rec = new SR();
  rec.lang = "en-US"; rec.continuous = false;
  rec.onresult = async (e) => {
    const transcript = e.results[e.results.length-1][0].transcript;
    out(`You said: ${transcript}\nThinking...`);
    try{
      const reply = await askEcho(transcript);
      out(reply,"ok"); speak(reply);
    }catch{ out("Backend offline. Try again shortly.","err"); }
  };
  rec.onerror = () => out("Voice recognition error.","err");
  rec.start();
}

// Wire up
document.addEventListener("DOMContentLoaded", async () => {
  $("#sendBtn")?.addEventListener("click", askByText);
  $("#voiceBtn")?.addEventListener("click", askByVoice);

  // health ping (non-blocking)
  try{ await fetch(HEALTH_URL, {cache:"no-store"}); }catch{}

  out(welcomeLine,"ok"); speak(welcomeLine);
  startHeroRotation();
});
