import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { AsciiEffect } from 'three/addons/effects/AsciiEffect.js';

// Get canvas
var canvas = document.getElementsByTagName("canvas")[0];

// Create scene, camera, and renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(35,
    window.innerWidth / window.innerHeight, 0.1, 1000);

var renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true,
    alpha: true
});
renderer.setSize(window.innerWidth, window.innerHeight);

// Set up ASCII effect
const effect = new AsciiEffect(renderer, ' ***********█', { invert: false });
effect.setSize(window.innerWidth, window.innerHeight);
effect.domElement.style.color = 'yellow';
effect.domElement.style.zIndex = '10000';
effect.domElement.style.position = 'absolute';
effect.domElement.style.top = '0';
effect.domElement.classList.add("AsciiCanvas");
effect.domElement.style.pointerEvents = 'none';
document.body.appendChild(effect.domElement);

effect.domElement.addEventListener('click', () => {
    togglePageInvert();
});

// Load model
const loader = new GLTFLoader();
let model;
loader.load('./assets/super_mario_star.glb', function (gltf) {
    model = gltf.scene;
    scene.add(model);
    model.scale.set(0.4, 0.4, 0.4);
    model.position.set(0, 0, -5);
}, undefined, function (error) {
    console.error(error);
});

// Set camera pos
if (window.innerWidth < 600) {
    camera.position.set(0, 3.5, 10);
} else {
    camera.position.set(6, -3, 10);
}

// Mouse rotation
// Mouse rotation throttled with requestAnimationFrame
let rotatePending = false;
window.addEventListener('mousemove', (event) => {
    if (!model || rotatePending) return;
    rotatePending = true;
    requestAnimationFrame(() => {
        updateModelRotation(event.clientX, event.clientY);
        rotatePending = false;
    });
});

// Touch rotation throttled with requestAnimationFrame
window.addEventListener('touchmove', (event) => {
    if (!model || rotatePending || event.touches.length < 1) return;
    const touch = event.touches[0];
    rotatePending = true;
    requestAnimationFrame(() => {
        updateModelRotation(touch.clientX, touch.clientY);
        rotatePending = false;
    });
});

// Extracted rotation logic
function updateModelRotation(x, y) {
    const modelCenter = new THREE.Vector3();
    model.getWorldPosition(modelCenter);

    const screenCenter = modelCenter.project(camera);
    screenCenter.x = (screenCenter.x + 1) / 2 * window.innerWidth;
    screenCenter.y = -(screenCenter.y - 1) / 2 * window.innerHeight;

    const diffX = (x - screenCenter.x) / window.innerWidth * 2;
    const diffY = (y - screenCenter.y) / window.innerHeight * 2;
    const sensitivity = window.innerWidth < 768 ? 2 : 1;

    model.rotation.y = diffX * Math.PI / 4 * sensitivity;
    model.rotation.x = diffY * Math.PI / 4 * sensitivity;
}

// Raycasting for model clicks
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
window.addEventListener('click', (event) => {
    if (!model) return;
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(model, true);
    if (intersects.length > 0) togglePageInvert();
});

// Function to toggle page inversion
function togglePageInvert() {
    document.body.classList.toggle('inverted');
}

// Resize handling
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    effect.setSize(window.innerWidth, window.innerHeight);
});

// Animation loop
let frame = 0;
let asciiPaused = false; // new flag

function animate() {
    requestAnimationFrame(animate);
    if (asciiPaused) return; // skip rendering when paused

    if (++frame % 4 !== 0) return; // frame skip
    if (model) model.position.y = Math.sin(Date.now() * 0.0015) * 0.3;
    effect.render(scene, camera);
}
animate();

// Call it **after page load or preloader completion**
document.addEventListener('DOMContentLoaded', () => {
    // Show content, then initialize heavy 3D scene
    document.getElementById('content').style.display = 'block';
    initThreeJs();
});