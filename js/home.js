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
effect.setSize(window.innerWidth, window.innerHeight + 20);
effect.domElement.style.color = 'yellow';
effect.domElement.style.zIndex = '10000';
effect.domElement.style.position = 'absolute';
effect.domElement.style.top = '0';
effect.domElement.classList.add("AsciiCanvas");
effect.domElement.style.pointerEvents = 'none';

// Append ASCII effect's DOM to the body
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

    // Scale down
    model.scale.set(0.4, 0.4, 0.4);

    // Position model
    model.position.set(0, 0, -5);
}, undefined, function (error) {
    console.error(error);
});

// Set camera pos
if (window.innerWidth < 600) {
    // Mobile view
    camera.position.set(0, 3.5, 10);
} else {
    // Desktop view
    camera.position.set(6, -3, 10);
}

window.addEventListener('mousemove', (event) => {
    if (!model) return;

    // get model center
    let modelCenter = new THREE.Vector3();
    model.getWorldPosition(modelCenter);

    // get screen center
    let screenCenter = modelCenter.project(camera);
    screenCenter.x = (screenCenter.x + 1) / 2 * window.innerWidth;
    screenCenter.y = -(screenCenter.y - 1) / 2 * window.innerHeight;

    // get mouse pos
    let mouseX = event.clientX;
    let mouseY = event.clientY;

    let diffX = (mouseX - screenCenter.x) / window.innerWidth * 2;
    let diffY = (mouseY - screenCenter.y) / window.innerHeight * 2;

    // sensitivity for mobile
    let sensitivity = window.innerWidth < 768 ? 2 : 1;

    // rotate model based on diifX and Y
    model.rotation.y = diffX * Math.PI / 4 * sensitivity;
    model.rotation.x = diffY * Math.PI / 4 * sensitivity;
});


// add event listener for mobile
window.addEventListener('touchmove', (event) => {
    if (!model || event.touches.length < 1) return;

    let touch = event.touches[0];

    let modelCenter = new THREE.Vector3();
    model.getWorldPosition(modelCenter);

    let screenCenter = modelCenter.project(camera);
    screenCenter.x = (screenCenter.x + 1) / 2 * window.innerWidth;
    screenCenter.y = -(screenCenter.y - 1) / 2 * window.innerHeight;

    let touchX = touch.clientX;
    let touchY = touch.clientY;

    let diffX = (touchX - screenCenter.x) / window.innerWidth * 2;
    let diffY = (touchY - screenCenter.y) / window.innerHeight * 2;

    let sensitivity = window.innerWidth < 768 ? 2 : 1;

    model.rotation.y = diffX * Math.PI / 4 * sensitivity;
    model.rotation.x = diffY * Math.PI / 4 * sensitivity;
});

// Raycasting for detecting clicks on the model
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// if click detected toggle invert
window.addEventListener('click', (event) => {
    if (!model) return;

    // get mouse position
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(model, true);

    if (intersects.length > 0) {
        togglePageInvert();
    }
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
function animate() {
    requestAnimationFrame(animate);

    // get model to move up and down
    if (model) {
        model.position.y = Math.sin(Date.now() * 0.0015) * 0.3;
    }

    // Render the scene with the effect
    effect.render(scene, camera);
}

animate();

document.addEventListener("DOMContentLoaded", function () {
    const base = 'https://res.cloudinary.com/dcouze1qx/image/upload/f_auto,q_auto/';

    const modal = document.getElementById("imageModal");
    const modalImg = document.getElementById("modalImg");
    const modalText = document.getElementById("modalText");
    const elementsToMove = document.querySelectorAll(".home, .enter, .cpd-logo");
    const enterElement = document.querySelector(".enter");

    // Func to detect actual mobile devices
    function isMobileDevice() {
        const userAgent = navigator.userAgent.toLowerCase();
        const mobileKeywords = [
            'android', 'iphone', 'ipad', 'ipod', 'blackberry',
            'windows phone', 'mobile', 'webos', 'opera mini'
        ];

        const hasMobileUA = mobileKeywords.some(keyword => userAgent.includes(keyword));
        const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        const hasSmallScreen = window.screen.width <= 1000 || window.screen.height <= 1000;

        return hasMobileUA || (hasSmallScreen && hasTouch);
    }

    document.querySelectorAll("li").forEach((li) => {
        const type = li.getAttribute("data-type");
        const id = li.getAttribute("data-image-url");

        // console.log('Processing LI:', { type, id }); // Debug log

        if (type === null && id) { // Make sure id exists
            const isMobile = isMobileDevice();

            let imageUrl;

            if (isMobile) {
                // Mobile devices, 1200px only
                imageUrl = `${base}w_1200/${id}`;
                li.style.backgroundImage = `url(${imageUrl})`;
                // console.log(`LI Mobile: ${id} - 1200px`);
            } else {
                // Mobile devices, 2400px only
                imageUrl = `${base}w_2400/${id}`;
                li.style.backgroundImage = `url(${imageUrl})`;
                // console.log(`LI Desktop: ${id} - 2400px`);
            }

            if (li.hasAttribute('alt')) {
                li.alt = li.alt || id.split('_')[0].replace('-', ' ');
            }

        } else if (type === "video" && id) {
            // video handler
            const videoUrl = `https://res.cloudinary.com/dcouze1qx/video/upload/v1754667301/${id}.mp4`;
            li.style.backgroundImage = `url(${videoUrl})`;
        }
    });

    // Attach event listener to both marquee containers
    document.querySelectorAll(".marquee__content").forEach((marquee) => {
        marquee.addEventListener("click", function (event) {
            const item = event.target.closest(".flyImage");
            if (!item) return;
            // Ignore clicks outside of image container

            const bgImage = window.getComputedStyle(item).backgroundImage.match(/url\(["']?(.*?)["']?\)/);
            const imageSrc = bgImage ? bgImage[1] : "";

            openModal(imageSrc);
        });
    });

    function openModal(imageSrc, description) {
        modal.style.display = "flex";
        modalImg.src = imageSrc;
        modalText.textContent = description;
        modalImg.style.animation = "fadeIn 0.5s ease-in-out forwards";

        elementsToMove.forEach(el => el.classList.add("logo-transition"));
        if (enterElement) {
            enterElement.classList.add("logo-transition");
            enterElement.style.animation = "fadeOut 0.5s ease-in-out forwards";
        }
    }

    function closeModal() {
        modal.style.display = "none";
        modalImg.style.animation = "fadeOut 1s ease-in-out forwards";
        elementsToMove.forEach(el => el.classList.remove("logo-transition"));
        if (enterElement) {
            enterElement.classList.remove("logo-transition");
            enterElement.style.animation = "fadeIn 0.5s ease-in-out forwards";
        }
    }

    // Close modal when clicking outside img
    modal.addEventListener("click", function (event) {
        closeModal();
    });
});

$(document).mousemove(function (e) {
    $("#image").css({ left: e.pageX, top: e.pageY });
});
