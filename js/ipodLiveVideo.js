
// Three.js imports
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { MathUtils } from 'https://unpkg.com/three@0.160.0/build/three.module.js';

//check if browser is in landscape or portrait
const orientation = window.innerWidth > window.innerHeight ? "landscape" : "portrait";
let extraRotation;
if (orientation === "portrait") {
    extraRotation = 0;
} else {
    extraRotation = 180;
}

// Config values
// Camera beginning values
const CAMERA_CONFIG = {
    fov: 90,
    near: 0.1,
    far: 50,
    position: { x: 0, y: -50, z: 0 },
    // position: { x: 0.489, y: -50.25, z: -0.5 },
    rotation: { x: -30, y: -45, z: 0 }
};

// Model values
const MODEL_CONFIG = {
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 25 - extraRotation, z: 0 },
    // rotation: { x: -17, y: 95.6, z: -14 }
    scale: 5,
    animationRotationSpeed: 1
};

// On load target values for camera
const FOCUS_TARGET_CONFIG = {
    position: { x: 0, y: 0, z: 0 },
    // position: { x: 0.489, y: -0.749, z: -0.5 },
    rotation: { x: -30, y: -45, z: 0 },
    // rotation: { x: -123.2, y: 26.6, z: 145.7 },
    distance: 1
};

// Screen values
const SCREEN_CONFIG = {
    width: 400,
    height: 330,
    geometry: { width: 0.08, height: 0.066 },
    position: { x: 0.0139, y: 0.0545, z: 0 },
    rotation: { x: 0, y: Math.PI / 2, z: 0 },
    radius: 20
};

// Animation values
const ANIMATION_CONFIG = {
    focusDuration: 3.0,
    pauseTimeout: 60 * 1000
};

// Environment textures array
const ENVIRONMENT_TEXTURES = [
    'assets/TrainStation.hdr',
    'assets/pedestrian_overpass_4k.hdr',
    'assets/little_paris_under_tower_4k.hdr',
    'assets/kloppenheim_02_4k.hdr',
    'assets/royal_esplanade_1k.hdr',
    'assets/lakeside_night_4k.hdr',
    'assets/meadow_4k.hdr'
];

// Fallback track data
const FAVOURITE_TRACK = {
    trackName: 'BUFFALO (feat. Shane Powers)',
    artistName: 'Tyler, The Creator & Shane Powers',
    albumName: 'CHERRY BOMB',
    albumImageUrl: 'assets/cherrybombCover.jpg',
    progressMs: 125000,
    durationMs: 160000,
    isPlaying: false,
    trackUrl: 'https://neal.fun'
};

// Global variables
// Three.js core objects
let camera, scene, model, controls, renderer;
let screenTexture, ctx, canvas, screenMesh = null;

// Animation and focus
let isFocusing = false;
let focusStartTime = 2;
let startCameraPosition, endCameraPosition;
let startCameraRotation, endCameraRotation;
let startCameraTarget;

// Model rotation
let isRotationPaused = false;
let pausedAtTime = 0;
let totalPausedDuration = 0;

// Animation + rotation
let animationRotationY = 0;
let baseModelRotation = { x: 0, y: 0, z: 0 }; // Base rotation from sliders

// UI control, renamed variables, attached to sliders
let modelRotX = MODEL_CONFIG.rotation.x;
let modelRotY = MODEL_CONFIG.rotation.y;
let modelRotZ = MODEL_CONFIG.rotation.z;
let cameraFov = CAMERA_CONFIG.fov;

// Spotify and screen
let currentTrackUrl = '';
let pausedStartTime = null;

// Environment randomization for onLoad
let currentEnvironmentIndex = Math.floor(THREE.MathUtils.randFloat(0, ENVIRONMENT_TEXTURES.length));

// Reusable objects
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const clock = new THREE.Clock();
const hdrLoader = new RGBELoader();

// Util functions
// Debounce for slider performance
function debounce(fn, delay = 1) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn.apply(this, args), delay);
    };
}

// Smooth easing function
function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// Environment mgmt
// Load environment texture
function loadEnvironmentTexture(index) {
    const texturePath = ENVIRONMENT_TEXTURES[index];

    hdrLoader.load(texturePath, function (texture) {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        scene.environment = texture;
        scene.background = texture;
        console.log(`Environment set to: ${texturePath}`);
    });
}

