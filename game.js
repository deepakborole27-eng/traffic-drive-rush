// Canvas
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

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
  y: canvas.height - 260
};

// Controls
let keys = {};
document.addEventListener("keydown", (e) => keys[e.key] = true);
document.addEventListener("keyup", (e) => keys[e.key] = false);

// Game state
let gameState = "start";

// Road + speed
let roadOffset = 0;
let speed = 10;

// Score
let score = 0;
let highScore = localStorage.getItem("highScore") || 0;
let lastScoreTime = 0;

// Lane rule
let laneTime = 0;
let gameOverReason = "";

// Traffic
let traffic = [];
let spawnCooldown = 25;

// Animation
let pulse = 0;
let startPulse = 0;

// Start / Restart
canvas.addEventListener("click", () => {
  if (gameState === "start" || gameState === "gameover") {
    resetGame();
    gameState = "playing";
  }
});

// Spawn traffic
function spawnTraffic() {
  const roadWidth = canvas.width * 0.5;
  const roadX = (canvas.width - roadWidth) / 2;
  const laneWidth = roadWidth / 4;

  const lane = Math.floor(Math.random() * 4);
  let x = roadX + lane * laneWidth + (laneWidth - 200) / 2;

  for (let t of traffic) {
    let tLane = Math.floor((t.x - roadX) / laneWidth);
    if (tLane === lane && t.y < 300) return;
  }

  let img = trafficImgs[Math.floor(Math.random() * trafficImgs.length)];

  traffic.push({
    x: x,
    y: -300,
    width: 200,
    height: 220,
    img: img
  });
}

// Collision
function checkCollision(a, b) {
  return (
    a.x + 60 < b.x + 140 &&
    a.x + 140 > b.x + 60 &&
    a.y + 40 < b.y + 200 &&
    a.y + 200 > b.y + 40
  );
}

// Save high score
function saveHighScore() {
  if (score > highScore) {
    highScore = score;
    localStorage.setItem("highScore", highScore);
  }
}

// Reset
function resetGame() {
  traffic = [];
  roadOffset = 0;
  spawnCooldown = 25;
  speed = 10;
  score = 0;
  laneTime = 0;
  lastScoreTime = Date.now();
  player.x = canvas.width / 2 - 100;
}

// Update
function update() {
  if (gameState !== "playing") return;

  if (keys["a"] || keys["ArrowLeft"]) player.x -= 8;
  if (keys["d"] || keys["ArrowRight"]) player.x += 8;

  const roadWidth = canvas.width * 0.5;
  const roadX = (canvas.width - roadWidth) / 2;
  const laneWidth = roadWidth / 4;

  player.x = Math.max(roadX, Math.min(roadX + roadWidth - 200, player.x));

  speed += 0.002;
  roadOffset -= speed;

  let now = Date.now();
  let interval = 500 - (speed * 15);
  interval = Math.max(200, interval);

  if (now - lastScoreTime >= interval) {
    score += 1;
    lastScoreTime = now;
  }

  let onLine = false;

  for (let i = 1; i < 4; i++) {
    let lineX = roadX + laneWidth * i;
    if (player.x + 100 > lineX - 10 && player.x + 100 < lineX + 10) {
      onLine = true;
    }
  }

  if (onLine) laneTime += 1 / 60;
  else laneTime = 0;

  if (laneTime > 10) {
    gameOverReason = "lane";
    saveHighScore();
    gameState = "gameover";
  }

  for (let t of traffic) {
    t.y += speed;
    if (checkCollision(player, t)) {
      gameOverReason = "crash";
      saveHighScore();
      gameState = "gameover";
    }
  }

  traffic = traffic.filter(t => t.y < canvas.height + 200);

  spawnCooldown--;
  if (spawnCooldown <= 0) {
    spawnTraffic();
    spawnCooldown = 20;
  }
}

// Draw road
function drawRoad() {
  const roadWidth = canvas.width * 0.5;
  const roadX = (canvas.width - roadWidth) / 2;

  ctx.fillStyle = "#2ecc71";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#555";
  ctx.fillRect(roadX, 0, roadWidth, canvas.height);

  ctx.strokeStyle = "white";
  ctx.lineWidth = 4;
  ctx.setLineDash([30, 30]);

  for (let i = 1; i < 4; i++) {
    const laneX = roadX + (roadWidth / 4) * i;

    ctx.beginPath();
    ctx.moveTo(laneX, -(roadOffset % 60));
    ctx.lineTo(laneX, canvas.height);
    ctx.stroke();
  }

  ctx.setLineDash([]);
}

// Draw player
function drawPlayer() {
  ctx.drawImage(carImg, player.x, player.y, 200, 220);
}

