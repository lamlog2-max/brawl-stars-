
import * as THREE from "three";

const $ = id => document.getElementById(id);

let trophies = Number(localStorage.getItem("arenaTrophies") || 0);
let kills = 0;
let health = 100;
let superCharge = 0;
let running = false;
let paused = false;
let yaw = 0;
let pitch = 0;
let socket = null;
let myId = null;
let lastShot = 0;

const keys = {};
const bots = [];
const remotePlayers = new Map();
const bullets = [];
const obstacles = [];
const worldSize = 150;

$("trophies").textContent = trophies;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x83c9ef);
scene.fog = new THREE.Fog(0x83c9ef, 80, 190);

const camera = new THREE.PerspectiveCamera(
  75, innerWidth / innerHeight, 0.1, 250
);

const renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xffffff, 0x54734c, 2));

const sunlight = new THREE.DirectionalLight(0xffffff, 2);
sunlight.position.set(-30, 60, 30);
sunlight.castShadow = true;
scene.add(sunlight);

// Grande map
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(worldSize, worldSize),
  new THREE.MeshStandardMaterial({color:0x56a94b})
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// Grandes chemins
function makePath(x,z,w,h,color=0xc9a66b) {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(w,h),
    new THREE.MeshStandardMaterial({color})
  );
  mesh.rotation.x = -Math.PI/2;
  mesh.position.set(x,.04,z);
  scene.add(mesh);
}

makePath(0,0,22,150);
makePath(0,0,150,18);

// Obstacles
function addObstacle(x,z,w,h,d,color) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w,h,d),
    new THREE.MeshStandardMaterial({color})
  );
  mesh.position.set(x,h/2,z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);

  obstacles.push({x,z,w,d});
}

// Arbres
function addTree(x,z) {
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(.45,.6,3,8),
    new THREE.MeshStandardMaterial({color:0x754b27})
  );
  trunk.position.set(x,1.5,z);
  scene.add(trunk);

  const leaves = new THREE.Mesh(
    new THREE.SphereGeometry(2,10,8),
    new THREE.MeshStandardMaterial({color:0x207d35})
  );
  leaves.position.set(x,4,z);
  scene.add(leaves);

  obstacles.push({x,z,w:2.5,d:2.5});
}

for(let i=0;i<24;i++) {
  const angle=i*Math.PI*2/24;
  addTree(Math.cos(angle)*63,Math.sin(angle)*63);
}

// Bâtiments et rochers
[
  [-25,-25,10,5,5],
  [25,25,10,5,5],
  [-42,15,8,4,8],
  [42,-15,8,4,8],
  [-10,42,12,4,5],
  [12,-42,12,4,5],
  [-48,-42,7,5,7],
  [48,42,7,5,7],
  [0,0,8,4,8]
].forEach(v=>addObstacle(...v,0x8d7658));

// Eau
const water = new THREE.Mesh(
  new THREE.CircleGeometry(10,32),
  new THREE.MeshStandardMaterial({color:0x168bd0})
);
water.rotation.x=-Math.PI/2;
water.position.set(-48,.08,42);
scene.add(water);

// Limites de l'arène
addObstacle(0,-75,150,5,2,0x38485b);
addObstacle(0,75,150,5,2,0x38485b);
addObstacle(-75,0,2,5,150,0x38485b);
addObstacle(75,0,2,5,150,0x38485b);

// Personnage
function createCharacter(color=0x2878ff) {
  const group=new THREE.Group();

  const body=new THREE.Mesh(
    new THREE.CapsuleGeometry(.8,.9,4,8),
    new THREE.MeshStandardMaterial({color})
  );
  body.position.y=1.2;
  body.castShadow=true;
  group.add(body);

  const head=new THREE.Mesh(
    new THREE.SphereGeometry(.58,12,10),
    new THREE.MeshStandardMaterial({color:0xffc28b})
  );
  head.position.y=2.25;
  group.add(head);

  const mask=new THREE.Mesh(
    new THREE.BoxGeometry(.9,.25,.18),
    new THREE.MeshStandardMaterial({color:0x172238})
  );
  mask.position.set(0,2.28,-.48);
  group.add(mask);

  const gun=new THREE.Mesh(
    new THREE.BoxGeometry(.35,.3,1.05),
    new THREE.MeshStandardMaterial({color:0x303744})
  );
  gun.position.set(.55,1.55,-.7);
  group.add(gun);

  return group;
}

const player=createCharacter();
scene.add(player);

const clock=new THREE.Clock();

function toast(message) {
  $("toast").textContent=message;
  $("toast").classList.add("show");
  setTimeout(()=>$("toast").classList.remove("show"),2200);
}

