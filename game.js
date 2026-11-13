
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

// Éléments de la page
const lobby = document.getElementById("lobby");
const gameScreen = document.getElementById("gameScreen");
const canvasArea = document.getElementById("gameCanvas");

const lobbyTrophies = document.getElementById("lobbyTrophies");
const gameTrophies = document.getElementById("gameTrophies");
const panelTrophies = document.getElementById("panelTrophies");
const healthText = document.getElementById("health");

const skins = [
  { name: "Combattant Classique", trophies: 0, color: 0x2788ff },
  { name: "Guerrier", trophies: 20, color: 0x36bd55 },
  { name: "Ninja", trophies: 50, color: 0x333344 },
  { name: "Robot", trophies: 100, color: 0x999999 },
  { name: "Feu", trophies: 200, color: 0xff5522 },
  { name: "Glace", trophies: 300, color: 0x55ddff },
  { name: "Ombre", trophies: 500, color: 0x552277 },
  { name: "Électrique", trophies: 750, color: 0xffff33 },
  { name: "Légendaire", trophies: 1000, color: 0xffaa22 },
  { name: "Dragon", trophies: 1500, color: 0x22aa66 },
  { name: "Démon", trophies: 2000, color: 0xaa2222 },
  { name: "Galactique", trophies: 3000, color: 0x8844cc },
  { name: "Ultime", trophies: 5000, color: 0xffffff }
];

let trophies = Number(localStorage.getItem("arenaTrophies") || 0);
let selectedSkin = localStorage.getItem("arenaSkin") || "Combattant Classique";

function updateTrophies() {
  lobbyTrophies.textContent = trophies;
  gameTrophies.textContent = trophies;
  panelTrophies.textContent = trophies;
  localStorage.setItem("arenaTrophies", trophies);
}

function updateSkinName() {
  document.getElementById("skinName").textContent = selectedSkin;
}

function showSkins() {
  const list = document.getElementById("skinsList");
  list.innerHTML = "";

  skins.forEach(skin => {
    const unlocked = trophies >= skin.trophies;
    const button = document.createElement("button");

    button.textContent = unlocked
      ? (selectedSkin === skin.name ? "✓ " : "") + skin.name
      : "🔒 " + skin.name + " (" + skin.trophies + ")";

    button.disabled = !unlocked;
    button.style.opacity = unlocked ? "1" : "0.45";

    button.addEventListener("click", () => {
      selectedSkin = skin.name;
      localStorage.setItem("arenaSkin", selectedSkin);
      updateSkinName();

      if (player) {
        player.material.color.setHex(skin.color);
      }

      document.getElementById("skinsPanel").classList.add("hidden");
    });

    list.appendChild(button);
  });

  document.getElementById("skinsPanel").classList.remove("hidden");
}

document.getElementById("skinsButton").addEventListener("click", showSkins);

document.getElementById("closeSkins").addEventListener("click", () => {
  document.getElementById("skinsPanel").classList.add("hidden");
});

document.getElementById("trophiesButton").addEventListener("click", () => {
  document.getElementById("trophiesPanel").classList.remove("hidden");
});

document.getElementById("closeTrophies").addEventListener("click", () => {
  document.getElementById("trophiesPanel").classList.add("hidden");
});

// Scène 3D
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x8bc9ed);
scene.fog = new THREE.Fog(0x8bc9ed, 35, 100);

const camera = new THREE.PerspectiveCamera(
  70,
  window.innerWidth / window.innerHeight,
  0.1,
  200
);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
canvasArea.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xffffff, 0x506040, 2));

const sunlight = new THREE.DirectionalLight(0xffffff, 2);
sunlight.position.set(20, 35, 10);
sunlight.castShadow = true;
scene.add(sunlight);

// Sol
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(100, 100),
  new THREE.MeshStandardMaterial({ color: 0x5b9d48 })
);

ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// Décors
function makeBox(x, z, width, height, depth, color) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    new THREE.MeshStandardMaterial({ color })
  );

  mesh.position.set(x, height / 2, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);

  return mesh;
}

function makeTree(x, z) {
  makeBox(x, z, 0.7, 2.2, 0.7, 0x704321);

  const top = new THREE.Mesh(
    new THREE.ConeGeometry(1.8, 3.5, 8),
    new THREE.MeshStandardMaterial({ color: 0x176b35 })
  );

  top.position.set(x, 3.6, z);
  top.castShadow = true;
  scene.add(top);
}

