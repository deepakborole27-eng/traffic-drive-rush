const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// 🔊 SOUND
const engineSound = new Audio("engine.mp3");
engineSound.loop = true;
engineSound.volume = 0.5;

// 🤖 VOICE
function speak(text) {
  const msg = new SpeechSynthesisUtterance(text);
  msg.rate = 0.8;
  msg.pitch = 0.4;
  speechSynthesis.speak(msg);
}

// Images
const carImg = new Image();
carImg.src = "car.png";

const trafficImgs = [];
for (let i = 1; i <= 5; i++) {
  let img = new Image();
  img.src = "car" + i + ".png";
  trafficImgs.push(img);
}

// Player
let player = {
  x: canvas.width / 2 - 100,
  y: canvas.height - 260,
  width: 200,
  height: 220
};

// Controls
let keys = {};
document.addEventListener("keydown", e => keys[e.key] = true);
document.addEventListener("keyup", e => keys[e.key] = false);

// Mobile
let touchLeft = false;
let touchRight = false;

document.getElementById("leftBtn").addEventListener("touchstart", () => touchLeft = true);
document.getElementById("leftBtn").addEventListener("touchend", () => touchLeft = false);

document.getElementById("rightBtn").addEventListener("touchstart", () => touchRight = true);
document.getElementById("rightBtn").addEventListener("touchend", () => touchRight = false);

// Game state
let gameState = "start";

// Road
let roadOffset = 0;
let speed = 9;

// Score
let score = 0;
let highScore = localStorage.getItem("highScore") || 0;
let lastScoreTime = 0;

// Traffic
let traffic = [];
let spawnCooldown = 30;

// Shake
let shakeTime = 0;

// START
canvas.addEventListener("click", () => {
  if (gameState !== "playing") {
    resetGame();
    gameState = "playing";

    speak("Game Started");
    engineSound.currentTime = 0;
    engineSound.play().catch(() => {});
  }
});

function resetGame() {
  player.x = canvas.width / 2 - 100;
  traffic = [];
  score = 0;
  speed = 9;
  roadOffset = 0;
  lastScoreTime = Date.now();
}

// SAFE SPAWN
function spawnTraffic() {
  const roadWidth = canvas.width * 0.5;
  const roadX = (canvas.width - roadWidth) / 2;
  const laneWidth = roadWidth / 4;

  const lane = Math.floor(Math.random() * 4);
  let x = roadX + lane * laneWidth + (laneWidth - 200) / 2;

  // prevent unfair spawn near player
  for (let t of traffic) {
    if (Math.abs(t.y - (-250)) < 300 && Math.abs(t.x - x) < 120) {
      return;
    }
  }

  let img = trafficImgs[Math.floor(Math.random() * trafficImgs.length)];

  traffic.push({ x, y: -250, width: 200, height: 220, img });
}

// BETTER COLLISION
function checkCollision(a, b) {
  return (
    a.x + 40 < b.x + b.width - 40 &&
    a.x + a.width - 40 > b.x + 40 &&
    a.y + 40 < b.y + b.height - 40 &&
    a.y + a.height - 40 > b.y + 40
  );
}

// UPDATE
function update() {
  if (gameState !== "playing") return;

  if (keys["a"] || keys["ArrowLeft"] || touchLeft) player.x -= 7;
  if (keys["d"] || keys["ArrowRight"] || touchRight) player.x += 7;

  const roadWidth = canvas.width * 0.5;
  const roadX = (canvas.width - roadWidth) / 2;

  player.x = Math.max(roadX, Math.min(roadX + roadWidth - player.width, player.x));

  speed += 0.002;
  roadOffset -= speed;

  // score
  let now = Date.now();
  if (now - lastScoreTime > 500) {
    score++;
    lastScoreTime = now;
  }

  // traffic
  for (let t of traffic) {
    t.y += speed;

    if (checkCollision(player, t)) {
      speak("Game Over");
      gameState = "gameover";
      engineSound.pause();
      shakeTime = 25;

      if (score > highScore) {
        highScore = score;
        localStorage.setItem("highScore", highScore);
      }
    }
  }

  traffic = traffic.filter(t => t.y < canvas.height + 200);

  spawnCooldown--;
  if (spawnCooldown <= 0) {
    spawnTraffic();
    spawnCooldown = 25;
  }
}

// DRAW ROAD
function drawRoad() {
  const roadWidth = canvas.width * 0.5;
  const roadX = (canvas.width - roadWidth) / 2;

  ctx.fillStyle = "green";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#555";
  ctx.fillRect(roadX, 0, roadWidth, canvas.height);

  ctx.strokeStyle = "white";
  ctx.setLineDash([30, 30]);

  for (let i = 1; i < 4; i++) {
    let x = roadX + (roadWidth / 4) * i;
    ctx.beginPath();
    ctx.moveTo(x, -(roadOffset % 60));
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }

  ctx.setLineDash([]);
}

// DRAW GAME
function drawGame() {
  ctx.save();

  if (shakeTime > 0) {
    let dx = (Math.random() - 0.5) * 15;
    let dy = (Math.random() - 0.5) * 15;
    ctx.translate(dx, dy);
    shakeTime--;
  }

  drawRoad();

  ctx.drawImage(carImg, player.x, player.y, player.width, player.height);

  for (let t of traffic) {
    ctx.drawImage(t.img, t.x, t.y, t.width, t.height);
  }

  ctx.fillStyle = "white";
  ctx.font = "28px Arial";
  ctx.fillText("Score: " + score, 20, 40);
  ctx.fillText("High: " + highScore, 20, 75);

  ctx.restore();
}

// START SCREEN
function drawStart() {
  drawRoad();

  ctx.fillStyle = "rgba(0,0,0,0.7)";
  ctx.fillRect(0,0,canvas.width,canvas.height);

  ctx.fillStyle = "white";
  ctx.font = "50px Arial";
  ctx.textAlign = "center";
  ctx.fillText("TRAFFIC DRIVE RUSH", canvas.width/2, canvas.height/2);

  ctx.font = "25px Arial";
  ctx.fillText("Tap to Start", canvas.width/2, canvas.height/2 + 60);
}

// GAME OVER
function drawGameOver() {
  ctx.fillStyle = "rgba(0,0,0,0.8)";
  ctx.fillRect(0,0,canvas.width,canvas.height);

  ctx.fillStyle = "red";
  ctx.font = "60px Arial";
  ctx.textAlign = "center";
  ctx.fillText("GAME OVER", canvas.width/2, canvas.height/2 - 50);

  ctx.fillStyle = "white";
  ctx.font = "30px Arial";
  ctx.fillText("Score: " + score, canvas.width/2, canvas.height/2);
  ctx.fillText("Tap to Restart", canvas.width/2, canvas.height/2 + 60);
}

// LOOP
function gameLoop() {
  ctx.clearRect(0,0,canvas.width,canvas.height);

  if (gameState === "start") {
    drawStart();
  } else if (gameState === "playing") {
    update();
    drawGame();
  } else {
    drawGame();
    drawGameOver();
  }

  requestAnimationFrame(gameLoop);
}

gameLoop();
