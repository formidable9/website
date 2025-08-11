// --------------- Hero rotation (cross-fade) ---------------
const slides = ["bg1.jpg","bg2.jpg","bg3.jpg","bg4.jpg","bg5.jpg","bg6.jpg","bg7.jpg"]; // lowercase
const heroA = document.querySelector(".hero-a");
const heroB = document.querySelector(".hero-b");
const layers = [heroA, heroB];

// preload all images (prevents the “random” flicker you saw)
slides.forEach(src => { const im = new Image(); im.src = src; });

let i = 0;         // which slide to show next
let active = 0;    // which layer is currently visible (0 or 1)

function showInitial(){
  if (!heroA || !heroB) return;
  heroA.style.backgroundImage = `url(${slides[0]})`;
  heroA.classList.add("show");
  i = 1;
}
function crossfade(){
  if (!heroA || !heroB) return;
  const show = layers[active ^ 1];   // the hidden layer
  const hide = layers[active];       // the visible layer

  show.style.backgroundImage = `url(${slides[i]})`;
  // fade in the new layer, fade out the old
  requestAnimationFrame(() => {
    show.classList.add("show");
    hide.classList.remove("show");
  });

  active ^= 1;               // toggle 0 <-> 1
  i = (i + 1) % slides.length; // next slide index (sequential, not random)
}

showInitial();
setInterval(crossfade, 6000); // change every 6s
