
// ===== THREE.JS IMPORTS =====
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

// ===== CONFIGURATION VALUES =====
// Camera beginning values
const CAMERA_CONFIG = {
    fov: 90,
    near: 0.1,
    far: 20,
    position: { x: 0, y: -50, z: 0 },
    // position: { x: 0.489, y: -50.25, z: -0.5 },
    rotation: { x: -30, y: -45, z: 0 }
};

// Model values
const MODEL_CONFIG = {
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 25 - 180, z: 0 },
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
    position: { x: 0.009, y: 0.0545, z: 0 },
    rotation: { x: 0, y: Math.PI / 2, z: 0 }
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

// ===== GLOBAL VARIABLES =====
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

// Animation rotation
let animationRotationY = 0;
let baseModelRotation = { x: 0, y: 0, z: 0 }; // Base rotation from sliders

// UI control - renamed variables, attached to sliders
let modelRotX = MODEL_CONFIG.rotation.x;
let modelRotY = MODEL_CONFIG.rotation.y;
let modelRotZ = MODEL_CONFIG.rotation.z;
let cameraFov = CAMERA_CONFIG.fov;

// Spotify and screen
let currentTrackUrl = '';
let pausedStartTime = null;

// Environment
let currentEnvironmentIndex = 0;

// Reusable objects (performance optimization)
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const clock = new THREE.Clock();
const hdrLoader = new RGBELoader();

// ===== UTILITY FUNCTIONS =====
// Debounce helper for slider performance
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

// ===== ENVIRONMENT MANAGEMENT =====
// Load the next environment texture
function loadEnvironmentTexture(index) {
    const texturePath = ENVIRONMENT_TEXTURES[index];

    hdrLoader.load(texturePath, function (texture) {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        scene.environment = texture;
        scene.background = texture;
        console.log(`Environment set to: ${texturePath}`);
    });
}

// ===== SPOTIFY API AND SCREEN CONTENT =====
// Fetch the currently playing track from my spotify
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

// ===== SCREEN RENDERING FUNCTIONS =====
// Update the screen with track information
function updateScreen(trackInfo) {
    if (!canvas || !ctx) {
        console.error('Canvas or ctx is not initialized');
        return;
    }

    // Pull track information and map it to variables
    const { trackName, artistName, albumName, progressMs, durationMs } = trackInfo;

    // Clear and create background gradient
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#111111');
    gradient.addColorStop(1, '#333333');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Load and map album cover
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = trackInfo.albumImageUrl || 'assets/cherrybombCover.jpg';

    // Variables for screen rendering
    img.onload = () => {
        drawAlbumCover(img);
        drawTrackInfo(trackName, artistName, albumName);
        drawProgressBar(progressMs, durationMs);
        drawBatteryIcon();
        drawPlayPauseButton(trackInfo.isPlaying);

        // Update texture and current track URL
        screenTexture.needsUpdate = true;
        currentTrackUrl = trackInfo.trackUrl;
    };

    img.onerror = (error) => {
        console.error('Failed to load album cover image:', error);
    };
}

// Draw the album cover image on the screen
function drawAlbumCover(img) {
    const imgSize = 120;
    const imgX = (canvas.width - imgSize) / 2;
    const imgY = 30;
    const radius = 15;

    // Draw rounded rectangle clipping path (mask)
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

// Draw track information on the screen
function drawTrackInfo(trackName, artistName, albumName) {
    const imgSize = 120;
    const imgY = 30;

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';

    // Track name (bold)
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

// Draw the progress bar on the screen
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

    // Progress bar (Spotify green)
    ctx.fillStyle = '#1DB954';
    ctx.fillRect(barX, barY, barWidth * progress, barHeight);
}

// Draw battery icon on the screen
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

    // Battery level (70% charge)
    ctx.fillStyle = '#00ff00';
    ctx.fillRect(batteryX + 2, batteryY + 2, batteryWidth * 0.7 - 4, batteryHeight - 4);
}