// Spotify API fetch (uses netlify environment variables)
// Print values to ipod screen
// Fetch the currently playing track from spotify
async function fetchNowPlaying() {
    try {
        const response = await fetch('/.netlify/functions/getCurrentTrack');
        const data = await response.json();

        // Validate the response from spotify api
        const isValidTrack = data && data.name && data.artists;

        if (isValidTrack) {
            const mappedTrackInfo = {
                trackName: data.name,
                artistName: data.artists,
                albumName: data.album,
                albumImageUrl: data.album_image,
                progressMs: data.progress_ms,
                durationMs: data.duration_ms,
                isPlaying: data.is_playing,
                trackUrl: data.track_url
            };

            // if song is playing, update the screen
            if (data.is_playing) {
                pausedStartTime = null;
                updateScreen(mappedTrackInfo);
            } else {
                if (!pausedStartTime) pausedStartTime = Date.now();
                const elapsed = Date.now() - pausedStartTime;
                const trackToShow = (elapsed >= ANIMATION_CONFIG.pauseTimeout) ? FAVOURITE_TRACK : mappedTrackInfo;
                updateScreen(trackToShow);
            }
        } else {
            pausedStartTime = null;
            updateScreen(FAVOURITE_TRACK);
        }
    } catch (error) {
        console.error('Error fetching track info:', error.message || error);
        pausedStartTime = null;
        updateScreen(FAVOURITE_TRACK);
    }
}

// Screen rendering fucntions
// Update the screen with track information
function drawRoundedRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}

// Update screen with track info
function updateScreen(trackInfo) {
    if (!canvas || !ctx) {
        console.error('Canvas or ctx is not initialized');
        return;
    }

    // declare variables for track info
    const { trackName, artistName, albumName, progressMs, durationMs } = trackInfo;

    // Clear bg with transparency
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const backgroundRadius = SCREEN_CONFIG.radius;
    ctx.save();

    // Create rounded rect
    drawRoundedRect(ctx, 0, 0, canvas.width, canvas.height, backgroundRadius);

    // Fill gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#111111');
    gradient.addColorStop(1, '#333333');
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.clip();

    // Load and map album cover
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = trackInfo.albumImageUrl || 'assets/cherrybombCover.jpg';

    img.onload = () => {
        drawAlbumCover(img);
        drawTrackInfo(trackName, artistName, albumName);
        drawProgressBar(progressMs, durationMs);
        drawBatteryIcon();
        drawPlayPauseButton(trackInfo.isPlaying);

        ctx.restore();

        // Update texture
        screenTexture.needsUpdate = true;
        currentTrackUrl = trackInfo.trackUrl;
    };

    img.onerror = (error) => {
        console.error('Failed to load album cover image:', error);
    };
}

// Draw album cover image on screen
function drawAlbumCover(img) {
    const imgSize = 120;
    const imgX = (canvas.width - imgSize) / 2;
    const imgY = 30;
    const radius = 15;

    // Draw rounded rectangle path (mask)
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(imgX + radius, imgY);
    ctx.lineTo(imgX + imgSize - radius, imgY);
    ctx.quadraticCurveTo(imgX + imgSize, imgY, imgX + imgSize, imgY + radius);
    ctx.lineTo(imgX + imgSize, imgY + imgSize - radius);
    ctx.quadraticCurveTo(imgX + imgSize, imgY + imgSize, imgX + imgSize - radius, imgY + imgSize);
    ctx.lineTo(imgX + radius, imgY + imgSize);
    ctx.quadraticCurveTo(imgX, imgY + imgSize, imgX, imgY + imgSize - radius);
    ctx.lineTo(imgX, imgY + radius);
    ctx.quadraticCurveTo(imgX, imgY, imgX + radius, imgY);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(img, imgX, imgY, imgSize, imgSize);
    ctx.restore();
}