for (let i = 0; i < 28; i++) {
  const x = Math.random() * 80 - 40;
  const z = Math.random() * 80 - 40;

  if (Math.abs(x) > 8 || Math.abs(z) > 8) {
    makeTree(x, z);
  }
}

for (let i = 0; i < 18; i++) {
  const x = Math.random() * 65 - 32;
  const z = Math.random() * 65 - 32;

  makeBox(
    x, z,
    2 + Math.random() * 2,
    1.5,
    2 + Math.random() * 2,
    0x777777
  );
}

// Personnage joueur
const player = new THREE.Mesh(
  new THREE.CylinderGeometry(0.55, 0.55, 1.2, 12),
  new THREE.MeshStandardMaterial({ color: 0x2788ff })
);

player.position.set(0, 1.1, 0);
player.castShadow = true;
scene.add(player);

const head = new THREE.Mesh(
  new THREE.SphereGeometry(0.38, 16, 16),
  new THREE.MeshStandardMaterial({ color: 0xffd0a0 })
);

head.position.y = 1.05;
player.add(head);

// Robots ennemis
const bots = [];

function createBot(x, z) {
  const bot = new THREE.Mesh(
    new THREE.BoxGeometry(1.1, 1.8, 1.1),
    new THREE.MeshStandardMaterial({ color: 0xe84b4b })
  );

  bot.position.set(x, 0.9, z);
  bot.userData.health = 3;
  bot.castShadow = true;
  scene.add(bot);
  bots.push(bot);
}

for (let i = 0; i < 7; i++) {
  createBot(Math.random() * 35 - 17, Math.random() * 35 - 17);
}

// Variables du jeu
const keys = {};
const bullets = [];

let gameState = "lobby";
let cameraYaw = 0;
let isPaused = false;
let health = 100;

// Tir
function shoot() {
  if (gameState !== "playing" || isPaused) return;

  const direction = new THREE.Vector3(
    -Math.sin(cameraYaw),
    0,
    -Math.cos(cameraYaw)
  );

  const bullet = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 8, 8),
    new THREE.MeshStandardMaterial({ color: 0xffee44 })
  );

  bullet.position.copy(player.position);
  bullet.position.y += 0.5;
  bullet.position.add(direction.clone().multiplyScalar(1.2));

  bullet.userData.velocity = direction.multiplyScalar(0.9);
  bullet.userData.life = 70;

  scene.add(bullet);
  bullets.push(bullet);
}

// Clavier
window.addEventListener("keydown", event => {
  const key = event.key.toLowerCase();

  if ([
    "w", "a", "s", "d",
    "z", "q",
    "arrowup", "arrowdown",
    "arrowleft", "arrowright",
    " "
  ].includes(key)) {
    event.preventDefault();
  }

  keys[key] = true;
});

window.addEventListener("keyup", event => {
  keys[event.key.toLowerCase()] = false;
});

window.addEventListener("blur", () => {
  for (const key in keys) {
    keys[key] = false;
  }
});

// Souris
renderer.domElement.addEventListener("click", () => {
  if (gameState === "playing" && !isPaused) {
    renderer.domElement.requestPointerLock();
  }
});

document.addEventListener("mousemove", event => {
  if (
    document.pointerLockElement === renderer.domElement &&
    gameState === "playing"
  ) {
    cameraYaw -= event.movementX * 0.0025;
  }
});

document.addEventListener("mousedown", event => {
  if (
    event.button === 0 &&
    document.pointerLockElement === renderer.domElement &&
    gameState === "playing" &&
    !isPaused
  ) {
    shoot();
  }
});

// Bouton jouer
document.getElementById("playButton").addEventListener("click", () => {
  lobby.classList.add("hidden");
  gameScreen.classList.remove("hidden");

  gameState = "playing";
  isPaused = false;
  health = 100;

  healthText.textContent = health;
  player.position.set(0, 1.1, 0);
  cameraYaw = 0;

  document.getElementById("pausePanel").classList.add("hidden");
  document.getElementById("gameMessage").classList.remove("hidden");

  resizeRenderer();
});

// Pause
function pauseGame() {
  if (gameState !== "playing") return;

  isPaused = true;
  document.getElementById("pausePanel").classList.remove("hidden");

  if (document.pointerLockElement) {
    document.exitPointerLock();
  }
}

