const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// 🔊 VOICE FUNCTION
function speak(text) {
  const msg = new SpeechSynthesisUtterance(text);
  msg.rate = 0.8;
  msg.pitch = 0.4;
  msg.lang = "en-US";

  const voices = speechSynthesis.getVoices();
  const robotVoice = voices.find(v =>
    v.name.includes("Google") || v.name.includes("Microsoft")
  );

  if (robotVoice) msg.voice = robotVoice;

  speechSynthesis.speak(msg);
}

// Fix for loading voices
window.speechSynthesis.onvoiceschanged = () => {};

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
document.addEventListener("keydown", e => keys[e.key] = true);
document.addEventListener("keyup", e => keys[e.key] = false);

// Mobile controls
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
let speed = 10;

// Score
let score = 0;
let highScore = localStorage.getItem("highScore") || 0;
let lastScoreTime = 0;

// Traffic
let traffic = [];
let spawnCooldown = 20;

// START / RESTART
canvas.addEventListener("click", () => {
  if (gameState !== "playing") {
    resetGame();
    gameState = "playing";
    speak("Game Started");
  }
});

function resetGame() {
  player.x = canvas.width / 2 - 100;
  traffic = [];
  score = 0;
  speed = 10;
  roadOffset = 0;
  lastScoreTime = Date.now();
}

// Spawn traffic
function spawnTraffic() {
  const roadWidth = canvas.width * 0.5;
  const roadX = (canvas.width - roadWidth) / 2;
  const laneWidth = roadWidth / 4;

  const lane = Math.floor(Math.random() * 4);
  let x = roadX + lane * laneWidth + (laneWidth - 200) / 2;

  let img = trafficImgs[Math.floor(Math.random() * trafficImgs.length)];

  traffic.push({ x, y: -250, width: 200, height: 220, img });
}

// Collision
function checkCollision(a, b) {
  return (
    a.x < b.x + b.width - 40 &&
    a.x + 200 > b.x + 40 &&
    a.y < b.y + b.height - 40 &&
    a.y + 200 > b.y + 40
  );
}

// Update
function update() {
  if (gameState !== "playing") return;

  // Movement
  if (keys["a"] || keys["ArrowLeft"] || touchLeft) player.x -= 8;
  if (keys["d"] || keys["ArrowRight"] || touchRight) player.x += 8;

  const roadWidth = canvas.width * 0.5;
  const roadX = (canvas.width - roadWidth) / 2;

  player.x = Math.max(roadX, Math.min(roadX + roadWidth - 200, player.x));

  // Speed increase
  speed += 0.003;
  roadOffset -= speed;

  // Score system (1 point every 0.5 sec, faster with speed)
  let now = Date.now();
  let interval = 500 - speed * 10;
  if (interval < 200) interval = 200;

  if (now - lastScoreTime > interval) {
    score++;
    lastScoreTime = now;
  }

  // Traffic movement
  for (let t of traffic) {
    t.y += speed;

    if (checkCollision(player, t)) {
      speak("Game Over");
      gameState = "gameover";

      if (score > highScore) {
        highScore = score;
        localStorage.setItem("highScore", highScore);
      }
    }
  }

  traffic = traffic.filter(t => t.y < canvas.height + 200);

  // Spawn
  spawnCooldown--;
  if (spawnCooldown <= 0) {
    spawnTraffic();
    spawnCooldown = 18;
  }
}

// Draw road
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

// Start screen
function drawStart() {
  drawRoad();
  ctx.fillStyle = "rgba(0,0,0,0.7)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "white";
  ctx.font = "60px Arial";
  ctx.textAlign = "center";
  ctx.fillText("TRAFFIC DRIVE RUSH", canvas.width/2, canvas.height/2 - 50);

  ctx.font = "25px Arial";
  ctx.fillText("Tap to Start", canvas.width/2, canvas.height/2 + 20);
}

// Game over
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
  ctx.fillText("High Score: " + highScore, canvas.width/2, canvas.height/2 + 40);

  ctx.fillText("Tap to Restart", canvas.width/2, canvas.height/2 + 100);
}

// Loop
function gameLoop() {
  ctx.clearRect(0,0,canvas.width,canvas.height);

  if (gameState === "start") {
    drawStart();
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
    drawGameOver();
  }

  requestAnimationFrame(gameLoop);
}

gameLoop();