// Draw track information on screen
function drawTrackInfo(trackName, artistName, albumName) {
    const imgSize = 120;
    const imgY = 30;

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';

    // Track name
    ctx.font = 'bold 18px Arial';
    ctx.fillText(trackName, canvas.width / 2, imgY + imgSize + 40);

    // Artist name
    ctx.font = '16px Arial';
    ctx.fillText(artistName, canvas.width / 2, imgY + imgSize + 70);

    // Album name
    ctx.font = '14px Arial';
    ctx.fillText('Album: ' + albumName, canvas.width / 2, imgY + imgSize + 95);
}

// Draw play/pause button on the screen if track is playing
function drawPlayPauseButton(isPlaying) {
    const iconX = 30;
    const iconY = 20;
    const iconSize = 20;

    ctx.fillStyle = '#ffffff';

    if (isPlaying) {
        // Pause button (two bars)
        ctx.fillRect(iconX, iconY, 5, iconSize);
        ctx.fillRect(iconX + 10, iconY, 5, iconSize);
    } else {
        // Play button (triangle)
        ctx.beginPath();
        ctx.moveTo(iconX, iconY);
        ctx.lineTo(iconX, iconY + iconSize);
        ctx.lineTo(iconX + 15, iconY + iconSize / 2);
        ctx.closePath();
        ctx.fill();
    }
}

// Draw progress bar on screen
function drawProgressBar(progressMs, durationMs) {
    const barWidth = canvas.width * 0.6;
    const barHeight = 8;
    const barX = (canvas.width - barWidth) / 2;
    const barY = canvas.height - 40;

    if (durationMs <= 0) return;

    const progress = Math.min(progressMs / durationMs, 1);

    // Background bar
    ctx.fillStyle = '#555555';
    ctx.fillRect(barX, barY, barWidth, barHeight);

    // Progress bar
    ctx.fillStyle = '#1DB954';
    ctx.fillRect(barX, barY, barWidth * progress, barHeight);
}

// Draw battery icon on screen
function drawBatteryIcon() {
    const batteryX = canvas.width - 50;
    const batteryY = 20;
    const batteryWidth = 30;
    const batteryHeight = 12;

    // Battery outline
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(batteryX, batteryY, batteryWidth, batteryHeight);

    // Battery terminal
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(batteryX + batteryWidth, batteryY + 3, 4, 6);

    // Battery level (70%)
    ctx.fillStyle = '#00ff00';
    ctx.fillRect(batteryX + 2, batteryY + 2, batteryWidth * 0.7 - 4, batteryHeight - 4);
}

function VideoRender(){
    video = document.getElementById('video');

        const texture = new THREE.VideoTexture(video);
        texture.colorSpace = THREE.SRGBColorSpace;

        const geometry = new THREE.PlaneGeometry(16, 9);
        geometry.scale(0.5, 0.5, 0.5);
        const material = new THREE.MeshBasicMaterial({ map: texture });

        const count = 64;
        const radius = 32;

        for (let i = 1, l = count; i <= l; i++) {

            const phi = Math.acos(- 1 + (2 * i) / l);
            const theta = Math.sqrt(l * Math.PI) * phi;

            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.setFromSphericalCoords(radius, phi, theta);
            mesh.lookAt(camera.position);
            scene.add(mesh);
        }

        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {

            const constraints = { video: { width: 1280, height: 720, facingMode: 'user' } };

            navigator.mediaDevices.getUserMedia(constraints).then(function (stream) {

                // apply the stream to the video element used in the texture

                video.srcObject = stream;
                video.play();

            }).catch(function (error) {

                console.error('Unable to access the camera/webcam.', error);

            });

        } else {

            console.error('MediaDevices interface not available.');

        }
    }

// Ui controls
// Setup slider with debounce
function setupSlider(id, onChange) {
    const slider = document.getElementById(id);
    onChange(slider.value);
    slider.addEventListener('input', debounce(e => onChange(e.target.value)));
}

function initializeSliders() {
    // Set sliders to match their configs
    document.getElementById("fovRange").value = CAMERA_CONFIG.fov;
    document.getElementById("rotateX").value = MODEL_CONFIG.rotation.x;
    document.getElementById("rotateY").value = MODEL_CONFIG.rotation.y;
    document.getElementById("rotateZ").value = MODEL_CONFIG.rotation.z;

    // Setup sliders with renamed variables
    setupSlider("rotateX", val => modelRotX = parseFloat(val));
    setupSlider("rotateY", val => modelRotY = parseFloat(val));
    setupSlider("rotateZ", val => modelRotZ = parseFloat(val));
    setupSlider("fovRange", val => cameraFov = parseFloat(val));
}

