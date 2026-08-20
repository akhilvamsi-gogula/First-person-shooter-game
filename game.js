import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js';

const stage = document.querySelector('#game-stage');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x071113);
scene.fog = new THREE.Fog(0x071113, 18, 58);
const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, .1, 100);
camera.rotation.order = 'YXZ';
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
stage.appendChild(renderer.domElement);

const clock = new THREE.Clock();
const keys = {};
const colliders = [];
let running = false;
let playerHealth = 100;
let ammo = 12;
let score = 0;
let enemyScore = 0;
let timeLeft = 120;
let lastShot = 0;
let reloadTimer = 0;
let enemyShotTimer = 2.5;
let hitFlashTimer = 0;
const player = { x: 0, z: 14, yaw: 0, pitch: 0 };
const enemy = { x: 0, z: -13, health: 100, alive: true, bob: 0 };

const ui = {
  timer: document.querySelector('#timer'), health: document.querySelector('#health'), healthMeter: document.querySelector('#health-meter'),
  ammo: document.querySelector('#ammo'), ammoMeter: document.querySelector('#ammo-meter'), playerScore: document.querySelector('#player-score'), enemyScore: document.querySelector('#enemy-score'),
  enemyState: document.querySelector('#enemy-state'), marker: document.querySelector('#hit-marker'), damage: document.querySelector('#damage-vignette'), panel: document.querySelector('#message-panel'), title: document.querySelector('#message-title'), copy: document.querySelector('#message-copy'), start: document.querySelector('#start-button')
};

scene.add(new THREE.HemisphereLight(0x8ad1cc, 0x071113, 1.8));
const cyanLight = new THREE.PointLight(0x4de1dc, 15, 26); cyanLight.position.set(-10, 5, 4); scene.add(cyanLight);
const orangeLight = new THREE.PointLight(0xff6548, 17, 25); orangeLight.position.set(11, 4, -8); scene.add(orangeLight);

const floor = new THREE.Mesh(new THREE.PlaneGeometry(48, 48), new THREE.MeshStandardMaterial({ color: 0x102a2b, roughness: .78, metalness: .25 }));
floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
const grid = new THREE.GridHelper(44, 22, 0x245b5a, 0x173d3e); grid.position.y = .015; scene.add(grid);

function box(x, y, z, w, h, d, color, emissive = 0x000000) {
  const material = new THREE.MeshStandardMaterial({ color, roughness: .55, metalness: .35, emissive, emissiveIntensity: emissive ? 1.8 : 0 });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material); mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true; scene.add(mesh); return mesh;
}
function createArena() {
  box(0, 2.1, -21, 42, 4.2, 1, 0x163c3c); box(0, 2.1, 21, 42, 4.2, 1, 0x163c3c); box(-21, 2.1, 0, 1, 4.2, 42, 0x163c3c); box(21, 2.1, 0, 1, 4.2, 42, 0x163c3c);
  colliders.push({ minX: -21, maxX: 21, minZ: -21.5, maxZ: -20.5 }, { minX: -21, maxX: 21, minZ: 20.5, maxZ: 21.5 }, { minX: -21.5, maxX: -20.5, minZ: -21, maxZ: 21 }, { minX: 20.5, maxX: 21.5, minZ: -21, maxZ: 21 });
  [[-11, -7, 4, 2.6, 5], [10, -4, 3, 3.5, 4], [-10, 7, 4, 2.4, 3], [9, 9, 5, 3, 5], [0, 0, 4, 3, 3]].forEach(([x,z,w,h,d]) => { box(x, h/2, z, w, h, d, 0x1a4544); colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 }); box(x, h+.05, z, w*.55, .08, d*.55, 0x4de1dc, 0x164d4a); });
  for (let x = -18; x <= 18; x += 6) { box(x, .04, -20.35, .16, .08, .5, 0x4de1dc, 0x4de1dc); box(x, .04, 20.35, .16, .08, .5, 0xff754f, 0xff754f); }
}
createArena();