// Draw traffic
function drawTraffic() {
  for (let t of traffic) {
    ctx.drawImage(t.img, t.x, t.y, t.width, t.height);
  }
}

// Draw score
function drawScore() {
  ctx.fillStyle = "white";
  ctx.font = "28px Arial";
  ctx.fillText("Score: " + score, 20, 40);
  ctx.fillText("High: " + highScore, 20, 75);
}

// 🔥 REALISTIC START SCREEN
function drawStartScreen() {
  startPulse += 0.05;
  let scale = 1 + Math.sin(startPulse) * 0.03;

  drawRoad();
  drawPlayer();

  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.textAlign = "center";

  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2 - 150);
  ctx.scale(scale, scale);

  ctx.shadowColor = "yellow";
  ctx.shadowBlur = 20;

  ctx.fillStyle = "white";
  ctx.font = "60px Arial";
  ctx.fillText("TRAFFIC DRIVE", 0, 0);

  ctx.fillStyle = "yellow";
  ctx.font = "70px Arial";
  ctx.fillText("RUSH", 0, 70);

  ctx.restore();

  ctx.shadowBlur = 0;

  ctx.fillStyle = "white";
  ctx.font = "24px Arial";
  ctx.fillText("Beat the traffic. Stay in your lane.", canvas.width / 2, canvas.height / 2 - 20);

  ctx.fillStyle = "yellow";
  ctx.fillRect(canvas.width / 2 - 150, canvas.height / 2 + 20, 300, 70);

  ctx.fillStyle = "black";
  ctx.font = "30px Arial";
  ctx.fillText("START GAME", canvas.width / 2, canvas.height / 2 + 65);

  ctx.fillStyle = "#222";
  ctx.fillRect(canvas.width / 2 - 150, canvas.height / 2 + 110, 300, 80);

  ctx.strokeStyle = "white";
  ctx.strokeRect(canvas.width / 2 - 150, canvas.height / 2 + 110, 300, 80);

  ctx.fillStyle = "white";
  ctx.font = "26px Arial";
  ctx.fillText("HIGH SCORE", canvas.width / 2, canvas.height / 2 + 140);

  ctx.fillStyle = "yellow";
  ctx.font = "30px Arial";
  ctx.fillText(highScore, canvas.width / 2, canvas.height / 2 + 175);
}

// 💥 GAME OVER
function drawGameOverScreen() {
  pulse += 0.05;
  let scale = 1 + Math.sin(pulse) * 0.05;

  ctx.fillStyle = "rgba(0,0,0,0.8)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.textAlign = "center";

  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2 - 120);
  ctx.scale(scale, scale);

  ctx.shadowColor = "red";
  ctx.shadowBlur = 20;

  ctx.fillStyle = "red";
  ctx.font = "70px Arial";
  ctx.fillText("GAME OVER", 0, 0);

  ctx.restore();

  ctx.shadowBlur = 0;

  ctx.font = "28px Arial";

  if (gameOverReason === "lane") {
    ctx.fillStyle = "yellow";
    ctx.fillText("⚠ Stay in your lane!", canvas.width / 2, canvas.height / 2 - 40);
  } else {
    ctx.fillStyle = "orange";
    ctx.fillText("💥 You crashed!", canvas.width / 2, canvas.height / 2 - 40);
  }

  ctx.fillStyle = "#222";
  ctx.fillRect(canvas.width / 2 - 180, canvas.height / 2 - 10, 360, 120);

  ctx.strokeStyle = "white";
  ctx.strokeRect(canvas.width / 2 - 180, canvas.height / 2 - 10, 360, 120);

  ctx.fillStyle = "white";
  ctx.font = "30px Arial";
  ctx.fillText("Score: " + score, canvas.width / 2, canvas.height / 2 + 30);
  ctx.fillText("High Score: " + highScore, canvas.width / 2, canvas.height / 2 + 70);

  ctx.fillStyle = "yellow";
  ctx.fillRect(canvas.width / 2 - 150, canvas.height / 2 + 110, 300, 60);

  ctx.fillStyle = "black";
  ctx.font = "30px Arial";
  ctx.fillText("RESTART", canvas.width / 2, canvas.height / 2 + 150);
}

// Loop
function gameLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (gameState === "start") {
    drawStartScreen();
  } else if (gameState === "playing") {
    update();
    drawRoad();
    drawPlayer();
    drawTraffic();
    drawScore();
  } else {
    drawRoad();
    drawPlayer();
    drawTraffic();
    drawScore();
    drawGameOverScreen();
  }

  requestAnimationFrame(gameLoop);
}

gameLoop();