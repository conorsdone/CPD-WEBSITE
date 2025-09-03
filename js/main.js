const images = [
    'images/000012.jpg',
    'images/000038.jpg',
    'images/000040.jpg',
    'images/mlhSite2.webp',
    'images/MonjolaSite.webp',
    'images/F3miiiSite.webp'
];

let currentImageIndex = 0;
let gl, program, texture, nextTexture;
let imageSize = [1, 1];
let fadeProgress = 0.0;
let isFading = false;
let nextImageIndex = (currentImageIndex + 1) % images.length;

function initWebGL() {
    const canvas = document.getElementById('morphCanvas');
    gl = canvas.getContext('webgl');
    if (!gl) return alert("WebGL not supported!");

    // Initialize textures
    texture = gl.createTexture();
    nextTexture = gl.createTexture();
    [texture, nextTexture].forEach(tex => {
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    });

    // Shader setup
    const vs = gl.createShader(gl.VERTEX_SHADER);
    const fs = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(vs, document.getElementById('vertexShader').text);
    gl.shaderSource(fs, document.getElementById('fragmentShader').text);
    gl.compileShader(vs);
    gl.compileShader(fs);

    program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    gl.useProgram(program);

    // Set texture uniform locations
    gl.uniform1i(gl.getUniformLocation(program, 'u_image'), 0);
    gl.uniform1i(gl.getUniformLocation(program, 'u_nextImage'), 1);

    // Geometry setup
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
}

async function loadImage(url) {
    const img = await new Promise((resolve, reject) => {
        const image = new Image();
        image.crossOrigin = "anonymous";
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = url;
    });

    // Create texture-ready canvas
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    return canvas;
}

async function updateTexture() {
    const img = await loadImage(images[currentImageIndex]);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    imageSize = [img.width, img.height];
    resize();
}

async function startFade() {
    if (isFading) return;
    isFading = true;

    // Load next image
    const nextImg = await loadImage(images[nextImageIndex]);
    gl.bindTexture(gl.TEXTURE_2D, nextTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, nextImg);

    // Animate fade
    const startTime = performance.now();
    const fadeStep = () => {
        const elapsed = performance.now() - startTime;
        fadeProgress = Math.min(elapsed / 1000, 1.0);

        if (fadeProgress < 1.0) {
            requestAnimationFrame(fadeStep);
        } else {
            isFading = false;
            currentImageIndex = nextImageIndex;
            nextImageIndex = (currentImageIndex + 1) % images.length;
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, nextImg);
            fadeProgress = 0.0;
        }
    };
    fadeStep();
}

function resize() {
    const canvas = document.getElementById('morphCanvas');
    canvas.width = window.innerWidth * 0.5;
    canvas.height = window.innerHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(gl.getUniformLocation(program, 'u_canvasSize'), canvas.width, canvas.height);
    gl.uniform2f(gl.getUniformLocation(program, 'u_imageSize'), imageSize[0], imageSize[1]);
}

function animate() {
    gl.uniform1f(gl.getUniformLocation(program, 'time'), performance.now() / 1000);
    gl.uniform1f(gl.getUniformLocation(program, 'u_strength'), 0.05);
    gl.uniform1f(gl.getUniformLocation(program, 'u_fadeProgress'), fadeProgress);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, nextTexture);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    requestAnimationFrame(animate);
}

function nextImage() {
    if (!isFading) startFade();
}

async function prevImage() {
    currentImageIndex = (currentImageIndex - 1 + images.length) % images.length;
    await updateTexture();
}

// Initialize
initWebGL();
updateTexture().then(() => {
    window.addEventListener('resize', resize);
    animate();
    // Start slideshow after first load
    setInterval(nextImage, 3000);
});