function updateHUD() {
  $("trophies").textContent=trophies;
  $("kills").textContent=kills;
  $("health").textContent=health;
  $("super").textContent=superCharge;
  $("players").textContent=1+remotePlayers.size+bots.length;
}

const rewards=[
  [20,"Guerrier"],
  [50,"Ninja"],
  [100,"Robot"],
  [200,"Feu"],
  [300,"Glace"],
  [500,"Ombre"],
  [750,"Électrique"],
  [1000,"Légendaire"],
  [1500,"Dragon"],
  [2000,"Démon"],
  [3000,"Galactique"],
  [5000,"Ultime"]
];

function addTrophies(amount) {
  const previous=trophies;
  trophies=Math.max(0,trophies+amount);
  localStorage.setItem("arenaTrophies",trophies);

  for(const [goal,skin] of rewards) {
    const key="skin_"+goal;
    if(previous<goal && trophies>=goal && !localStorage.getItem(key)) {
      localStorage.setItem(key,"yes");
      toast("Nouveau skin : "+skin+" !");
    }
  }
  updateHUD();
}

function showSkins() {
  const unlocked=rewards
    .filter(([goal])=>trophies>=goal)
    .map(([goal,name])=>name);

  $("skinList").textContent=
    "Combattant Classique (départ)"+ 
    (unlocked.length ? ", "+unlocked.join(", ") : 
    " — gagne des trophées pour débloquer les autres !");
  $("skinPanel").classList.remove("hidden");
}

function blocked(x,z) {
  if(Math.abs(x)>worldSize/2-3 || Math.abs(z)>worldSize/2-3) return true;

  return obstacles.some(o=>
    Math.abs(x-o.x)<o.w/2+1 &&
    Math.abs(z-o.z)<o.d/2+1
  );
}

// Bots locaux pour pouvoir tester le combat
function createBot() {
  const bot=createCharacter(0xe84c4c);
  bot.position.set((Math.random()-.5)*90,0,(Math.random()-.5)*90);
  scene.add(bot);
  bots.push({mesh:bot,health:100,wait:Math.random()*2});
}
for(let i=0;i<4;i++) createBot();

function shoot(isSuper=false) {
  if(!running || paused) return;

  const now=performance.now();
  if(now-lastShot<300) return;
  if(isSuper && superCharge<100) {
    toast("Super pas encore chargé !");
    return;
  }

  lastShot=now;

  if(isSuper) superCharge=0;

  const dir=new THREE.Vector3(
    -Math.sin(yaw),0,-Math.cos(yaw)
  );

  const mesh=new THREE.Mesh(
    new THREE.SphereGeometry(isSuper?.55:.22,8,8),
    new THREE.MeshBasicMaterial({
      color:isSuper?0xffd52a:0xfff1a6
    })
  );

  mesh.position.set(player.position.x,1.5,player.position.z);
  mesh.position.addScaledVector(dir,1.5);
  scene.add(mesh);

  bullets.push({mesh,dir,life:1.5,super:isSuper});

  if(socket) socket.emit("shoot",{
    yaw,
    superShot:isSuper
  });
}

function connectOnline() {
  if(typeof io!=="function") {
    $("status").textContent=
      "Mode entraînement : serveur en ligne non installé.";
    return;
  }

  socket=io();

  socket.on("connect",()=>{
    myId=socket.id;
    socket.emit("join",{name:$("playerName").value});
    $("status").textContent="Connecté au serveur !";
  });

  socket.on("players",list=>{
    for(const p of list) {
      if(p.id===myId) continue;

      let obj=remotePlayers.get(p.id);
      if(!obj) {
        obj=createCharacter(p.color);
        scene.add(obj);
        remotePlayers.set(p.id,obj);
      }

      obj.position.set(p.x,0,p.z);
      obj.rotation.y=p.yaw;
    }

    for(const [id,obj] of remotePlayers) {
      if(!list.some(p=>p.id===id)) {
        scene.remove(obj);
        remotePlayers.delete(id);
      }
    }
    updateHUD();
  });

  socket.on("hit",data=>{
    if(data.target===myId) {
      health=Math.max(0,health-25);
      if(health===0) {
        health=100;
        player.position.set(0,0,0);
        addTrophies(-5);
        toast("Éliminé ! -5 trophées");
      }
    }

    if(data.shooter===myId) {
      superCharge=Math.min(100,superCharge+20);
    }
    updateHUD();
  });

  socket.on("elimination",data=>{
    if(data.winner===myId) {
      kills++;
      addTrophies(5);
      toast("+5 trophées !");
    }
  });
}