// Rotation controls
// Toggle rotation pause state
function toggleRotation() {
    const button = document.getElementById('pauseRotation');
    const currentTime = clock.getElapsedTime();

    if (isRotationPaused) {
        // Resume rotation, calculate how long it was paused
        const pauseDuration = currentTime - pausedAtTime;
        totalPausedDuration += pauseDuration;
        isRotationPaused = false;
        button.innerHTML = '⏸ Pause';
        button.title = 'Pause Rotation';
        console.log('Model rotation resumed');
    } else {
        // Pause rotation, store when it paused
        pausedAtTime = currentTime;
        isRotationPaused = true;
        button.innerHTML = '▶ Play';
        button.title = 'Resume Rotation';
        console.log('Model rotation paused');
    }
}

// focus on model (orignally screen, but now model)
function focusOnScreen() {
    if (!model) {
        console.error('Cannot focus: model not available');
        return;
    }

    // console.log('=== FOCUS DEBUG START ===');

    // Store current animation state to preserve it
    const currentAnimationY = animationRotationY;
    const wasRotationPaused = isRotationPaused;

    // console.log('BEFORE Updates:');
    // console.log('Camera Position:', camera.position.clone());
    // console.log('Camera Rotation (degrees):', {
    //   x: THREE.MathUtils.radToDeg(camera.rotation.x).toFixed(2),
    //   y: THREE.MathUtils.radToDeg(camera.rotation.y).toFixed(2),
    //   z: THREE.MathUtils.radToDeg(camera.rotation.z).toFixed(2)
    // });
    // console.log('Controls Target:', controls.target.clone());
    // console.log('Model Position:', model.position.clone());
    // console.log('Model Rotation (degrees):', {
    //   x: THREE.MathUtils.radToDeg(model.rotation.x).toFixed(2),
    //   y: THREE.MathUtils.radToDeg(model.rotation.y).toFixed(2),
    //   z: THREE.MathUtils.radToDeg(model.rotation.z).toFixed(2)
    // });
    // console.log('Model Scale:', model.scale.clone());
    // console.log('Rotation Paused:', isRotationPaused);
    // console.log('Animation Rotation Y:', currentAnimationY);
    // console.log('Slider values:', { modelRotX, modelRotY, modelRotZ });
    // console.log('Base model rotation:', baseModelRotation);

    // Temporarily pause animation to get stable model pos
    const wasAnimating = !isRotationPaused;
    if (wasAnimating) {
        isRotationPaused = true;
    }

    // Force matrix updates with current stable rotation
    model.updateMatrixWorld(true);

    // console.log('AFTER Matrix Updates:');
    // Get model world position instead of screen position
    const modelWorldPosition = new THREE.Vector3();
    model.getWorldPosition(modelWorldPosition);
    // console.log('Model World Position:', modelWorldPosition.clone());

    const modelLocalPosition = model.position.clone();
    // console.log('Model Local Position:', modelLocalPosition);

    const modelWorldQuaternion = model.getWorldQuaternion(new THREE.Quaternion());
    // console.log('Model World Quaternion:', modelWorldQuaternion);

    // Test different forward directions
    const directions = {
        'positive Z': new THREE.Vector3(0, 0, 1),
        'negative Z': new THREE.Vector3(0, 0, -1),
        'positive X': new THREE.Vector3(1, 0, 0),
        'negative X': new THREE.Vector3(-1, 0, 0),
        'positive Y': new THREE.Vector3(0, 1, 0),
        'negative Y': new THREE.Vector3(0, -1, 0)
    };

    // console.log('Testing different forward directions:');
    Object.entries(directions).forEach(([name, dir]) => {
        const testDir = dir.clone().applyQuaternion(modelWorldQuaternion).normalize();
        // console.log(`${name}:`, testDir);
    });

    // Test all directions and their world positions to find the best one
    // console.log('Testing camera positions for each direction:');
    const testPositions = {};
    Object.entries(directions).forEach(([name, dir]) => {
        const testDir = dir.clone().applyQuaternion(modelWorldQuaternion).normalize();
        const testPos = modelWorldPosition.clone().add(testDir.clone().multiplyScalar(0.8));
        testPositions[name] = { direction: testDir.clone(), position: testPos.clone() };
        // console.log(`${name} camera position:`, testPos);
    });

    // Use positive X direction (90 degrees left from negative Z)
    const modelForwardDirection = new THREE.Vector3(1, 0, 0); // 90 degrees left from negative Z
    modelForwardDirection.applyQuaternion(modelWorldQuaternion).normalize();
    // console.log('Chosen Forward Direction (positive X - 90° left):', modelForwardDirection);

    // Calculate camera position with startup focus distance
    const distance = FOCUS_TARGET_CONFIG.distance; // Use the same distance as startup focus
    endCameraPosition = modelWorldPosition.clone().add(modelForwardDirection.multiplyScalar(distance));
    // console.log('Calculated End Camera Position:', endCameraPosition.clone());

    // Calculate distances
    const currentDistance = camera.position.distanceTo(modelWorldPosition);
    const targetDistance = endCameraPosition.distanceTo(modelWorldPosition);
    // console.log('Current camera distance to model:', currentDistance.toFixed(3));
    // console.log('Target camera distance to model:', targetDistance.toFixed(3));

    // Verify the calculation makes sense
    if (targetDistance < 0.1 || targetDistance > 5) {
        console.warn('Suspicious target distance:', targetDistance);
    }

    // Set up the animation
    startCameraPosition = camera.position.clone();
    startCameraTarget = controls.target.clone();
    // console.log('Animation Start Position:', startCameraPosition);
    // console.log('Animation Start Target:', startCameraTarget);
    // console.log('Animation End Position:', endCameraPosition);
    // console.log('Animation Target (model position):', modelWorldPosition);

    // Set the focus target to the model position
    const targetPosition = modelWorldPosition.clone();

    // Load focus animation
    focusStartTime = performance.now() / 1000;
    isFocusing = true;

    // Store target position for animation
    window.focusTarget = targetPosition;

    // Restore animation state after calculation
    if (wasAnimating) {
        isRotationPaused = false;
    }

    console.log('Focus animation started');
    // console.log('=== FOCUS DEBUG END ===');
}

