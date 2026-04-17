const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Voice
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

// Road setup
const roadWidth = canvas.width * 0.5;
const roadX = (canvas.width - roadWidth) / 2;
const laneWidth = roadWidth / 4;

// Player
let player = {
  lane: 1,
  width: 200,
  height: 220,
  y: canvas.height - 260
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

// Game variables
let speed = 7;
let roadOffset = 0;
let score = 0;
let highScore = localStorage.getItem("highScore") || 0;
let lastScoreTime = 0;

let traffic = [];
let spawnTimer = 0;

let shakeTime = 0;

// Convert lane to X
function getLaneX(lane) {
  return roadX + lane * laneWidth + (laneWidth - 200) / 2;
}

// Start
canvas.addEventListener("click", () => {
  if (gameState !== "playing") {
    resetGame();
    gameState = "playing";
    speak("Game Started");
  }
});

function resetGame() {
  player.lane = 1;
  traffic = [];
  speed = 7;
  score = 0;
  roadOffset = 0;
  lastScoreTime = Date.now();
}

// SPAWN (SAFE)
function spawnTraffic() {
  let lane = Math.floor(Math.random() * 4);

  // Check last car in same lane
  for (let t of traffic) {
    if (t.lane === lane && t.y < 400) {
      return; // skip spawn if too close
    }
  }

  let img = trafficImgs[Math.floor(Math.random() * trafficImgs.length)];

  traffic.push({
    lane: lane,
    y: -300,
    width: 200,
    height: 220,
    img: img
  });
}

// COLLISION (LANE BASED — VERY SAFE)
function checkCollision(playerLane, t) {
  if (playerLane !== t.lane) return false;

  // Only check vertical overlap
  return t.y + t.height > player.y + 40;
}

// UPDATE
function update() {
  if (gameState !== "playing") return;

  // Movement (lane based)
  if ((keys["a"] || keys["ArrowLeft"] || touchLeft) && player.lane > 0) {
    player.lane--;
    keys = {};
  }

  if ((keys["d"] || keys["ArrowRight"] || touchRight) && player.lane < 3) {
    player.lane++;
    keys = {};
  }

  speed += 0.002;
  roadOffset -= speed;

  // Score
  let now = Date.now();
  if (now - lastScoreTime > 500) {
    score++;
    lastScoreTime = now;
  }

  // Move traffic
  for (let t of traffic) {
    t.y += speed;

    if (checkCollision(player.lane, t)) {
      gameState = "gameover";
      speak("Game Over");
      shakeTime = 25;

      if (score > highScore) {
        highScore = score;
        localStorage.setItem("highScore", highScore);
      }
    }
  }

  traffic = traffic.filter(t => t.y < canvas.height + 200);

  // Spawn control
  spawnTimer++;
  if (spawnTimer > 60) {
    spawnTraffic();
    spawnTimer = 0;
  }
}

// DRAW ROAD
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

// DRAW GAME
function drawGame() {
  ctx.save();

  if (shakeTime > 0) {
    ctx.translate((Math.random() - 0.5) * 15, (Math.random() - 0.5) * 15);
    shakeTime--;
  }

  drawRoad();

  let playerX = getLaneX(player.lane);
  ctx.drawImage(carImg, playerX, player.y, 200, 220);

  for (let t of traffic) {
    let x = getLaneX(t.lane);
    ctx.drawImage(t.img, x, t.y, t.width, t.height);
  }

  ctx.fillStyle = "white";
  ctx.font = "28px Arial";
  ctx.fillText("Score: " + score, 20, 40);
  ctx.fillText("High: " + highScore, 20, 75);

  ctx.restore();
}

// UI
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

  if (gameState === "start") drawStart();
  else if (gameState === "playing") {
    update();
    drawGame();
  } else {
    drawGame();
    drawGameOver();
  }

  requestAnimationFrame(gameLoop);
}

gameLoop();