function isBlocked(x, z) {
  const radius = .58;
  return colliders.some(c => x > c.minX - radius && x < c.maxX + radius && z > c.minZ - radius && z < c.maxZ + radius);
}
function movePlayer(deltaX, deltaZ) {
  const nextX = THREE.MathUtils.clamp(player.x + deltaX, -19.2, 19.2);
  const nextZ = THREE.MathUtils.clamp(player.z + deltaZ, -19.2, 19.2);
  if (!isBlocked(nextX, player.z)) player.x = nextX;
  if (!isBlocked(player.x, nextZ)) player.z = nextZ;
}

const weapon = new THREE.Group();
const gunBody = new THREE.Mesh(new THREE.BoxGeometry(.28, .22, .9), new THREE.MeshStandardMaterial({ color: 0x1f292a, metalness: .8, roughness: .28 })); gunBody.position.set(.28, -.27, -.7); weapon.add(gunBody);
const barrel = new THREE.Mesh(new THREE.CylinderGeometry(.055, .055, .55, 10), new THREE.MeshStandardMaterial({ color: 0x4de1dc, emissive: 0x176b68, emissiveIntensity: 1.6 })); barrel.rotation.x = Math.PI/2; barrel.position.set(.28, -.25, -1.18); weapon.add(barrel); camera.add(weapon); scene.add(camera);
camera.position.set(player.x, 1.7, player.z);

const enemyGroup = new THREE.Group();
const body = new THREE.Mesh(new THREE.CapsuleGeometry(.56, 1.15, 5, 10), new THREE.MeshStandardMaterial({ color: 0x8f242a, emissive: 0x3a0b10, emissiveIntensity: .8, roughness: .35 })); body.castShadow = true; body.position.y = 1.25; enemyGroup.add(body);
const visor = new THREE.Mesh(new THREE.BoxGeometry(.66, .18, .16), new THREE.MeshStandardMaterial({ color: 0xff754f, emissive: 0xf33226, emissiveIntensity: 2 })); visor.position.set(0, 1.58, .45); enemyGroup.add(visor);
const eyeLight = new THREE.PointLight(0xff4e42, 3, 7); eyeLight.position.set(0, 1.6, .6); enemyGroup.add(eyeLight); scene.add(enemyGroup);

const particles = [];
const aimRay = new THREE.Raycaster();
function burst(position, color) { for (let i = 0; i < 12; i++) { const p = new THREE.Mesh(new THREE.BoxGeometry(.06,.06,.06), new THREE.MeshBasicMaterial({ color })); p.position.copy(position); p.velocity = new THREE.Vector3((Math.random()-.5)*4, Math.random()*3, (Math.random()-.5)*4); p.life = .45 + Math.random()*.35; scene.add(p); particles.push(p); } }
function updateEnemy(dt) { if (!enemy.alive) return; const toPlayer = new THREE.Vector3(player.x - enemy.x, 0, player.z - enemy.z); const distance = toPlayer.length(); if (distance > 8) { toPlayer.normalize(); enemy.x += toPlayer.x * .7 * dt; enemy.z += toPlayer.z * .7 * dt; } enemyGroup.position.set(enemy.x, 0, enemy.z); enemyGroup.lookAt(player.x, 1.1, player.z); enemy.bob += dt * 3; enemyGroup.position.y = Math.sin(enemy.bob) * .04; }
function shoot() { if (!running || reloadTimer > 0 || performance.now() - lastShot < 250) return; if (ammo <= 0) { reload(); return; } lastShot = performance.now(); ammo--; updateHUD(); weapon.position.z = .12; setTimeout(() => weapon.position.z = 0, 65); aimRay.setFromCamera(new THREE.Vector2(0, 0), camera); const targetHit = enemy.alive && aimRay.intersectObjects(enemyGroup.children, true).length > 0; if (targetHit) { enemy.health -= 25; score += 10; ui.marker.classList.remove('hit'); void ui.marker.offsetWidth; ui.marker.classList.add('hit'); burst(new THREE.Vector3(enemy.x, 1.25, enemy.z), 0xd5f35c); if (enemy.health <= 0) { enemy.alive = false; enemyGroup.visible = false; score += 100; ui.enemyState.textContent = 'DOWN'; endGame(true); } updateHUD(); } }
function reload() { if (reloadTimer > 0 || ammo === 12) return; reloadTimer = 1.15; ui.ammo.textContent = '...'; setTimeout(() => { ammo = 12; reloadTimer = 0; updateHUD(); }, 1150); }
function updateHUD() { ui.health.textContent = Math.max(0, Math.round(playerHealth)); ui.healthMeter.style.width = `${Math.max(0, playerHealth)}%`; ui.ammo.textContent = ammo; ui.ammoMeter.style.width = `${ammo / 12 * 100}%`; ui.playerScore.textContent = String(score).padStart(3, '0'); ui.enemyScore.textContent = String(enemyScore).padStart(3, '0'); }
function endGame(won) { running = false; ui.title.innerHTML = won ? 'ARENA<br><em>CLEARED</em>' : 'SYSTEM<br><em>FAILURE</em>'; ui.copy.textContent = won ? `ROGUE-01 neutralized // score ${String(score).padStart(3,'0')}` : 'Vitals depleted // recalibration required'; ui.start.textContent = 'RUN IT BACK  →'; ui.panel.classList.remove('hidden'); }
function startGame() { running = true; playerHealth = 100; ammo = 12; score = 0; enemyScore = 0; timeLeft = 120; enemy.health = 100; enemy.alive = true; enemy.x = 0; enemy.z = -13; enemyGroup.visible = true; ui.enemyState.textContent = 'TRACKING'; ui.panel.classList.add('hidden'); updateHUD(); }

