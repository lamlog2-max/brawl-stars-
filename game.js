
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

// =====================================
// ARENA BRAWL - SCRIPT COMPLET
// =====================================

const $ = id => document.getElementById(id);

const lobby = $("lobby");
const gameScreen = $("gameScreen");
const canvasArea = $("gameCanvas");

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

let gameState = "lobby";
let isPaused = false;
let cameraYaw = 0;
let health = 100;
let lastDamageTime = 0;

const keys = {};
const bots = [];
const bullets = [];
const enemyBullets = [];

// =====================================
// TROPHÉES ET SKINS
// =====================================

function updateTrophies() {
  $("lobbyTrophies").textContent = trophies;
  $("gameTrophies").textContent = trophies;
  $("panelTrophies").textContent = trophies;
  localStorage.setItem("arenaTrophies", trophies);
}

function updateSkinName() {
  $("skinName").textContent = selectedSkin;
}

function showSkins() {
  const list = $("skinsList");
  list.innerHTML = "";

  skins.forEach(skin => {
    const unlocked = trophies >= skin.trophies;
    const button = document.createElement("button");

    button.textContent = unlocked
      ? (selectedSkin === skin.name ? "✓ " : "") + skin.name
      : "🔒 " + skin.name + " (" + skin.trophies + ")";

    button.disabled = !unlocked;

    button.addEventListener("click", () => {
      selectedSkin = skin.name;
      localStorage.setItem("arenaSkin", selectedSkin);
      player.material.color.setHex(skin.color);
      updateSkinName();
      $("skinsPanel").classList.add("hidden");
    });

    list.appendChild(button);
  });

  $("skinsPanel").classList.remove("hidden");
}

$("skinsButton").addEventListener("click", showSkins);
$("closeSkins").addEventListener("click", () => {
  $("skinsPanel").classList.add("hidden");
});

$("trophiesButton").addEventListener("click", () => {
  $("trophiesPanel").classList.remove("hidden");
});

$("closeTrophies").addEventListener("click", () => {
  $("trophiesPanel").classList.add("hidden");
});

// =====================================
// SCÈNE 3D
// =====================================

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
renderer.domElement.tabIndex = 0;
canvasArea.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xffffff, 0x506040, 2));

const sunlight = new THREE.DirectionalLight(0xffffff, 2);
sunlight.position.set(20, 35, 10);
sunlight.castShadow = true;
scene.add(sunlight);

// SOL
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(100, 100),
  new THREE.MeshStandardMaterial({ color: 0x5b9d48 })
);

ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// =====================================
// DÉCORS
// =====================================

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
  makeBox(
    Math.random() * 65 - 32,
    Math.random() * 65 - 32,
    2.5, 1.5, 2.5,
    0x777777
  );
}

// =====================================
// JOUEUR
// =====================================

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

// =====================================
// ROBOTS
// =====================================

function createBot(x, z) {
  const bot = new THREE.Mesh(
    new THREE.BoxGeometry(1.1, 1.8, 1.1),
    new THREE.MeshStandardMaterial({ color: 0xe84b4b })
  );

  bot.position.set(x, 0.9, z);
  bot.userData.health = 3;
  bot.userData.lastShot = 0;
  bot.castShadow = true;

  scene.add(bot);
  bots.push(bot);
}

function createBots() {
  for (let i = 0; i < 7; i++) {
    createBot(
      Math.random() * 35 - 17,
      Math.random() * 35 - 17
    );
  }
}

// =====================================
// PROJECTILES
// =====================================

function createProjectile(position, direction, color, speed, owner) {
  const bullet = new THREE.Mesh(
    new THREE.SphereGeometry(0.2, 10, 10),
    new THREE.MeshStandardMaterial({
      color,
      emissive: color
    })
  );

  bullet.position.copy(position);
  bullet.userData.velocity = direction.clone().normalize().multiplyScalar(speed);
  bullet.userData.life = 100;
  bullet.userData.owner = owner;

  scene.add(bullet);

  if (owner === "player") {
    bullets.push(bullet);
  } else {
    enemyBullets.push(bullet);
  }
}