document.getElementById("pauseButton").addEventListener("click", pauseGame);

document.getElementById("resumeButton").addEventListener("click", () => {
  isPaused = false;
  document.getElementById("pausePanel").classList.add("hidden");
});

document.getElementById("backLobbyButton").addEventListener("click", () => {
  if (document.pointerLockElement) {
    document.exitPointerLock();
  }

  gameState = "lobby";
  isPaused = false;

  gameScreen.classList.add("hidden");
  lobby.classList.remove("hidden");

  document.getElementById("pausePanel").classList.add("hidden");
});

// Déplacement corrigé
function movePlayer() {
  if (gameState !== "playing" || isPaused) return;

  let forward = 0;
  let sideways = 0;

  if (keys["w"] || keys["z"] || keys["arrowup"]) forward += 1;
  if (keys["s"] || keys["arrowdown"]) forward -= 1;
  if (keys["d"] || keys["arrowright"]) sideways += 1;
  if (keys["a"] || keys["q"] || keys["arrowleft"]) sideways -= 1;

  const length = Math.hypot(forward, sideways);

  if (length > 0) {
    forward /= length;
    sideways /= length;
  }

  const speed = 0.16;

  const forwardX = -Math.sin(cameraYaw);
  const forwardZ = -Math.cos(cameraYaw);
  const rightX = Math.cos(cameraYaw);
  const rightZ = -Math.sin(cameraYaw);

  player.position.x += (
    forwardX * forward + rightX * sideways
  ) * speed;

  player.position.z += (
    forwardZ * forward + rightZ * sideways
  ) * speed;

  player.position.x = THREE.MathUtils.clamp(player.position.x, -47, 47);
  player.position.z = THREE.MathUtils.clamp(player.position.z, -47, 47);
}

// Caméra
function updateCamera() {
  if (gameState === "lobby") {
    camera.position.set(0, 3.2, 7);
    camera.lookAt(0, 1, 0);
    return;
  }

  const distance = 7;
  const height = 3.5;

  const target = new THREE.Vector3(
    player.position.x + Math.sin(cameraYaw) * distance,
    player.position.y + height,
    player.position.z + Math.cos(cameraYaw) * distance
  );

  camera.position.lerp(target, 0.15);

  camera.lookAt(
    player.position.x,
    player.position.y + 0.6,
    player.position.z
  );
}

// Robots et projectiles
function updateBots() {
  if (gameState !== "playing" || isPaused) return;

  bots.forEach(bot => {
    const dx = player.position.x - bot.position.x;
    const dz = player.position.z - bot.position.z;
    const distance = Math.hypot(dx, dz);

    if (distance > 2.2 && distance < 30) {
      bot.position.x += (dx / distance) * 0.025;
      bot.position.z += (dz / distance) * 0.025;
    }
  });

  for (let i = bullets.length - 1; i >= 0; i--) {
    const bullet = bullets[i];

    bullet.position.add(bullet.userData.velocity);
    bullet.userData.life--;

    let hit = false;

    for (let j = bots.length - 1; j >= 0; j--) {
      const bot = bots[j];

      if (bullet.position.distanceTo(bot.position) < 1.1) {
        bot.userData.health--;
        hit = true;

        if (bot.userData.health <= 0) {
          scene.remove(bot);
          bots.splice(j, 1);

          trophies += 5;
          updateTrophies();

          createBot(
            Math.random() * 35 - 17,
            Math.random() * 35 - 17
          );
        }

        break;
      }
    }

    if (hit || bullet.userData.life <= 0) {
      scene.remove(bullet);
      bullets.splice(i, 1);
    }
  }
}

// Boucle principale
function animate() {
  requestAnimationFrame(animate);

  if (gameState === "playing" && !isPaused) {
    movePlayer();
    updateBots();
  }

  updateCamera();
  renderer.render(scene, camera);
}

// Redimensionnement
function resizeRenderer() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

window.addEventListener("resize", resizeRenderer);

// Initialisation
const skinAtStart = skins.find(skin => skin.name === selectedSkin);

if (skinAtStart && trophies >= skinAtStart.trophies) {
  player.material.color.setHex(skinAtStart.color);
} else {
  selectedSkin = "Combattant Classique";
}

updateTrophies();
updateSkinName();
animate();
