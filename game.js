const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// DEVICE
let isMobile = window.innerWidth < 768;

// VARIABLES
let roadWidth, roadX, laneWidth;
let carWidth, carHeight;

let player = { x: 0, y: 0, targetX: 0 };

let gameState = "start";
let baseSpeed = 6;
let speed = baseSpeed;

let roadOffset = 0;

let score = 0;
let highScore = localStorage.getItem("highScore") || 0;
let lastScoreTime = 0;

let traffic = [];
let spawnTimer = 0;
let shakeTime = 0;

// LEVEL SYSTEM
let level = 1;

// ================== RESIZE ==================
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  isMobile = window.innerWidth < 768;

  roadWidth = isMobile ? canvas.width * 0.7 : canvas.width * 0.5;
  roadX = (canvas.width - roadWidth) / 2;
  laneWidth = roadWidth / 4;

  if (isMobile) {
    carWidth = laneWidth * 0.6;
  } else {
    carWidth = laneWidth * 0.9;
  }

  carHeight = carWidth * 1.3;

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

// CONTROLS
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

// MOBILE
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
  speed = baseSpeed;
  score = 0;
  level = 1;
  roadOffset = 0;
  lastScoreTime = Date.now();
}

// SPAWN (MORE OBSTACLES)
function spawnTraffic() {
  let lane = Math.floor(Math.random() * 4);
  let x = roadX + lane * laneWidth + (laneWidth - carWidth) / 2;

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

// UPDATE
function update() {
  if (gameState !== "playing") return;

  // MOVEMENT
  if (moveLeft) player.targetX -= 9;
  if (moveRight) player.targetX += 9;

  player.x += (player.targetX - player.x) * 0.2;

  player.x = Math.max(roadX, Math.min(roadX + roadWidth - carWidth, player.x));

  // LEVEL SYSTEM
  level = Math.floor(score / 10) + 1;

  speed = baseSpeed + level * 0.5;

  roadOffset -= speed;

  // SCORE
  let now = Date.now();
  if (now - lastScoreTime > 500) {
    score++;
    lastScoreTime = now;
  }

  // TRAFFIC
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

  // 🔥 MORE SPAWN WITH LEVEL
  spawnTimer++;

  let spawnRate = isMobile ? 45 : 65;
  spawnRate -= level * 2; // faster spawn each level

  if (spawnTimer > spawnRate) {
    spawnTraffic();

    // extra cars at higher level
    if (level > 3) spawnTraffic();
    if (level > 6 && Math.random() < 0.6) spawnTraffic();

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
  ctx.font = "22px Arial";
  ctx.fillText("Score: " + score, 20, 40);
  ctx.fillText("High: " + highScore, 20, 70);
  ctx.fillText("Level: " + level, 20, 100);

  ctx.restore();
}

// START SCREEN
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

// GAME OVER
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
  ctx.fillText("Level: " + level, canvas.width/2, canvas.height/2 + 40);
  ctx.fillText("Tap to Restart", canvas.width/2, canvas.height/2 + 90);
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
resetGame();
gameLoop();
