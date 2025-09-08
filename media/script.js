let TEXT_COLOR = "#000000";
let JOY_COLOR = "#308530";
let LOW_JOY_COLOR = "#baba41";
let CRITICAL_JOY_COLOR = "#c73e3e";
let BACKGROUND_COLOR = "#a7bbe1";
const JOY_DRAIN_RATE = 0.00001235;
const LEVEL_REQ_BASE = 300; // Seconds
const LEVEL_REQ_MULT = 1.5; // REQ * MULT every level

let canSendCriticalJoyMessage = true;

const vscode = acquireVsCodeApi();
function sendMessage(text) {
  vscode.postMessage({
    command: "showMessage",
    text,
  });
}
function requestConfig() {
  vscode.postMessage({
    command: "requestConfig",
    text: "",
  });
}
window.addEventListener("message", (event) => {
  const message = event.data;

  if (message.type === "config") {
    const s = message.settings;
    TEXT_COLOR = s.textColor;
    JOY_COLOR = s.joyColor;
    LOW_JOY_COLOR = s.lowJoyColor;
    CRITICAL_JOY_COLOR = s.criticalJoyColor;
    BACKGROUND_COLOR = s.backgroundColor;

    canvas.style.backgroundColor = BACKGROUND_COLOR;
  }

  if (message.type === "joy") {
    digi.joy += 0.001;
    if (digi.joy > 1) digi.joy = 1;
  }
});

const canvas = document.querySelector("#game");
canvas.style.backgroundColor = BACKGROUND_COLOR;
const digiImage = document.querySelector("#digiImage");
const heartImage = document.querySelector("#heartImage");
const animations = {
  HIDDEN: -1,
  NONE: 0,
  HOPPING: 1,
};
const DIGI_DEFAULT = {
  name: null,
  x: 64,
  y: 0,
  flip: 0,
  animation: animations.HIDDEN,
  targetX: 64,
  joy: 1,
  experience: 0,
};
let digi = { ...DIGI_DEFAULT };
let hearts = [];
const ctx = canvas.getContext("2d");
let frame = 0;

function closeTo(x, y, x2, y2, distance) {
  const dx = x2 - x;
  const dy = y2 - y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  return dist <= distance;
}

function drawDigi(ctx, digi, jumpHeight) {
  ctx.save();
  const size = getDigiSize();

  if (digi.flip === 1) {
    // Flip around the vertical axis
    ctx.translate(digi.x + size / 2, digi.y - jumpHeight); // move to sprite position
    ctx.scale(-1, 1); // flip horizontally
    ctx.drawImage(digiImage, 0, 0, size, size); // draw at origin
  } else {
    // Normal
    ctx.drawImage(
      digiImage,
      digi.x - size / 2,
      digi.y - jumpHeight,
      size,
      size
    );
  }

  ctx.restore();
}

function getDigiSize() {
  return 16 + (getLevel() - 1) * 2; // +1px per level
}

function getLevel() {
  let level = 1;
  let required = LEVEL_REQ_BASE;

  while (digi.experience >= required) {
    level++;
    required *= LEVEL_REQ_MULT;
  }

  return level;
}

// update canvas with some information and animation
const fps = new FpsCtrl(30, function (e) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (digi.animation == animations.HIDDEN) return;
  drawHearts(ctx);
  // vpet name and level
  ctx.font = "12px sans-serif";
  ctx.fillStyle = TEXT_COLOR;
  ctx.fillText(`${digi.name} (Lv. ${getLevel()})`, 10, 14);

  // vpet stats
  switch (true) {
    case digi.joy < 0.25:
      ctx.fillStyle = CRITICAL_JOY_COLOR;
      if (canSendCriticalJoyMessage) {
        canSendCriticalJoyMessage = false;
        sendMessage(`${digi.name} is very unhappy right now.`);
      }
      break;
    case digi.joy < 0.5:
      ctx.fillStyle = LOW_JOY_COLOR;
      if (canSendCriticalJoyMessage) {
        canSendCriticalJoyMessage = true;
      }
      break;
    default:
      ctx.fillStyle = JOY_COLOR;
      if (canSendCriticalJoyMessage) {
        canSendCriticalJoyMessage = true;
      }
  }

  ctx.fillRect(10, 20, (canvas.width - 20) * digi.joy, 10);
  digi.joy -= JOY_DRAIN_RATE;
  if (digi.joy <= 0) {
    gameOver();
    return;
  }

  // animation and movement
  digi.y = canvas.height - getDigiSize();
  switch (digi.animation) {
    case animations.NONE:
      drawDigi(ctx, digi, 0);
      break;
    case animations.HOPPING:
      const radians = frame * 1;
      const raw = Math.sin(radians);
      const wave = raw + 1;
      const jumpHeight = wave;
      drawDigi(ctx, digi, jumpHeight);
      break;
  }

  if (closeTo(digi.x, 0, digi.targetX, 0, 2)) {
    digi.animation = animations.NONE;
    if (Math.random() < 0.001 + 0.02 * digi.joy) {
      digi.targetX = (canvas.width - 64) * Math.random() + 32;
    }
  } else {
    digi.animation = animations.HOPPING;
    if (digi.x < digi.targetX) {
      digi.x++;
      digi.flip = 0;
    } else {
      digi.x--;
      digi.flip = 1;
    }
  }

  frame = (frame + 1) % 1200;
});

