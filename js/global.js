document.addEventListener('DOMContentLoaded', () => {
    // clouinary image connection
    const base = 'https://res.cloudinary.com/dcouze1qx/image/upload/f_auto,q_auto/';

    document.querySelectorAll('img[data-public-id]').forEach(img => {
        const id = img.dataset.publicId;
        img.src = `${base}w_1600/${id}`;
        img.srcset = [800, 1600].map(w => `${base}w_${w}/${id} ${w}w`).join(', ');
        img.sizes = '(max-width: 800px) 800px, (max-width: 1600px) 1600px';
        img.alt = img.alt || id.split('_')[0].replace('-', ' ');
    });
});

// Get time for header
function updateTime() {
    const now = new Date();
    let hours = now.getUTCHours() + 1;
    const realHours = hours.toString().padStart(2, '0'); // Get hours in GMT
    const minutes = now.getUTCMinutes().toString().padStart(2, '0'); // Get minutes in GMT
    const seconds = now.getUTCSeconds().toString().padStart(2, '0'); // Get seconds in GMT
    const gmtTime = `Dublin, Éire ${realHours}:${minutes}:${seconds} GMT`; // Format the time string
    document.getElementById("gmt-time").textContent = gmtTime;
}

// update time every second
setInterval(updateTime, 1000); // Update every second
window.onload = updateTime; 