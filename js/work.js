document.addEventListener('DOMContentLoaded', () => {
    const base = 'https://res.cloudinary.com/dcouze1qx/image/upload/f_auto,q_auto/';

    document.querySelectorAll('img[data-public-id]').forEach(img => {
        const id = img.dataset.publicId;
        img.src = `${base}w_1600/${id}`;
        img.srcset = [800, 1600].map(w => `${base}w_${w}/${id} ${w}w`).join(', ');
        img.sizes = '(max-width: 800px) 800px, (max-width: 1600px) 1600px';
        img.alt = img.alt || id.split('_')[0].replace('-', ' ');
    });

    const navItems = document.querySelectorAll('.containerNav .nav');
    const portfolioItems = document.querySelectorAll('[data-category]');

    // Show LIVE GIGS by default (since it has active class)
    filterContent('live-gigs');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            filterContent(item.dataset.filter);
            window.scrollTo(0, 0);
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

    const images = document.querySelectorAll(".containerFlexMid img, .column img");
    const navBar = document.querySelector(".containerNav");

    // Create modal elements dynamically
    const modalOverlay = document.createElement("div");
    modalOverlay.className = "modal-overlay";

    const modalContent = document.createElement("div");
    modalContent.className = "modal-content";

    const modalTitle = document.createElement("h3");
    modalTitle.className = "modal-title";

    const modalImg = document.createElement("img");
    modalImg.className = "modal-image";

    const blurBackground = document.querySelector(".containerFlex");

    modalContent.appendChild(modalTitle);
    modalContent.appendChild(modalImg);
    modalOverlay.appendChild(modalContent);
    document.body.appendChild(modalOverlay);

    // Add click event to all images in the layout
    images.forEach(img => {
        img.addEventListener("click", function () {
            // Use the already-transformed src from your existing code
            const imageSrc = this.src.replace('/w_1600/', '/w_2400/'); // Slightly larger for modal
            const modalTitleText = img.dataset.imgTitle;
        modalTitle.textContent = modalTitleText;

            // Apply blur to background elements
            blurBackground.classList.add("blur-background");

            document.querySelector(".modal-overlay").scrollTop = 0;

            // Show modal with clicked image
            modalImg.src = imageSrc;
            modalOverlay.style.animation = "fadeInColour 1.25s ease-in-out";
            modalContent.style.animation = "fadeIn 1.25s ease-in-out";
            navBar.style.animation = "fadeOut 1.25s ease-in-out";
            blurBackground.style.animation = "blurIn 1.25s ease-in";
            // modalImg.alt = this.alt; // Preserve alt text
            modalOverlay.style.display = "flex";

            // Prevent scrolling when modal is open
            document.body.style.overflow = "hidden";
            modalOverlay.style.overflowY = 'auto';
            modalContent.style.scrollbarWidth = 'none';
            modalContent.style.msOverflowStyle = 'none';

            const style = document.createElement('style');
            style.innerHTML = `.modal-content::-webkit-scrollbar { display: none !important; }`;
            document.head.appendChild(style);

            document.body.classList.toggle('scrolled', true);

            setTimeout(() => {
                navBar.style.opacity = "0";
            }, 1250);
        });
    });

    // Close modal when clicking overlay
    modalOverlay.addEventListener("click", function (e) {
        if (e.target === modalOverlay || e.target === modalContent) {
            modalOverlay.style.animation = "fadeOutColour 1.25s ease-in-out";
            modalContent.style.animation = "fadeOut 1.25s ease-in-out"; // Optional fade-out effect
            navBar.style.animation = "fadeIn 1.25s ease-in-out";
            blurBackground.style.animation = "blurOut 1.25s ease-in";

            setTimeout(() => {
                document.querySelector(".modal-overlay").scrollTop = 0;
                modalOverlay.style.display = "none";
                document.querySelector(".containerFlex").classList.remove("blur-background");
                document.body.style.overflow = "auto";
                navBar.style.display = "grid";
                navBar.style.opacity = "1";
            }, 1250);
        }
    });

    // function filterContent(category) {
    //     // Close any open modal first
    //     const modal = document.querySelector('.modal-overlay');
    //     if (modal && modal.style.display === "flex") {
    //       modal.style.display = "none";
    //       document.querySelector(".containerFlex").classList.remove("blur-background");
    //       document.body.style.overflow = "auto";
    //     }

    //     // Rest of your existing filter code
    //     portfolioItems.forEach(item => {
    //       item.style.display = item.dataset.category === category ? 'flex' : 'none';
    //       item.style.opacity = item.dataset.category === category ? '1' : '0';
    //     });

    //     navItems.forEach(nav => {
    //       nav.classList.toggle('active', nav.dataset.filter === category);
    //     });
    //   }

    // When the user scrolls down 50px from the top of the document, resize the header's font size
    window.addEventListener('scroll', function () {
        document.body.classList.toggle('scrolled', window.scrollY > 75);
    });

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
