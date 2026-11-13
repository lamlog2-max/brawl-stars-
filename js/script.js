

import * as THREE from "three";
import { maps } from "./data.js";

export function buildWorld(scene, mapIndex = 0) {
  const old = scene.getObjectByName("ARENA");
  if(old) scene.remove(old);

  const arena = new THREE.Group();
  arena.name = "ARENA";

  const map = maps[mapIndex];

  const ground = new THREE.Mesh(
    new THREE.BoxGeometry(36,1,36),
    new THREE.MeshStandardMaterial({color:map.ground})
  );

  ground.position.y = -0.5;
  ground.receiveShadow = true;
  arena.add(ground);

  function box(x,z,w,h,d,color) {
    const obj = new THREE.Mesh(
      new THREE.BoxGeometry(w,h,d),
      new THREE.MeshStandardMaterial({color})
    );

    obj.position.set(x,h/2,z);
    obj.castShadow = true;
    obj.receiveShadow = true;
    arena.add(obj);
  }

  // Limites de l'arène
  box(0,-18,36,2,1,map.wall);
  box(0,18,36,2,1,map.wall);
  box(-18,0,1,2,36,map.wall);
  box(18,0,1,2,36,map.wall);

  // Obstacles
  const obstacles = [
    [-7,-7], [7,-7], [-7,7], [7,7],
    [0,-10], [0,10], [-11,0], [11,0],
    [-12,-12], [12,12]
  ];

  obstacles.forEach(([x,z]) => {
    box(x,z,2.5,1.8,2.5,map.wall);
  });

  // Buissons
  const bushMaterial = new THREE.MeshStandardMaterial({
    color:0x238a37
  });

  for(let i=0;i<14;i++) {
    const bush = new THREE.Mesh(
      new THREE.SphereGeometry(0.9,12,12),
      bushMaterial
    );

    bush.scale.set(1.4,0.7,1.4);
    bush.position.set(
      Math.random()*28-14,
      0.15,
      Math.random()*28-14
    );

    arena.add(bush);
  }

  scene.add(arena);
  return arena;
}
