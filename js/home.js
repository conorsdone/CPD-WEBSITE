import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { AsciiEffect } from 'three/addons/effects/AsciiEffect.js';

// OPTIMIZATION: Separate background image loading from critical path
function loadFlyImages() {
    const promises = [];
    document.querySelectorAll("li.flyImage").forEach(li => {
        const bg = window.getComputedStyle(li).backgroundImage;
        if (bg && bg !== 'none') {
            const match = bg.match(/url\(["']?(.*?)["']?\)/);
            if (match && match[1]) {
                const img = new Image();
                promises.push(new Promise(res => {
                    img.onload = res;
                    img.onerror = res;
                    img.src = match[1];
                }));
            }
        }
    });
    return Promise.all(promises);
}

let asciiPaused = false;
let asciiInitialized = false;

// OPTIMIZATION: Make ASCII initialization lazy and deferred
function initAsciiScene() {
    if (asciiInitialized) return;
    asciiInitialized = true;

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
    effect.domElement.classList.add("ToggleAscii");
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

    // Mouse/Touch rotation - throttled with requestAnimationFrame
    let rotatePending = false;

    function updateModelRotation(x, y) {
        if (!model) return;
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

    window.addEventListener('mousemove', (event) => {
        if (!model || rotatePending) return;
        rotatePending = true;
        requestAnimationFrame(() => {
            updateModelRotation(event.clientX, event.clientY);
            rotatePending = false;
        });
    });

    window.addEventListener('touchmove', (event) => {
        if (!model || rotatePending || event.touches.length < 1) return;
        const touch = event.touches[0];
        rotatePending = true;
        requestAnimationFrame(() => {
            updateModelRotation(touch.clientX, touch.clientY);
            rotatePending = false;
        });
    });

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

    // Animation loop with frame skipping
    let frame = 0;

    function animate() {
        requestAnimationFrame(animate);
        if (asciiPaused) return;

        if (++frame % 4 !== 0) return; // frame skip for performance
        if (model) model.position.y = Math.sin(Date.now() * 0.0015) * 0.3;
        effect.render(scene, camera);
    }
    animate();
}

document.addEventListener("DOMContentLoaded", () => {
    const preloader = document.getElementById('preloader');
    const base = 'https://res.cloudinary.com/dcouze1qx/image/upload/f_auto,q_auto:best';
    const modal = document.getElementById("imageModal");
    const candidateWidths = [800, 1200, 1600, 2400];

    // Estimate flyImage width from viewport
    function estimateFlyImageWidth(numImagesPerRow = 3, gapPx = 10) {
        const viewportWidth = window.innerWidth;
        return (viewportWidth - gapPx * (numImagesPerRow - 1)) / numImagesPerRow;
    }

    // Pick optimal Cloudinary width
    function getOptimalWidthFromViewport(numImagesPerRow = 3, gapPx = 10) {
        const flyWidth = estimateFlyImageWidth(numImagesPerRow, gapPx);
        const dpr = window.devicePixelRatio || 1;
        const requiredPx = flyWidth * dpr;
        const selected = candidateWidths.find(w => w >= requiredPx) || candidateWidths[candidateWidths.length - 1];
        return selected;
    }

    // Lazy-load `li.flyImage` backgrounds and videos when they enter the viewport.
    // This reduces initial network load and improves LCP.
    const flyItems = document.querySelectorAll("li.flyImage");

    function createVideoForItem(li, id) {
        const videoEl = document.createElement('video');
        videoEl.autoplay = true;
        videoEl.muted = true;
        videoEl.loop = true;
        videoEl.playsInline = true;
        videoEl.style.width = '100%';
        videoEl.style.height = '100%';
        videoEl.style.objectFit = 'cover';

        const sourceEl = document.createElement('source');
        sourceEl.src = `https://res.cloudinary.com/dcouze1qx/video/upload/v1754667301/${id}.mp4`;
        sourceEl.type = 'video/mp4';
        videoEl.appendChild(sourceEl);

        li.innerHTML = '';
        li.appendChild(videoEl);
    }

    function loadFlyItem(li) {
        const type = li.getAttribute("data-type");
        const id = li.getAttribute("data-image-url");
        if (!id) return;
        if (type === 'video') {
            createVideoForItem(li, id);
            return;
        }
        const selectedWidth = getOptimalWidthFromViewport(3, 10);
        li.style.backgroundImage = `url(${base},w_${selectedWidth}/${id})`;
        li.classList.add('bg-loaded');
    }

    if ('IntersectionObserver' in window) {
        const io = new IntersectionObserver((entries, obs) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    loadFlyItem(entry.target);
                    obs.unobserve(entry.target);
                }
            });
        }, { root: null, rootMargin: '400px', threshold: 0.01 });

        flyItems.forEach(li => io.observe(li));
    } else {
        // Fallback: eager load everything
        flyItems.forEach(li => loadFlyItem(li));
    }

    // Background preloader: load all flyImage image URLs in the background
    // (used to preserve the previous behavior of preloading while deferring
    // heavy work like ASCII init until idle time).
    function preloadFlyImagesBackground() {
        const promises = [];
        document.querySelectorAll('li.flyImage').forEach(li => {
            const type = li.getAttribute('data-type');
            const id = li.getAttribute('data-image-url');
            if (!id || type === 'video') return;
            const selectedWidth = getOptimalWidthFromViewport(3, 10);
            const url = `${base},w_${selectedWidth}/${id}`;
            const img = new Image();
            promises.push(new Promise(res => {
                img.onload = res; img.onerror = res; img.src = url;
            }));
        });
        return Promise.all(promises);
    }

    // CRITICAL FIX: Hide preloader IMMEDIATELY - don't wait for background images!
    // This lets logo show fast which improves LCP
    preloader.classList.add('hidden');

    // Load background images in the background (non-blocking)
    // Then init ASCII after they finish
    loadFlyImages().then(() => {
        // Safari fallback for requestIdleCallback
        if (window.requestIdleCallback) {
            requestIdleCallback(() => {
                initAsciiScene();
            }, { timeout: 2000 });
        } else {
            setTimeout(() => {
                initAsciiScene();
            }, 100);
        }
    });

    // Click handler to open modal
    document.querySelectorAll(".marquee__content").forEach((marquee) => {
        marquee.addEventListener("click", (event) => {
            const item = event.target.closest(".flyImage");
            if (!item) return;

            const bgImage = window.getComputedStyle(item).backgroundImage.match(/url\(["']?(.*?)["']?\)/);
            const imageSrc = bgImage ? bgImage[1] : "";
            openModal(imageSrc, "", item);
        });
    });

    function openModal(imageSrc, description, item) {
        const modal = document.getElementById("imageModal");
        const modalImg = document.getElementById("modalImg");
        const modalText = document.getElementById("modalText");
        const elementsToMove = document.querySelectorAll(".home, .enter, .cpd-logo");
        const enterElement = document.querySelector(".enter");
        const ToggleAscii = document.querySelector(".ToggleAscii");

        if (ToggleAscii) {
            ToggleAscii.style.contentVisibility = "hidden";
            asciiPaused = true;
        }

        // Pause all marquee videos
        document.querySelectorAll('.flyImage video').forEach(video => {
            video.pause();
        });

        // Cancel any previous high-res preload
        if (modalImg.highResLoader) {
            modalImg.highResLoader.onload = null;
            modalImg.highResLoader = null;
        }

        const type = item.getAttribute("data-type");
        const id = item.getAttribute("data-image-url");


        elementsToMove.forEach(el => el.classList.add("logo-transition"));
        if (enterElement) {
            enterElement.classList.add("logo-transition");
            enterElement.style.animation = "fadeOut 0.5s ease-in-out forwards";
        }

        if (type === "video" && id) {
            // Remove any existing modal media
            modalImg.style.display = "none";
            let existingVideo = modal.querySelector('video');
            if (existingVideo) existingVideo.remove();

            const video = document.createElement('video');
            video.src = `https://res.cloudinary.com/dcouze1qx/video/upload/v1754667301/${id}.mp4`;
            video.autoplay = true;
            video.muted = true;
            video.loop = true;
            video.playsInline = true;
            video.controls = false;

            video.style.maxWidth = '80%';
            video.style.maxHeight = '80%';
            video.style.borderRadius = '25px';
            video.style.opacity = '0';
            video.style.animation = 'fadeIn 0.3s ease-in-out forwards';

            modal.appendChild(video);

            modalText.textContent = description;
            modal.style.display = "flex";
            return;
        } else {
            // Image: progressive loading
            const viewportWidth = window.innerWidth;
            const numImagesPerRow = 3;
            const gapPx = 10;
            const flyWidth = (viewportWidth - gapPx * (numImagesPerRow - 1)) / numImagesPerRow;
            const dpr = window.devicePixelRatio || 1;
            const requiredPx = flyWidth * dpr;
            const lowerResWidth = candidateWidths.find(w => w >= requiredPx) || candidateWidths[candidateWidths.length - 1];

            const publicIdMatch = imageSrc.match(/\/([^/]+)$/);
            const publicId = publicIdMatch ? publicIdMatch[1] : "";
            const lowResUrl = `${base},w_${lowerResWidth}/${publicId}`;

            modalImg.style.display = "block";
            modalImg.style.animation = "none";
            modalImg.offsetHeight;
            modalImg.src = lowResUrl;
            modalText.textContent = description;
            modal.style.display = "flex";
            modalImg.style.animation = "fadeIn 0.3s ease-in-out forwards";

            // Preload high-res 2400w
            const highResUrl = `${base},w_2400/${publicId}`;
            const imgLoader = new Image();
            modalImg.highResLoader = imgLoader;
            imgLoader.onload = () => {
                if (modal.style.display === "flex") {
                    modalImg.src = highResUrl;
                    modalImg.style.animation = "fadeIn 0.3s ease-in-out forwards";
                }
            };
            imgLoader.src = highResUrl;
        }
    }

    function closeModal() {
        const modal = document.getElementById("imageModal");
        const modalImg = document.getElementById("modalImg");
        const ToggleAscii = document.querySelector(".ToggleAscii");
        // Stop and remove modal video if present
        const modalVideo = modal.querySelector('video');
        if (modalVideo) {
            modalVideo.style.animation = 'fadeOut 0.3s ease-in-out forwards';

            setTimeout(() => {
                modalVideo.pause();
                modalVideo.src = '';
                modalVideo.load();
                modalVideo.remove();
            }, 300);
        }

        // Resume marquee videos
        document.querySelectorAll('.flyImage video').forEach(video => {
            video.play();
        });

        if (ToggleAscii) {
            ToggleAscii.style.contentVisibility = "visible";
            asciiPaused = false;
        }

        // Remove the high-res reference
        modalImg.src = '';
        if (modalImg.highResLoader) {
            modalImg.highResLoader.onload = null;
            modalImg.highResLoader = null;
        }

        modal.style.display = "none";
        modalImg.style.animation = "fadeOut 1s ease-in-out forwards";

        const elementsToMove = document.querySelectorAll(".home, .enter, .cpd-logo");
        const enterElement = document.querySelector(".enter");
        elementsToMove.forEach(el => el.classList.remove("logo-transition"));
        if (enterElement) {
            enterElement.classList.remove("logo-transition");
            enterElement.style.animation = "fadeIn 0.5s ease-in-out forwards";
        }
    }

    modal.addEventListener("click", (event) => {
        if (event.target === modal) closeModal();
    });

    // Make closeModal globally accessible
    window.closeModal = closeModal;
});