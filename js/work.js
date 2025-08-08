document.addEventListener('DOMContentLoaded', () => {
    const base = 'https://res.cloudinary.com/dcouze1qx/image/upload/f_auto,q_auto/';

    const imageGroups = {
        "broncoLokoSet": [
            { id: "BroncoLokoSite1_tz85jl", title: "Ahmed, With Love." },
            { id: "curtisy-1_fjshog", title: "Curtisy" },
        ],
        "mikeSet": [
            { id: "MikeSite1_y4dgtd", title: "Mike" },
            { id: "MikeSite3_otvvqw", title: "Mike" },
            { id: "MikeSite2_k63dr8", title: "Mike" },
            { id: "BroncoLokoSite1_tz85jl", title: "Ahmed, With Love." },
            { id: "curtisy-1_fjshog", title: "Curtisy" },
        ]
    };

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

    // Create close button
    const modalCloseButton = document.createElement("button");
    modalCloseButton.className = "modal-close-button";
    modalCloseButton.innerHTML = "&times;"; // × symbol
    modalCloseButton.setAttribute("aria-label", "Close modal");
    modalCloseButton.style.display = "none"; // Ensure it's hidden initially

    const modalTitle = document.createElement("h3");
    modalTitle.className = "modal-title";

    const modalImg = document.createElement("img");
    modalImg.className = "modal-main-image";

    const modalImageGroupContainer = document.createElement("div");
    modalImageGroupContainer.className = "modal-image-group-container";

    const blurBackground = document.querySelector(".containerFlex");

    modalContent.appendChild(modalTitle);
    // modalContent.appendChild(modalImg);
    modalContent.appendChild(modalImageGroupContainer);
    modalOverlay.appendChild(modalContent);
    document.body.appendChild(modalOverlay);
    
    // Add close button directly to body (completely independent)
    document.body.appendChild(modalCloseButton);

    // Function to close modal
    function closeModal() {
        modalOverlay.classList.remove("ani-fadeInColour");
        modalOverlay.classList.add("ani-fadeOutColour");

        modalContent.classList.remove("ani-fadeIn");
        modalContent.classList.add("ani-fadeOut");

        blurBackground.classList.remove("ani-blurIn");
        blurBackground.classList.add("ani-blurOut");

        navBar.style.animation = "fadeIn 1.25s forwards";
        
        // Hide close button
        modalCloseButton.style.display = "none";

        setTimeout(() => {
            document.body.style.overflow = "auto";
            navBar.style.display = "grid";
            navBar.style.opacity = "1";

            modalOverlay.scrollTop = 0;
            modalOverlay.classList.remove("ani-fadeOutColour");
            modalOverlay.classList.remove("modal-overlay-open");

            modalContent.classList.remove("ani-fadeOut");
            modalContent.classList.remove("modal-content-open");

            blurBackground.classList.remove("blur-background");
            blurBackground.classList.remove("ani-blurOut");
        }, 1250);
    }

    // Add click event to close button
    modalCloseButton.addEventListener("click", function(e) {
        e.stopPropagation(); // Prevent any parent click events
        closeModal();
    });

    // Add click event to all images in the layout
    images.forEach(img => {
        img.addEventListener("click", function () {

            const groupName = img.dataset.group; // e.g., "curtis-gig"
            const groupImages = imageGroups[groupName]; // Get all images in this group

            // Use the already-transformed src from your existing code
            const imageSrc = this.src.replace('/w_1600/', '/w_2400/'); // Slightly larger for modal
            modalImg.src = imageSrc;

            modalTitle.textContent = img.dataset.imgTitle;

            modalImageGroupContainer.innerHTML = '';

            groupImages.forEach(image => {
                if (image.id !== img.dataset.publicId) { // Skip the clicked image
                    const groupImg = document.createElement("img");
                    groupImg.src = `${base}w_1600/${image.id}`; // Smaller thumbnails
                    groupImg.alt = image.title;
                    groupImg.classList.add("modal-group-image");

                    // Optional: Make thumbnails clickable to swap the main image
                    groupImg.addEventListener("click", (e) => {
                        e.stopPropagation(); // Prevent modal close
                        modalImg.src = `${base}w_2400/${image.id}`;
                        modalTitle.textContent = image.title;
                    });

                    modalImageGroupContainer.appendChild(groupImg);
                }
            });

            modalOverlay.scrollTop = 0;
            modalOverlay.classList.add("ani-fadeInColour");
            modalOverlay.classList.add("modal-overlay-open");

            modalContent.classList.add("ani-fadeIn");
            modalContent.classList.add("modal-content-open");

            blurBackground.classList.add("ani-blurIn");
            blurBackground.classList.add("blur-background");

            navBar.style.animation = "fadeOut 1.25s forwards";
            modalImageGroupContainer.style.display = "flex";
            
            // Show close button
            modalCloseButton.style.display = "flex";

            document.body.style.overflow = "hidden";
            const style = document.createElement('style');
            style.innerHTML = `.modal-content::-webkit-scrollbar { display: none !important; }`;
            document.head.appendChild(style);

            document.body.classList.toggle('scrolled', true);

            setTimeout(() => {
                navBar.style.opacity = 0;
            }, 1250);
        });
    });

    // Close modal when clicking overlay (but not the content)
    modalOverlay.addEventListener("click", function (e) {
        if (e.target === modalOverlay) {
            closeModal();
        }
    });

    window.addEventListener('scroll', function () {
        document.body.classList.toggle('scrolled', window.scrollY > 75);
    });

});