// Load focus function with targeted end camera position and rotation
function loadFocus(targetPosition, targetRotation, distance = 1) {
    if (!model || !camera || !controls) return;

    // Store current camera values
    startCameraPosition = camera.position.clone();
    startCameraTarget = controls.target.clone();
    startCameraRotation = camera.quaternion.clone();

    // Calculate end rotation
    endCameraRotation = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(
            THREE.MathUtils.degToRad(targetRotation.x),
            THREE.MathUtils.degToRad(targetRotation.y),
            THREE.MathUtils.degToRad(targetRotation.z),
            'XYZ'
        )
    );

    // Calculate position based on rotation and distance
    const direction = new THREE.Vector3(0, 0, -distance);
    direction.applyQuaternion(endCameraRotation);
    endCameraPosition = new THREE.Vector3(targetPosition.x, targetPosition.y, targetPosition.z).add(direction);

    focusStartTime = performance.now() / 1000;
    isFocusing = true;
    controls.target.set(targetPosition.x, targetPosition.y, targetPosition.z);
}

// Update functions
// Update scene on window resize
function onWindowResize() {
    const header = document.getElementById('header');
    const headerHeight = header ? header.offsetHeight : 0;

    camera.aspect = window.innerWidth / (window.innerHeight - headerHeight);
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight - headerHeight);
}

// Separate slider updates from animation updates
function updateModelAndCamera() {
    if (model) {
        // Store base rotation from sliders
        baseModelRotation.x = THREE.MathUtils.degToRad(modelRotX);
        baseModelRotation.y = THREE.MathUtils.degToRad(modelRotY);
        baseModelRotation.z = THREE.MathUtils.degToRad(modelRotZ);

        // Apply base rotation + animation rotation
        model.rotation.x = baseModelRotation.x;
        model.rotation.y = baseModelRotation.y + animationRotationY; // Combine slider and animation
        model.rotation.z = baseModelRotation.z;
    }

    // Update camera FOV
    if (camera.fov !== cameraFov) {
        camera.fov = cameraFov;
        camera.updateProjectionMatrix();
    }
}

