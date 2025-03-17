import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { AsciiEffect } from 'three/addons/effects/AsciiEffect.js';

// Get the first canvas element
var canvas = document.getElementsByTagName("canvas")[0];

// Create scene, camera, and renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(35, 
    window.innerWidth/window.innerHeight, 0.1, 1000);

var renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true,
    alpha: true
});
renderer.setSize(window.innerWidth, window.innerHeight);

// Set up the ASCII effect
const effect = new AsciiEffect(renderer, ' ***********█', { invert: false });
effect.setSize(window.innerWidth, window.innerHeight+20);
effect.domElement.style.color = 'yellow';
effect.domElement.style.zIndex = '10000';
effect.domElement.style.position = 'absolute';
effect.domElement.style.top = '0';
effect.domElement.classList.add("AsciiCanvas");
effect.domElement.style.pointerEvents = 'none';
effect.domElement.style.rotate = '20deg';

// Append ASCII effect's DOM to the body, not the renderer's DOM
document.body.appendChild(effect.domElement);

effect.domElement.addEventListener('click', () => {
    togglePageInvert();
});

// Load the GLTF model
const loader = new GLTFLoader();
let model;

loader.load('./assets/super_mario_star.glb', function (gltf) {
    model = gltf.scene;
    scene.add(model);
    
    // Scale down the model if it's too large
    model.scale.set(0.3, 0.3, 0.3);
    
    // Position the model slightly away from the camera
    model.position.set(0, 0, -5);
}, undefined, function (error) {
    console.error(error);
});

// Set initial camera position further back
if (window.innerWidth < 541) {  
    // Mobile view: adjust position
    camera.position.set(-0.35, -2.6, 8);
} else {  
    // Desktop view: default position
    camera.position.set(7, -3, 10);
}
// camera.position.set(0, 0, 10);

// Mouse move event listener to rotate the model
// Mouse move event listener for larger rotation effect
window.addEventListener('mousemove', (event) => {
    if (!model) return;

    // Calculate the center of the model in 2D screen space
    let modelCenter = new THREE.Vector3();
    model.getWorldPosition(modelCenter); // Get the model's world position

    // Project the model's world position into 2D screen space
    let screenCenter = modelCenter.project(camera);
    screenCenter.x = (screenCenter.x + 1) / 2 * window.innerWidth;
    screenCenter.y = -(screenCenter.y - 1) / 2 * window.innerHeight;

    // Get the mouse position in 2D screen space
    let mouseX = event.clientX;
    let mouseY = event.clientY;

    // Normalize mouse position relative to the model's screen center
    let diffX = (mouseX - screenCenter.x) / window.innerWidth * 2;
    let diffY = (mouseY - screenCenter.y) / window.innerHeight * 2;

    // Adjust sensitivity for mobile or smaller screens
    let sensitivity = window.innerWidth < 768 ? 0.2 : 1;

    let mobileoffset = diffX * Math.PI / 4 * sensitivity;
    let mobileoffset2 = diffY * Math.PI / 4 * sensitivity;
    // Apply the rotation to the model based on the difference in mouse position
    model.rotation.y = mobileoffset; // Horizontal rotation (Y-axis)
    
    // **Flip the vertical rotation (X-axis) to fix the up/down issue**
    model.rotation.x = mobileoffset2; // Vertical rotation (X-axis)
    model.rotation.z = 0; // Vertical rotation (X-axis)
});


window.addEventListener('touchmove', (event) => {
    if (!model || event.touches.length < 1) return;

    let touch = event.touches[0];

    // Calculate the center of the model in 2D screen space
    let modelCenter = new THREE.Vector3();
    model.getWorldPosition(modelCenter); // Get the model's world position

    // Project the model's world position into 2D screen space
    let screenCenter = modelCenter.project(camera);
    screenCenter.x = (screenCenter.x + 1) / 2 * window.innerWidth;
    screenCenter.y = -(screenCenter.y - 1) / 2 * window.innerHeight;

    // Get the touch position in 2D screen space
    let touchX = touch.clientX;
    let touchY = touch.clientY;

    // Normalize touch position relative to the model's screen center
    let diffX = (touchX - screenCenter.x) / window.innerWidth * 2;
    let diffY = (touchY - screenCenter.y) / window.innerHeight * 2;

    // Adjust sensitivity for mobile or smaller screens
    let sensitivity = window.innerWidth < 768 ? 2 : 1;

    // Apply the rotation to the model based on the difference in touch position
    model.rotation.y = diffX * Math.PI / 4 * sensitivity; // Horizontal rotation (Y-axis)

    // **Flip the vertical rotation (X-axis) to fix the up/down issue**
    model.rotation.x = diffY * Math.PI / 4 * sensitivity; // Vertical rotation (X-axis)
});

// Raycasting for detecting clicks on the model
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

window.addEventListener('click', (event) => {
    if (!model) return;
    
    // Calculate mouse position in normalized device coordinates (-1 to +1)
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(model, true);
    
    if (intersects.length > 0) {
        // Call the togglePageInvert function when the star is clicked
        togglePageInvert();
    }
});

// Function to toggle page inversion
function togglePageInvert() {
    document.body.classList.toggle('inverted');
}

// Resize handling to adjust the canvas and effect size
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    effect.setSize(window.innerWidth, window.innerHeight);
});

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    
    if (model) {
        // Apply the bouncing effect with floor collision
        model.position.y = Math.sin(Date.now() * 0.006) * 0.06;
    }
    
    // Render the scene with the effect
    effect.render(scene, camera);
}
animate();