// start the loop
fps.start();

function FpsCtrl(fps, callback) {
  let delay = 1000 / fps,
    time = null,
    frame = -1,
    tref;

  function loop(timestamp) {
    if (time === null) time = timestamp;
    let seg = Math.floor((timestamp - time) / delay);
    if (seg > frame) {
      frame = seg;
      callback({
        time: timestamp,
        frame: frame,
      });
    }
    tref = requestAnimationFrame(loop);
  }

  this.isPlaying = false;

  this.frameRate = function (newfps) {
    if (!arguments.length) return fps;
    fps = newfps;
    delay = 1000 / fps;
    frame = -1;
    time = null;
  };

  this.start = function () {
    if (!this.isPlaying) {
      this.isPlaying = true;
      tref = requestAnimationFrame(loop);
    }
  };

  this.pause = function () {
    if (this.isPlaying) {
      cancelAnimationFrame(tref);
      this.isPlaying = false;
      time = null;
      frame = -1;
    }
  };
}

function save() {
  // Give bonus experience if Digi is very happy
  digi.joy > 0.8 ? (digi.experience += 3) : digi.experience++;

  localStorage.setItem("digi", JSON.stringify(digi));
}

function load() {
  try {
    digi = { ...digi, ...JSON.parse(localStorage.getItem("digi")) };
  } catch {
    // no save data
  }
}

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

function name() {
  if (!digi.name) {
    const d = document.createElement("dialog");
    d.innerHTML = `
                  <form method="dialog">
                    <div>Name your Digi:</div>
                    <input id="digiNameInput" autofocus required/>
                    <button>OK</button>
                  </form>
                `;
    d.addEventListener("close", () => {
      const name = d.querySelector("#digiNameInput").value.trim();
      if (name) {
        digi.name = name;
        digi.animation = 0;
        d.remove();
      }
    });
    document.body.appendChild(d);
    d.showModal();
  }
}

function gameOver() {
  sendMessage(`Your Digi, ${digi.name}, ran away.`);
  digi.animation = animations.HIDDEN;
  const d = document.createElement("dialog");
  d.innerHTML = `
                  <form method="dialog">
                    <div>Your Digi, ${
                      digi.name
                    }, ran away at level ${getLevel()}.</div>
                    <button>Get a new Digi</button>
                  </form>
                `;
  d.addEventListener("close", () => {
    digi = { ...DIGI_DEFAULT };
    resize();
    name();
    d.remove();
  });
  document.body.appendChild(d);
  d.showModal();
}

canvas.addEventListener("click", (e) => {
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  // Check if click is within digi’s 16x16 area
  if (
    closeTo(mouseX, mouseY, digi.x, digi.y + getDigiSize() / 2, getDigiSize())
  ) {
    // Gain joy
    digi.joy = Math.min(1, digi.joy + 0.1);

    // Add a heart
    hearts.push({
      x: digi.x,
      y: digi.y - 16,
      life: 60, // frames before disappearing
    });
  }
});

function drawHearts(ctx) {
  for (let i = 0; i < hearts.length; i++) {
    const h = hearts[i];

    ctx.save();
    ctx.globalAlpha = h.life / 60; // fade out over time
    ctx.fillStyle = "red";
    ctx.font = "16px sans-serif";
    ctx.drawImage(heartImage, h.x - 6, h.y);
    ctx.restore();

    // update position
    h.y -= 0.5;
    h.life--;
  }

  // remove expired hearts
  hearts = hearts.filter((h) => h.life > 0);
}

window.addEventListener("resize", resize);
setInterval(save, 1000);
resize();
load();
name();
requestConfig();
if (digi.joy <= 0) {
  gameOver();
}