function update() { const dt = Math.min(clock.getDelta(), .05); if (!running) return; timeLeft -= dt; if (timeLeft <= 0) endGame(false); ui.timer.textContent = `${String(Math.max(0, Math.floor(timeLeft / 60))).padStart(2,'0')}:${String(Math.max(0, Math.floor(timeLeft % 60))).padStart(2,'0')}`;
  const movement = new THREE.Vector3(); if (keys.ArrowUp) movement.z -= 1; if (keys.ArrowDown) movement.z += 1; if (keys.ArrowLeft) movement.x -= 1; if (keys.ArrowRight) movement.x += 1; if (movement.length()) { movement.normalize(); const forward = new THREE.Vector3(Math.sin(player.yaw), 0, -Math.cos(player.yaw)); const right = new THREE.Vector3(Math.cos(player.yaw), 0, Math.sin(player.yaw)); const worldMovement = forward.multiplyScalar(-movement.z).add(right.multiplyScalar(movement.x)).multiplyScalar(7 * dt); movePlayer(worldMovement.x, worldMovement.z); } camera.position.x = player.x; camera.position.z = player.z; camera.position.y = 1.7; camera.rotation.y = player.yaw; camera.rotation.x = player.pitch;
  updateEnemy(dt); enemyShotTimer -= dt; if (enemy.alive && enemyShotTimer <= 0) { enemyShotTimer = 1.5 + Math.random() * 1.8; const distance = Math.hypot(player.x - enemy.x, player.z - enemy.z); if (distance < 24 && Math.random() > .25) { playerHealth -= 8; ui.damage.classList.add('flash'); setTimeout(() => ui.damage.classList.remove('flash'), 130); updateHUD(); if (playerHealth <= 0) endGame(false); } } for (let i = particles.length - 1; i >= 0; i--) { const p = particles[i]; p.life -= dt; p.position.addScaledVector(p.velocity, dt); p.velocity.y -= 5 * dt; if (p.life <= 0) { scene.remove(p); particles.splice(i,1); } }
}
function animate() { requestAnimationFrame(animate); update(); renderer.render(scene, camera); }
animate();

addEventListener('keydown', e => { keys[e.key] = true; if (e.code === 'Space') { e.preventDefault(); shoot(); } if (e.key.toLowerCase() === 'r') reload(); });
addEventListener('keyup', e => { keys[e.key] = false; });
ui.start.addEventListener('click', startGame);
renderer.domElement.addEventListener('click', () => { if (running) renderer.domElement.requestPointerLock(); });
addEventListener('mousemove', e => { if (document.pointerLockElement !== renderer.domElement || !running) return; player.yaw -= e.movementX * .0018; player.pitch = THREE.MathUtils.clamp(player.pitch - e.movementY * .0018, -1.25, 1.25); });
addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
