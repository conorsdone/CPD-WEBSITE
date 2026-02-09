// Global responsive image system - works across entire site
(function() {
    const base = 'https://res.cloudinary.com/dcouze1qx/image/upload/f_auto,q_auto/';
    
    // Global function to setup responsive images anywhere
    window.setupResponsiveImages = function() {
        document.querySelectorAll('img[data-public-id]:not(.testing)').forEach((img, index) => {
            const id = img.dataset.publicId;
            
            // mobile use 1200px
            if (window.innerWidth <= 768) {
                img.src = `${base}w_1200/${id}`;
                img.srcset = `${base}w_1200/${id} 1200w`;
                img.sizes = '1200px';
            } else {
                // change based on aspect ratio
                img.src = `${base}w_1200/${id}`;
                img.srcset = `${base}w_1200/${id} 1200w, ${base}w_1600/${id} 1600w, ${base}w_2400/${id} 2400w`;
                img.sizes = '(max-width: 1920px) 1600px, 2400px';
            }
            
            img.alt = img.alt || id.split('_')[0].replace('-', ' ');
            
        });
    };
    
    // Auto-setup on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', window.setupResponsiveImages);
    } else {
        window.setupResponsiveImages();
    }
})();

document.addEventListener('DOMContentLoaded', () => {
    // Run responsive images setup
    window.setupResponsiveImages();
});

// change image sizes on window resize
window.addEventListener('resize', () => {
    setTimeout(() => {
        window.setupResponsiveImages();
    }, 100);
});

// Get time for header
function updateTime() {
    const now = new Date();
    let hours = now.getUTCHours();
    const realHours = hours.toString().padStart(2, '0'); // Get hours in GMT
    const minutes = now.getUTCMinutes().toString().padStart(2, '0'); // Get minutes in GMT
    const seconds = now.getUTCSeconds().toString().padStart(2, '0'); // Get seconds in GMT
    const gmtTime = `Dublin, Éire ${realHours}:${minutes}:${seconds} GMT`; // Format the time string
    document.getElementById("gmt-time").textContent = gmtTime;
}

function applyAspectRatioClass() {
    const aspectRatio = window.innerWidth / window.innerHeight;

    // Access body element
    const body = document.body;

    // Remove existing ratio classes to avoid conflicts
    body.classList.remove('ultra-wide-ratio', 'wide-ratio', 'tall-ratio', 'square-ratio');

    // Add class based on ratio
    if (aspectRatio > 2.3) {
        body.classList.add('ultra-wide-ratio');   // Landscape-like ratio
    } else if (aspectRatio > 1.3) {
        body.classList.add('wide-ratio');   // Landscape-like ratio
    } else if (aspectRatio < 0.75) {
        body.classList.add('tall-ratio');   // Portrait-like ratio
    } else {
        body.classList.add('square-ratio'); // Close to a square aspect ratio
    }
}

// Run the function on load and resize to handle toolbar show/hide
applyAspectRatioClass();

window.addEventListener('resize', applyAspectRatioClass);

function adjustViewportHeight() {
    // Calculate 1vh based on the current visible viewport height
    const vh = window.innerHeight * 0.01;

    // Set the custom CSS variable to update dynamically
    document.documentElement.style.setProperty('--vh', `${vh}px`);
}

// Adjust viewport height on load
adjustViewportHeight();

// Handle viewport changes due to the toolbar showing/hiding (resize events)
window.addEventListener('resize', adjustViewportHeight);

// update time every second
setInterval(updateTime, 1000);
window.onload = updateTime;