// ===== UI CONTROLS SETUP =====
// Setup slider with debounce
function setupSlider(id, onChange) {
    const slider = document.getElementById(id);
    onChange(slider.value);
    slider.addEventListener('input', debounce(e => onChange(e.target.value)));
}

function initializeSliders() {
    // Set sliders to match their respective configs
    document.getElementById("fovRange").value = CAMERA_CONFIG.fov;
    document.getElementById("rotateX").value = MODEL_CONFIG.rotation.x;
    document.getElementById("rotateY").value = MODEL_CONFIG.rotation.y;
    document.getElementById("rotateZ").value = MODEL_CONFIG.rotation.z;

    // Setup sliders with properly named variables
    setupSlider("rotateX", val => modelRotX = parseFloat(val));
    setupSlider("rotateY", val => modelRotY = parseFloat(val));
    setupSlider("rotateZ", val => modelRotZ = parseFloat(val));
    setupSlider("fovRange", val => cameraFov = parseFloat(val));
}

// ===== ROTATION CONTROL FUNCTIONS =====
// Toggle rotation pause state
function toggleRotation() {
    const button = document.getElementById('pauseRotation');
    const currentTime = clock.getElapsedTime();

    if (isRotationPaused) {
        // Resume rotation, calculate how long we were paused
        const pauseDuration = currentTime - pausedAtTime;
        totalPausedDuration += pauseDuration;
        isRotationPaused = false;
        button.innerHTML = '⏸️';
        button.title = 'Pause Rotation';
        console.log('Model rotation resumed');
    } else {
        // Pause rotation, store when we paused
        pausedAtTime = currentTime;
        isRotationPaused = true;
        button.innerHTML = '▶️';
        button.title = 'Resume Rotation';
        console.log('Model rotation paused');
    }
}

// FIXED: Comprehensive focus function with full debugging, targeting model center
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

    console.log('Testing different forward directions:');
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

    // Load the focus animation
    focusStartTime = performance.now() / 1000;
    isFocusing = true;

    // Store the target position for the animation
    window.focusTarget = targetPosition;

    // Restore animation state after calculation
    if (wasAnimating) {
        isRotationPaused = false;
    }

    console.log('Focus animation started');
    // console.log('=== FOCUS DEBUG END ===');
}

// Load focus function with standardized position and rotation
function loadFocus(targetPosition, targetRotation, distance = 1) {
    if (!model || !camera || !controls) return;

    // Store current camera values
    startCameraPosition = camera.position.clone();
    startCameraTarget = controls.target.clone();
    startCameraRotation = camera.quaternion.clone();

    // Calculate end rotation using standardized rotation format
    endCameraRotation = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(
            THREE.MathUtils.degToRad(targetRotation.x),
            THREE.MathUtils.degToRad(targetRotation.y),
            THREE.MathUtils.degToRad(targetRotation.z),
            'XYZ'
        )
    );

    // Calculate position based on rotation and distance using standardized position format
    const direction = new THREE.Vector3(0, 0, -distance);
    direction.applyQuaternion(endCameraRotation);
    endCameraPosition = new THREE.Vector3(targetPosition.x, targetPosition.y, targetPosition.z).add(direction);

    focusStartTime = performance.now() / 1000;
    isFocusing = true;
    controls.target.set(targetPosition.x, targetPosition.y, targetPosition.z);
}

// ===== UPDATE FUNCTIONS =====
// Update the scene on window resize
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

// ===== MOUSE INTERACTION HANDLERS =====
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