// Mouse interactions
// Setup mouse interactions for screen mesh
function setupMouseInteractions() {
    const header = document.getElementById('header');
    const headerHeight = header ? header.offsetHeight : 0;

    // Click handler for screen interaction
    renderer.domElement.addEventListener('click', function (event) {
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -((event.clientY - headerHeight) / (window.innerHeight - headerHeight)) * 2 + 1;

        // Check if the click intersects with the screen mesh
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObject(screenMesh);

        // If there is an intersection, check the face normal
        if (intersects.length > 0) {
            const intersect = intersects[0];
            const normalMatrix = new THREE.Matrix3().getNormalMatrix(intersect.object.matrixWorld);
            const worldNormal = intersect.face.normal.clone().applyMatrix3(normalMatrix).normalize();
            const cameraDirection = camera.position.clone().sub(intersect.point).normalize();
            const dot = worldNormal.dot(cameraDirection);

            // Open track URL if clicking front face of screen
            if (dot > 0 && currentTrackUrl) {
                window.open(currentTrackUrl, '_blank');
            }
        }
    });

    // Mouse move handler for cursor changes
    renderer.domElement.addEventListener('mousemove', function (event) {
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -((event.clientY - headerHeight) / (window.innerHeight - headerHeight)) * 2 + 1;

        // Check if the mouse intersects with the screen mesh
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObject(screenMesh);

        // Change cursor style based on intersection
        if (intersects.length > 0) {
            const intersect = intersects[0];
            const normalMatrix = new THREE.Matrix3().getNormalMatrix(intersect.object.matrixWorld);
            const worldNormal = intersect.face.normal.clone().applyMatrix3(normalMatrix).normalize();
            const cameraDirection = camera.position.clone().sub(intersect.point).normalize();
            const dot = worldNormal.dot(cameraDirection);

            renderer.domElement.style.cursor = dot > 0 ? 'pointer' : 'default';
        } else {
            renderer.domElement.style.cursor = 'default';
        }
    });
}

// log the model rotations for debugging
function logModelRotation() {
    if (model) {
        const rotationDegrees = {
            x: THREE.MathUtils.radToDeg(model.rotation.x).toFixed(2),
            y: THREE.MathUtils.radToDeg(model.rotation.y).toFixed(2),
            z: THREE.MathUtils.radToDeg(model.rotation.z).toFixed(2)
        };

        console.log('Model Rotation (degrees):', rotationDegrees);
        console.log('Animation Rotation Y:', THREE.MathUtils.radToDeg(animationRotationY).toFixed(2));
        console.log('Base Rotation Y:', THREE.MathUtils.radToDeg(baseModelRotation.y).toFixed(2));
    }
}

