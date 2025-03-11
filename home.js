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

// Append ASCII effect's DOM to the body, not the renderer's DOM
document.body.appendChild(effect.domElement);

effect.domElement.addEventListener('click', () => {
    togglePageInvert();
});

// Load the GLTF model
const loader = new GLTFLoader();
let model;

loader.load('/CPD-WEBSITE/assets/super_mario_star.glb', function (gltf) {
    model = gltf.scene;
    scene.add(model);
    
    // Scale down the model if it's too large
    model.scale.set(0.4, 0.4, 0.4);
    
    // Position the model slightly away from the camera
    model.position.set(0, 0, -5);
}, undefined, function (error) {
    console.error(error);
});

// Set initial camera position further back
if (window.innerWidth < 600) {  
    // Mobile view: adjust position
    camera.position.set(0, 3.5, 10);
} else {  
    // Desktop view: default position
    camera.position.set(7, -3, 10);
}
// camera.position.set(0, 0, 10);

// Mouse move event listener to rotate the model
window.addEventListener('mousemove', (event) => {
    if (!model) return;
    
    // Normalize mouse position (-1 to 1)
    let mouseX = (event.clientX / window.innerWidth) * 2 - 1;
    let mouseY = -(event.clientY / window.innerHeight) * 2 + 1;
    
    // Convert to world coordinates
    let vector = new THREE.Vector3(mouseX, mouseY, 0.5);
    vector.unproject(camera);
    let dir = vector.sub(camera.position).normalize();
    let target = camera.position.clone().add(dir.multiplyScalar(10));
    
    // Make model look at the target
    model.lookAt(target);
});

window.addEventListener('touchmove', (event) => {
    if (!model || event.touches.length < 1) return;

    let touch = event.touches[0];

    // Normalize touch position (-1 to 1)
    let touchX = (touch.clientX / window.innerWidth) * 2 - 1;
    let touchY = -(touch.clientY / window.innerHeight) * 2 + 1;

    // Convert to world coordinates
    let vector = new THREE.Vector3(touchX, touchY, 0.5);
    vector.unproject(camera);
    let dir = vector.sub(camera.position).normalize();
    let target = camera.position.clone().add(dir.multiplyScalar(10));

    // Make model look at the target
    model.lookAt(target);
});

// Raycasting for detecting clicks on the model
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// window.addEventListener('mousemove', (event) => {
//     if (!model) return;
    
//     mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
//     mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
//     raycaster.setFromCamera(mouse, camera);
//     const intersects = raycaster.intersectObject(model, true);
    
//     if (intersects.length > 0) {
//         document.body.style.cursor = 'pointer';
//     } else {
//         document.body.style.cursor = 'default';
//     }
// });

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
        model.position.y = Math.sin(Date.now() * 0.0015) * 0.3;
    }
    
    // Render the scene with the effect
    effect.render(scene, camera);
}
animate();