// TIR DU JOUEUR
function shoot() {
  if (gameState !== "playing" || isPaused) return;

  const direction = new THREE.Vector3(
    -Math.sin(cameraYaw),
    0,
    -Math.cos(cameraYaw)
  );

  const position = player.position.clone();
  position.y += 0.5;
  position.add(direction.clone().multiplyScalar(1.2));

  createProjectile(position, direction, 0xffee44, 0.9, "player");
}

// TIR DES ROBOTS
function botShoot(bot) {
  const direction = new THREE.Vector3(
    player.position.x - bot.position.x,
    0,
    player.position.z - bot.position.z
  ).normalize();

  const position = bot.position.clone();
  position.y += 0.3;

  createProjectile(position, direction, 0xff2222, 0.24, "bot");
}

// =====================================
// VIE DU JOUEUR
// =====================================

function updateHealth() {
  $("health").textContent = health;
}

function takeDamage(amount) {
  if (gameState !== "playing" || isPaused) return;

  const now = performance.now();

  if (now - lastDamageTime < 350) return;

  lastDamageTime = now;
  health = Math.max(0, health - amount);
  updateHealth();

  if (health <= 0) {
    eliminatePlayer();
  }
}

function eliminatePlayer() {
  gameState = "eliminated";

  if (document.pointerLockElement) {
    document.exitPointerLock();
  }

  const panel = $("pausePanel");

  panel.innerHTML = `
    <h2 style="color:#ff5555">TU AS ÉTÉ ÉLIMINÉ !</h2>
    <p>Les robots ont gagné cette manche.</p>
    <button id="retryButton">REJOUER</button>
    <button id="lobbyButton">RETOURNER AU LOBBY</button>
  `;

  panel.classList.remove("hidden");

  $("retryButton").addEventListener("click", startGame);
  $("lobbyButton").addEventListener("click", backToLobby);
}

// =====================================
// CLAVIER
// =====================================

window.addEventListener("keydown", event => {
  const key = event.key.toLowerCase();

  if ([
    "w", "a", "s", "d", "z", "q",
    "arrowup", "arrowdown", "arrowleft", "arrowright", " "
  ].includes(key)) {
    event.preventDefault();
  }

  keys[key] = true;
});

window.addEventListener("keyup", event => {
  keys[event.key.toLowerCase()] = false;
});

window.addEventListener("blur", () => {
  Object.keys(keys).forEach(key => {
    keys[key] = false;
  });
});

// =====================================
// SOURIS ET CAMÉRA
// =====================================

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

// =====================================
// DÉPLACEMENT
// =====================================