// Init function
// Initialize the scene, camera, renderer, and load assets
function init() {
    const container = document.createElement('div');
    document.body.appendChild(container);

    // Initialize renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.85;
    renderer.setPixelRatio(window.devicePixelRatio);

    // Get heade height and subtract from window height. (unused as of now)
    const header = document.getElementById('header');
    const headerHeight = header ? header.offsetHeight : 0;
    renderer.setSize(window.innerWidth, window.innerHeight - headerHeight);
    renderer.domElement.style.top = `${headerHeight}px`;
    renderer.domElement.style.position = 'absolute';
    container.appendChild(renderer.domElement);

    // Initialize camera with proper config
    camera = new THREE.PerspectiveCamera(
        CAMERA_CONFIG.fov,
        window.innerWidth / window.innerHeight,
        CAMERA_CONFIG.near,
        CAMERA_CONFIG.far
    );

    // Set initial camera position and rotation using camera config
    camera.position.set(CAMERA_CONFIG.position.x, CAMERA_CONFIG.position.y, CAMERA_CONFIG.position.z);
    camera.rotation.set(
        THREE.MathUtils.degToRad(CAMERA_CONFIG.rotation.x),
        THREE.MathUtils.degToRad(CAMERA_CONFIG.rotation.y),
        THREE.MathUtils.degToRad(CAMERA_CONFIG.rotation.z)
    );

    // Initialize scene
    scene = new THREE.Scene();

    // Load environment and model in parallel for better performance
    const environmentPromise = new Promise((resolve) => {
        hdrLoader.load(ENVIRONMENT_TEXTURES[currentEnvironmentIndex], function (texture) {
            texture.mapping = THREE.EquirectangularReflectionMapping;
            scene.background = texture;
            scene.environment = texture;
            console.log(`Initial environment loaded: ${ENVIRONMENT_TEXTURES[currentEnvironmentIndex]}`);
            resolve(texture);
        });
    });

    // Fix model materials for proper rendering (fixes seeing thru the ports on the model)
    function fixModelMaterials(model) {
        model.traverse((child) => {
            if (child.isMesh && child.material) {
                // Handle single material
                if (child.material.isMaterial) {
                    fixSingleMaterial(child.material);
                }
                // Handle material array
                else if (Array.isArray(child.material)) {
                    child.material.forEach(material => {
                        if (material.isMaterial) {
                            fixSingleMaterial(material);
                        }
                    });
                }
            }
        });
    }

    function fixSingleMaterial(material) {
        // Fix transparency issues
        if (material.transparent && material.opacity === 1) {
            material.transparent = false;
        }

        // Ensure proper side rendering
        material.side = THREE.DoubleSide;

        // Fix alpha test issues
        if (material.alphaTest > 0 && material.alphaTest < 0.1) {
            material.alphaTest = 0;
        }

        // depth testing
        material.depthTest = true;
        material.depthWrite = !material.transparent;

        // Force material update
        material.needsUpdate = true;
    }

    // Load 3D model using GLTFLoader
    const loader = new GLTFLoader();

    // Create a promise to handle model loading
    const modelPromise = new Promise((resolve) => {
        loader.load('assets/scene.gltf', function (gltf) {
            model = gltf.scene;
            fixModelMaterials(model);

            // Set initial model position and rotation from MODEL_CONFIG
            model.position.set(MODEL_CONFIG.position.x, MODEL_CONFIG.position.y, MODEL_CONFIG.position.z);
            model.rotation.x = THREE.MathUtils.degToRad(MODEL_CONFIG.rotation.x);
            model.rotation.y = THREE.MathUtils.degToRad(MODEL_CONFIG.rotation.y);
            model.rotation.z = THREE.MathUtils.degToRad(MODEL_CONFIG.rotation.z);

            // Initialize base rotation values
            baseModelRotation.x = model.rotation.x;
            baseModelRotation.y = model.rotation.y;
            baseModelRotation.z = model.rotation.z;
            animationRotationY = 0;

            scene.add(model);
            resolve(gltf);
        });
    });

    // After both assets load, set up screen and complete initialization
    Promise.all([environmentPromise, modelPromise]).then(() => {
        // Create screen canvas and texture
        canvas = document.createElement('canvas');
        canvas.width = SCREEN_CONFIG.width;
        canvas.height = SCREEN_CONFIG.height;
        ctx = canvas.getContext('2d');
        screenTexture = new THREE.CanvasTexture(canvas);

        // Create screen mesh
        const screenMaterial = new THREE.MeshBasicMaterial({
            map: screenTexture,
            side: THREE.DoubleSide,
            transparent: true,
            alphaTest: 0.1
        });
        const screenGeometry = new THREE.PlaneGeometry(SCREEN_CONFIG.geometry.width, SCREEN_CONFIG.geometry.height);
        screenMesh = new THREE.Mesh(screenGeometry, screenMaterial);

        // Set screen position and rotation from SCREEN_CONFIG
        screenMesh.position.set(SCREEN_CONFIG.position.x, SCREEN_CONFIG.position.y, SCREEN_CONFIG.position.z);
        screenMesh.rotation.set(SCREEN_CONFIG.rotation.x, SCREEN_CONFIG.rotation.y, SCREEN_CONFIG.rotation.z);
        model.add(screenMesh);
        model.scale.set(MODEL_CONFIG.scale, MODEL_CONFIG.scale, MODEL_CONFIG.scale);

        // Set up button event listeners
        document.getElementById('prevEnv').addEventListener('click', function () {
            currentEnvironmentIndex = (currentEnvironmentIndex - 1 + ENVIRONMENT_TEXTURES.length) % ENVIRONMENT_TEXTURES.length;
            loadEnvironmentTexture(currentEnvironmentIndex);
        });

        document.getElementById('nextEnv').addEventListener('click', function () {
            currentEnvironmentIndex = (currentEnvironmentIndex + 1) % ENVIRONMENT_TEXTURES.length;
            loadEnvironmentTexture(currentEnvironmentIndex);
        });

        // Focus on model button
        document.getElementById('focusObject').addEventListener('click', focusOnScreen);

        // Rotation pause/resume button
        document.getElementById('pauseRotation').addEventListener('click', toggleRotation);

        // Auto-focus on load
        window.addEventListener('load', () => {
            const checkModelInterval = setInterval(() => {
                if (model) {
                    focusOnScreen();
                    clearInterval(checkModelInterval);
                }
            }, 100);
        });

        // Call spotify api fetch function and update model and camera (onLoad)
        fetchNowPlaying();
        updateModelAndCamera();

        // Set up intervals with above functions and call functions after initial load
        setInterval(fetchNowPlaying, 2000); // Spotify fetch every 2 seconds
        setInterval(updateModelAndCamera, 16); // 60fps

        // Call onLoad focus and set target positions
        loadFocus(FOCUS_TARGET_CONFIG.position, FOCUS_TARGET_CONFIG.rotation, FOCUS_TARGET_CONFIG.distance);

        // Log model rotation every 5 seconds (debug)
        setInterval(logModelRotation, 5000);

        setTimeout(VideoRender,5000);

        // log when assets are loaded fully
        console.log('All assets loaded');

        // Hide loading indicator after load
        const loadingIndicator = document.getElementById('loading-indicator');
        if (loadingIndicator) {
            loadingIndicator.style.display = 'none';
        }
    });

    // Set up controls variables 
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enablePan = false;

    // Call functions for sliders and mouse interactions
    initializeSliders();
    setupMouseInteractions();

    // Add event listeners for window resize
    window.addEventListener('resize', onWindowResize);

    // on load call resize function to get initial sizings
    onWindowResize();

    // Start the render loop
    render();
}