// Contrôles et déplacement
function movePlayer(dt) {
  let forward=(keys.KeyW?1:0)-(keys.KeyS?1:0);
  let side=(keys.KeyD?1:0)-(keys.KeyA?1:0);

  const length=Math.hypot(forward,side)||1;
  forward/=length;
  side/=length;

  const speed=12;

  const dx=(
    -Math.sin(yaw)*forward+
    Math.cos(yaw)*side
  )*speed*dt;

  const dz=(
    -Math.cos(yaw)*forward-
    Math.sin(yaw)*side
  )*speed*dt;

  if(!blocked(player.position.x+dx,player.position.z))
    player.position.x+=dx;

  if(!blocked(player.position.x,player.position.z+dz))
    player.position.z+=dz;

  player.rotation.y=yaw;
}

// Bots qui se déplacent
function updateBots(dt) {
  for(const bot of bots) {
    const dx=player.position.x-bot.mesh.position.x;
    const dz=player.position.z-bot.mesh.position.z;
    const distance=Math.hypot(dx,dz);

    if(distance>2) {
      bot.mesh.position.x+=dx/distance*3*dt;
      bot.mesh.position.z+=dz/distance*3*dt;
    }
  }
}

// Boucle du jeu
function animate() {
  requestAnimationFrame(animate);

  const dt=Math.min(clock.getDelta(),.05);

  if(running && !paused) {
    movePlayer(dt);
    updateBots(dt);

    camera.position.lerp(
      new THREE.Vector3(
        player.position.x+Math.sin(yaw)*10,
        7+pitch*4,
        player.position.z+Math.cos(yaw)*10
      ),
      .12
    );

    camera.lookAt(
      player.position.x,
      1.5,
      player.position.z
    );

    for(let i=bullets.length-1;i>=0;i--) {
      const b=bullets[i];
      b.mesh.position.addScaledVector(b.dir,55*dt);
      b.life-=dt;

      for(const bot of bots) {
        if(b.mesh.position.distanceTo(
          new THREE.Vector3(
            bot.mesh.position.x,1.5,bot.mesh.position.z
          )
        )<1.5) {
          bot.health-=b.super?100:50;
          b.life=0;

          if(bot.health<=0) {
            scene.remove(bot.mesh);
            bots.splice(bots.indexOf(bot),1);
            kills++;
            addTrophies(5);
            superCharge=Math.min(100,superCharge+20);
            toast("Bot éliminé ! +5 trophées");
            createBot();
          }
          break;
        }
      }

      if(b.life<=0) {
        scene.remove(b.mesh);
        bullets.splice(i,1);
      }
    }

    if(socket) {
      socket.emit("move",{
        x:player.position.x,
        z:player.position.z,
        yaw
      });
    }
  }

  renderer.render(scene,camera);
}

animate();

// Boutons
$("playButton").addEventListener("click",()=>{
  if(running) return;

  running=true;
  paused=false;
  $("menu").classList.add("hidden");
  $("hud").classList.remove("hidden");

  connectOnline();
  renderer.domElement.requestPointerLock?.();
  toast("Bonne partie !");
});

$("pauseButton").addEventListener("click",()=>{
  paused=true;
  $("pausePanel").classList.remove("hidden");
  document.exitPointerLock?.();
});

$("resumeButton").addEventListener("click",()=>{
  paused=false;
  $("pausePanel").classList.add("hidden");
  renderer.domElement.requestPointerLock?.();
});

$("menuButton").addEventListener("click",()=>{
  paused=true;
  running=false;
  $("pausePanel").classList.add("hidden");
  $("hud").classList.add("hidden");
  $("menu").classList.remove("hidden");
  document.exitPointerLock?.();
});

$("closeSkins").addEventListener("click",()=>{
  $("skinPanel").classList.add("hidden");
});

document.addEventListener("keydown",e=>{
  keys[e.code]=true;

  if(e.code==="Space") {
    e.preventDefault();
    shoot(true);
  }
});

document.addEventListener("keyup",e=>{
  keys[e.code]=false;
});

document.addEventListener("mousemove",e=>{
  if(document.pointerLockElement===renderer.domElement) {
    yaw-=e.movementX*.0025;
    pitch=Math.max(-.5,Math.min(.35,pitch-e.movementY*.0015));
  }
});

document.addEventListener("mousedown",e=>{
  if(e.button!==0 || !running || paused) return;

  if(document.pointerLockElement!==renderer.domElement) {
    renderer.domElement.requestPointerLock?.();
  } else {
    shoot(false);
  }
});

window.addEventListener("resize",()=>{
  camera.aspect=innerWidth/innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth,innerHeight);
});