function movePlayer() {
  if (gameState !== "playing" || isPaused) return;

  let forward = 0;
  let sideways = 0;

  if (keys["w"] || keys["z"] || keys["arrowup"]) forward++;
  if (keys["s"] || keys["arrowdown"]) forward--;
  if (keys["d"] || keys["arrowright"]) sideways++;
  if (keys["a"] || keys["q"] || keys["arrowleft"]) sideways--;

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

// =====================================
// CAMÉRA
// =====================================

function updateCamera() {
  if (gameState === "lobby") {
    camera.position.set(0, 3.2, 7);
    camera.lookAt(0, 1, 0);
    return;
  }

  const target = new THREE.Vector3(
    player.position.x + Math.sin(cameraYaw) * 7,
    player.position.y + 3.5,
    player.position.z + Math.cos(cameraYaw) * 7
  );

  camera.position.lerp(target, 0.15);

  camera.lookAt(
    player.position.x,
    player.position.y + 0.6,
    player.position.z
  );
}

// =====================================
// INTELLIGENCE DES ROBOTS
// =====================================

function updateBots() {
  if (gameState !== "playing" || isPaused) return;

  const now = performance.now();

  bots.forEach(bot => {
    const dx = player.position.x - bot.position.x;
    const dz = player.position.z - bot.position.z;
    const distance = Math.hypot(dx, dz);

    // Poursuite
    if (distance > 2.2 && distance < 35) {
      bot.position.x += (dx / distance) * 0.035;
      bot.position.z += (dz / distance) * 0.035;
    }

    // Attaque à distance
    if (
      distance < 25 &&
      now - bot.userData.lastShot > 1500
    ) {
      botShoot(bot);
      bot.userData.lastShot = now;
    }

    // Attaque au contact
    if (distance < 1.3) {
      takeDamage(10);
    }
  });

  updateProjectiles();
}

// =====================================
// MISE À JOUR DES PROJECTILES
// =====================================

function updateProjectiles() {
  // Projectiles ennemis
  for (let i = enemyBullets.length - 1; i >= 0; i--) {
    const bullet = enemyBullets[i];

    bullet.position.add(bullet.userData.velocity);
    bullet.userData.life--;

    if (bullet.position.distanceTo(player.position) < 0.9) {
      takeDamage(15);
      scene.remove(bullet);
      enemyBullets.splice(i, 1);
      continue;
    }

    if (bullet.userData.life <= 0) {
      scene.remove(bullet);
      enemyBullets.splice(i, 1);
    }
  }

  // Projectiles du joueur
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

// =====================================
// LANCER UNE PARTIE
// =====================================

function startGame() {
  if (document.pointerLockElement) {
    document.exitPointerLock();
  }

  bots.forEach(bot => scene.remove(bot));
  bots.length = 0;

  bullets.forEach(bullet => scene.remove(bullet));
  bullets.length = 0;

  enemyBullets.forEach(bullet => scene.remove(bullet));
  enemyBullets.length = 0;

  player.position.set(0, 1.1, 0);
  cameraYaw = 0;
  health = 100;
  lastDamageTime = 0;

  updateHealth();
  createBots();

  lobby.classList.add("hidden");
  gameScreen.classList.remove("hidden");

  gameState = "playing";
  isPaused = false;

  const panel = $("pausePanel");

  panel.innerHTML = `
    <h2>PAUSE</h2>
    <button id="resumeButton">REPRENDRE</button>
    <button id="backLobbyButton">RETOURNER AU LOBBY</button>
  `;

  panel.classList.add("hidden");

  $("resumeButton").addEventListener("click", () => {
    isPaused = false;
    panel.classList.add("hidden");
  });

  $("backLobbyButton").addEventListener("click", backToLobby);

  $("gameMessage").classList.remove("hidden");

  resizeRenderer();
}

// =====================================
// RETOUR AU LOBBY
// =====================================

function backToLobby() {
  if (document.pointerLockElement) {
    document.exitPointerLock();
  }

  gameState = "lobby";
  isPaused = false;

  gameScreen.classList.add("hidden");
  lobby.classList.remove("hidden");

  $("pausePanel").classList.add("hidden");
}

// =====================================
// BOUTONS
// =====================================

$("playButton").addEventListener("click", startGame);

$("pauseButton").addEventListener("click", () => {
  if (gameState !== "playing") return;

  isPaused = true;
  $("pausePanel").classList.remove("hidden");

  if (document.pointerLockElement) {
    document.exitPointerLock();
  }
});

// =====================================
// REDIMENSIONNEMENT
// =====================================

function resizeRenderer() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

window.addEventListener("resize", resizeRenderer);

// =====================================
// INITIALISATION
// =====================================

const skinAtStart = skins.find(skin => skin.name === selectedSkin);

if (skinAtStart && trophies >= skinAtStart.trophies) {
  player.material.color.setHex(skinAtStart.color);
} else {
  selectedSkin = "Combattant Classique";
}

updateTrophies();
updateSkinName();
updateHealth();

function animate() {
  requestAnimationFrame(animate);

  if (gameState === "playing" && !isPaused) {
    movePlayer();
    updateBots();
  }

  updateCamera();
  renderer.render(scene, camera);
}

animate();