// Render loooop
function render() {
    requestAnimationFrame(render);

    // Get curretn time
    const currentTime = performance.now() / 1000;

    // Model animation
    if (model) {
        // get total time page has been loaded
        const elapsed = clock.getElapsedTime();

        // Calculate effective elapsed time (subtracting paused duration)
        const effectiveElapsed = elapsed - totalPausedDuration;
        const scaleFactor = 4.8 + 0.2 * Math.abs(Math.sin(effectiveElapsed * 2));

        // Handle rotation based on pause state
        if (isRotationPaused) {
            // Keep animation rotation at position when it was paused
            const pausedElapsed = pausedAtTime - totalPausedDuration;
            animationRotationY = pausedElapsed * MODEL_CONFIG.animationRotationSpeed;
        } else {
            // Continue rotation using effective elapsed time
            animationRotationY = effectiveElapsed * MODEL_CONFIG.animationRotationSpeed;
        }

        // Scale model (makes model bounce basically)
        model.scale.set(scaleFactor, scaleFactor, scaleFactor);
    }

    // Camera focus
    if (isFocusing) {
        const elapsedFocus = currentTime - focusStartTime;
        const t = Math.min(elapsedFocus / ANIMATION_CONFIG.focusDuration, 1);
        const easedT = easeInOutCubic(t);

        // Ensure we have valid positions
        if (startCameraPosition && endCameraPosition && model) {
            camera.position.lerpVectors(startCameraPosition, endCameraPosition, easedT);

            const targetPosition = window.focusTarget;
            if (targetPosition) {
                controls.target.lerpVectors(startCameraTarget, targetPosition, easedT);
            }

            // Update controls
            controls.update();

            // when focus is done, log it and reset state
            if (t >= 1) {
                isFocusing = false;
                console.log('Focus animation completed, model body centered');
            }
        } else {
            console.log('Missing positions for focus animation');
            isFocusing = false;
        }
    }

    controls.update();

    // Render the scene fully
    renderer.render(scene, camera);
}

// Start running the page !
// Run initialization function
init();