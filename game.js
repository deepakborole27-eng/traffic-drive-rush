const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// DEVICE DETECTION
let isMobile = window.innerWidth < 768;

// ================== RESPONSIVE ==================
let roadWidth, roadX, laneWidth;
let carWidth, carHeight;

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  isMobile = window.innerWidth < 768;

  // 🔥 DIFFERENT ROAD WIDTH
  roadWidth = isMobile ? canvas.width * 0.7 : canvas.width * 0.5;

  roadX = (canvas.width - roadWidth) / 2;
  laneWidth = roadWidth / 4;

  carWidth = laneWidth * 0.6;
  carHeight = carWidth * 1.2;

  player.y = canvas.height - carHeight - 20;
}
window.addEventListener("resize", resizeCanvas);

// VOICE
function speak(text) {
  const msg = new SpeechSynthesisUtterance(text);
  msg.rate = 0.85;
  msg.pitch = 0.5;
  speechSynthesis.speak(msg);
}

// IMAGES
const carImg = new Image();
carImg.src = "car.png";

const trafficImgs = [];
for (let i = 1; i <= 5; i++) {
  let img = new Image();
  img.src = "car" + i + ".png";
  trafficImgs.push(img);
}

// PLAYER
let player = {
  x: 0,
  y: 0,
  targetX: 0
};

// GAME
let gameState = "start";
let speed = 6;
let roadOffset = 0;

let score = 0;
let highScore = localStorage.getItem("highScore") || 0;
let lastScoreTime = 0;

let traffic = [];
let spawnTimer = 0;

let shakeTime = 0;

// ================== CONTROLS ==================

// PC (A / D)
let moveLeft = false;
let moveRight = false;

document.addEventListener("keydown", e => {
  if (e.key === "a") moveLeft = true;
  if (e.key === "d") moveRight = true;
});

document.addEventListener("keyup", e => {
  if (e.key === "a") moveLeft = false;
  if (e.key === "d") moveRight = false;
});

// MOBILE DRAG (NO BUTTONS)
let isTouching = false;

canvas.addEventListener("touchstart", () => {
  isTouching = true;
});

canvas.addEventListener("touchmove", e => {
  if (!isTouching) return;
  let touch = e.touches[0];
  player.targetX = touch.clientX - carWidth / 2;
});

canvas.addEventListener("touchend", () => {
  isTouching = false;
});

// START
canvas.addEventListener("click", () => {
  if (gameState !== "playing") {
    resetGame();
    gameState = "playing";
    speak("Game Started");
  }
});

// RESET
function resetGame() {
  player.x = roadX + roadWidth / 2 - carWidth / 2;
  player.targetX = player.x;

  traffic = [];
  speed = 6;
  score = 0;
  roadOffset = 0;
  lastScoreTime = Date.now();
}

// SPAWN
function spawnTraffic() {
  const lane = Math.floor(Math.random() * 4);
  const x = roadX + lane * laneWidth + (laneWidth - carWidth) / 2;

  for (let t of traffic) {
    if (Math.abs(t.y - (-200)) < 400 && Math.abs(t.x - x) < laneWidth) {
      return;
    }
  }

  let img = trafficImgs[Math.floor(Math.random() * trafficImgs.length)];

  traffic.push({
    x,
    y: -carHeight - 100,
    width: carWidth,
    height: carHeight,
    img
  });
}

// COLLISION
function checkCollision(a, b) {
  return (
    a.x + carWidth * 0.25 < b.x + b.width * 0.75 &&
    a.x + carWidth * 0.75 > b.x + b.width * 0.25 &&
    a.y + carHeight * 0.3 < b.y + b.height * 0.8 &&
    a.y + carHeight * 0.8 > b.y + b.height * 0.3
  );
}

// MID LANE RULE
let midLaneTime = 0;

function isBetweenLanes() {
  let laneIndex = (player.x - roadX) / laneWidth;
  return Math.abs(laneIndex - Math.round(laneIndex)) > 0.2;
}

// UPDATE
function update() {
  if (gameState !== "playing") return;

  // PC movement
  if (moveLeft) player.targetX -= 8;
  if (moveRight) player.targetX += 8;

  // smooth move
  player.x += (player.targetX - player.x) * 0.2;

  // clamp
  player.x = Math.max(roadX, Math.min(roadX + roadWidth - carWidth, player.x));

  speed += 0.002;
  roadOffset -= speed;

  // score
  let now = Date.now();
  if (now - lastScoreTime > 500) {
    score++;
    lastScoreTime = now;
  }

  // mid lane rule
  if (isBetweenLanes()) {
    midLaneTime += 1 / 60;
    if (midLaneTime > 10) {
      gameState = "gameover";
      speak("Stay in your lane");
    }
  } else {
    midLaneTime = 0;
  }

  // traffic
  for (let t of traffic) {
    t.y += speed;

    if (checkCollision(player, t)) {
      gameState = "gameover";
      speak("Game Over");
      shakeTime = 20;

      if (score > highScore) {
        highScore = score;
        localStorage.setItem("highScore", highScore);
      }
    }
  }

  traffic = traffic.filter(t => t.y < canvas.height + 200);

  // 🔥 MOBILE MORE TRAFFIC ONLY
  spawnTimer++;

  let spawnLimit = isMobile ? 40 : 70;

  if (spawnTimer > spawnLimit) {
    spawnTraffic();

    if (isMobile && Math.random() < 0.5) {
      spawnTraffic();
    }

    spawnTimer = 0;
  }
}

// DRAW
function drawRoad() {
  ctx.fillStyle = "green";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#555";
  ctx.fillRect(roadX, 0, roadWidth, canvas.height);

  ctx.strokeStyle = "white";
  ctx.setLineDash([30, 30]);

  for (let i = 1; i < 4; i++) {
    let x = roadX + laneWidth * i;
    ctx.beginPath();
    ctx.moveTo(x, -(roadOffset % 60));
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }

  ctx.setLineDash([]);
}

function drawGame() {
  ctx.save();

  if (shakeTime > 0) {
    ctx.translate((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10);
    shakeTime--;
  }

  drawRoad();

  ctx.drawImage(carImg, player.x, player.y, carWidth, carHeight);

  for (let t of traffic) {
    ctx.drawImage(t.img, t.x, t.y, t.width, t.height);
  }

  ctx.fillStyle = "white";
  ctx.font = "24px Arial";
  ctx.fillText("Score: " + score, 20, 40);
  ctx.fillText("High: " + highScore, 20, 70);

  ctx.restore();
}

function
