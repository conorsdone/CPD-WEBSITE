document.addEventListener('DOMContentLoaded', () => {
    const base = 'https://res.cloudinary.com/dcouze1qx/image/upload/f_auto,q_auto/';

    document.querySelectorAll('img[data-public-id]').forEach(img => {
        const id = img.dataset.publicId;
        img.src = `${base}w_2400/${id}`;
        img.srcset = [800, 1600, 2400].map(w => `${base}w_${w}/${id} ${w}w`).join(', ');
        img.sizes = '(max-width: 800px) 800px, (max-width: 1600px) 1600px, 2400px';
        img.alt = img.alt || id.split('_')[0].replace('-', ' ');
    });
});

document.addEventListener('DOMContentLoaded', () => {
    const navItems = document.querySelectorAll('.containerNav .nav');
    const portfolioItems = document.querySelectorAll('[data-category]');

    // Show LIVE GIGS by default (since it has active class)
    filterContent('live-gigs');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            filterContent(item.dataset.filter);
        });
    });

    function filterContent(category) {
        portfolioItems.forEach(item => {
            item.style.display = item.dataset.category === category ? 'flex' : 'none';
        });

        // Force layout recalculation for transitions
        void document.body.offsetHeight;

        portfolioItems.forEach(item => {
            item.style.opacity = item.dataset.category === category ? '1' : '0';
        });

        navItems.forEach(nav => {
            nav.classList.toggle('active', nav.dataset.filter === category);
        });
    }
});

function updateTime() {
    const aspectRatio = window.innerWidth / window.innerHeight;
    const now = new Date();
    let hours = now.getUTCHours() + 1;
    const realHours = hours.toString().padStart(2, '0'); // Get hours in GMT
    const minutes = now.getUTCMinutes().toString().padStart(2, '0'); // Get minutes in GMT
    const seconds = now.getUTCSeconds().toString().padStart(2, '0'); // Get seconds in GMT
    const gmtTime = `Dublin, Éire ${realHours}:${minutes}:${seconds} GMT`; // Format the time string
    document.getElementById("gmt-time").textContent = gmtTime;
    // console.log(aspectRatio);
  }

  setInterval(updateTime, 1000); // Update every second
  window.onload = updateTime; // Update immediately when page loads