// ===== MAIN INITIALIZATION FUNCTION =====
// Initialize the scene, camera, renderer, and load assets
function init() {
    const container = document.createElement('div');
    document.body.appendChild(container);

    // Initialize renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.85;
    renderer.setPixelRatio(window.devicePixelRatio);

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

    // Load the 3D model using GLTFLoader
    const loader = new GLTFLoader();

    // Create a promise to handle model loading
    const modelPromise = new Promise((resolve) => {
        loader.load('assets/scene.gltf', function (gltf) {
            model = gltf.scene;
            // Set initial model position and rotation from MODEL_CONFIG using standardized format
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
        const screenMaterial = new THREE.MeshBasicMaterial({ map: screenTexture, side: THREE.DoubleSide });
        const screenGeometry = new THREE.PlaneGeometry(SCREEN_CONFIG.geometry.width, SCREEN_CONFIG.geometry.height);
        screenMesh = new THREE.Mesh(screenGeometry, screenMaterial);

        // Position and add screen to model using standardized format
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

        // Initialize all systems
        fetchNowPlaying();
        updateModelAndCamera();

        // Set up optimized intervals (reduced frequency for better performance)
        setInterval(fetchNowPlaying, 2000); // Spotify updates every 2 seconds
        setInterval(updateModelAndCamera, 16); // ~60fps for smooth UI updates

        // Set load animation end position + rotation using proper config with standardized format
        loadFocus(FOCUS_TARGET_CONFIG.position, FOCUS_TARGET_CONFIG.rotation, FOCUS_TARGET_CONFIG.distance);

        // Log model rotation every 5 seconds for debugging
        setInterval(logModelRotation, 5000);

        console.log('All assets loaded');

        // Hide loading indicator
        const loadingIndicator = document.getElementById('loading-indicator');
        if (loadingIndicator) {
            loadingIndicator.style.display = 'none';
        }
    });

    // Set up controls and event listeners
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enablePan = false;

    // Initialize UI controls
    initializeSliders();
    setupMouseInteractions();

    // Add event listeners for window resize
    window.addEventListener('resize', onWindowResize);
    onWindowResize();
    // Start the render loop
    render();
}

// ===== MAIN RENDER LOOP =====
function render() {
    requestAnimationFrame(render);

    const currentTime = performance.now() / 1000;

    // Model animation
    if (model) {
        const elapsed = clock.getElapsedTime();

        // Calculate effective elapsed time (subtracting paused duration)
        const effectiveElapsed = elapsed - totalPausedDuration;
        const scaleFactor = 4.8 + 0.2 * Math.abs(Math.sin(effectiveElapsed * 2));

        // Handle rotation based on pause state
        if (isRotationPaused) {
            // Keep animation rotation at the position when we paused
            const pausedElapsed = pausedAtTime - totalPausedDuration;
            animationRotationY = pausedElapsed * MODEL_CONFIG.animationRotationSpeed;
        } else {
            // Continue rotation using effective elapsed time
            animationRotationY = effectiveElapsed * MODEL_CONFIG.animationRotationSpeed;
        }

        // Scale animation (independent of rotation)
        model.scale.set(scaleFactor, scaleFactor, scaleFactor);
    }

    // Camera focus animation
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

// ===== START APPLICATION =====
// Run the initialization func
init();

document.addEventListener('DOMContentLoaded', () => {
    const base = 'https://res.cloudinary.com/dcouze1qx/image/upload/f_auto,q_auto/';

    document.querySelectorAll('img[data-public-id]').forEach(img => {
        const id = img.dataset.publicId;
        img.src = `${base}w_1600/${id}`;
        img.srcset = [800, 1600].map(w => `${base}w_${w}/${id} ${w}w`).join(', ');
        img.sizes = '(max-width: 800px) 800px, (max-width: 1600px) 1600px';
        img.alt = img.alt || id.split('_')[0].replace('-', ' ');
    });
});

function updateTime() {
    const now = new Date();
    let hours = now.getUTCHours() + 1;
    const realHours = hours.toString().padStart(2, '0'); // Get hours in GMT
    const minutes = now.getUTCMinutes().toString().padStart(2, '0'); // Get minutes in GMT
    const seconds = now.getUTCSeconds().toString().padStart(2, '0'); // Get seconds in GMT
    const gmtTime = `Dublin, Éire ${realHours}:${minutes}:${seconds} GMT`; // Format the time string
    document.getElementById("gmt-time").textContent = gmtTime;
}

setInterval(updateTime, 1000); // Update every second
window.onload = updateTime; 