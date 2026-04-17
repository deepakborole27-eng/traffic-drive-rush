const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// RESPONSIVE CANVAS
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  roadWidth = canvas.width * 0.7; // wider road for mobile
  roadX = (canvas.width - roadWidth) / 2;
  laneWidth = roadWidth / 4;

  carWidth = laneWidth * 0.7; // always fit inside lane
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

// VARIABLES
let roadWidth, roadX, laneWidth;
let carWidth, carHeight;

// PLAYER
let player = {
  lane: 1,
  x: 0,
  targetX: 0,
  y: 0
};

// GAME STATE
let gameState = "start";
let speed = 6;
let roadOffset = 0;

let score = 0;
let highScore = localStorage.getItem("highScore") || 0;
let lastScoreTime = 0;

let traffic = [];
let spawnTimer = 0;

let shakeTime = 0;

// CONTROLS
let keys = {};

document.addEventListener("keydown", e => {
  if (e.key === "ArrowLeft" && player.lane > 0) moveLeft();
  if (e.key === "ArrowRight" && player.lane < 3) moveRight();
});

// MOBILE CONTROLS (FIXED)
document.getElementById("leftBtn").addEventListener("touchstart", (e) => {
  e.preventDefault();
  moveLeft();
});

document.getElementById("rightBtn").addEventListener("touchstart", (e) => {
  e.preventDefault();
  moveRight();
});

// MOVE FUNCTIONS (NO JUMP BUG)
function moveLeft() {
  if (player.lane > 0) {
    player.lane--;
    player.targetX = getLaneX(player.lane);
  }
}

function moveRight() {
  if (player.lane < 3) {
    player.lane++;
    player.targetX = getLaneX(player.lane);
  }
}

// LANE POSITION
function getLaneX(lane) {
  return roadX + lane * laneWidth + (laneWidth - carWidth) / 2;
}

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
  player.lane = 1;
  player.x = getLaneX(1);
  player.targetX = player.x;

  traffic = [];
  speed = 6;
  score = 0;
  roadOffset = 0;
  lastScoreTime = Date.now();
}

// SAFE SPAWN
function spawnTraffic() {
  let lane = Math.floor(Math.random() * 4);

  for (let t of traffic) {
    if (t.lane === lane && t.y < 500) return;
  }

  let img = trafficImgs[Math.floor(Math.random() * trafficImgs.length)];

  traffic.push({
    lane: lane,
    x: getLaneX(lane),
    y: -carHeight - 100,
    width: carWidth,
    height: carHeight,
    img: img
  });
}

// PERFECT COLLISION (NO FALSE CRASH)
function checkCollision(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + carWidth > b.x &&
    a.y < b.y + b.height &&
    a.y + carHeight > b.y
  );
}

// UPDATE
function update() {
  if (gameState !== "playing") return;

  // smooth movement (NO JUMP)
  player.x += (player.targetX - player.x) * 0.2;

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

  spawnTimer++;
  if (spawnTimer > 70) {
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

// UI
function drawStart() {
  drawRoad();
  ctx.fillStyle = "rgba(0,0,0,0.7)";
  ctx.fillRect(0,0,canvas.width,canvas.height);

  ctx.fillStyle = "white";
  ctx.font = "40px Arial";
  ctx.textAlign = "center";
  ctx.fillText("TRAFFIC DRIVE RUSH", canvas.width/2, canvas.height/2);

  ctx.font = "20px Arial";
  ctx.fillText("Tap to Start", canvas.width/2, canvas.height/2 + 50);
}

function drawGameOver() {
  ctx.fillStyle = "rgba(0,0,0,0.8)";
  ctx.fillRect(0,0,canvas.width,canvas.height);

  ctx.fillStyle = "red";
  ctx.font = "50px Arial";
  ctx.textAlign = "center";
  ctx.fillText("GAME OVER", canvas.width/2, canvas.height/2 - 40);

  ctx.fillStyle = "white";
  ctx.font = "25px Arial";
  ctx.fillText("Score: " + score, canvas.width/2, canvas.height/2);
  ctx.fillText("Tap to Restart", canvas.width/2, canvas.height/2 + 50);
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

// INIT
resizeCanvas();
player.x = getLaneX(1);
player.targetX = player.x;

gameLoop();
