document.addEventListener("DOMContentLoaded", () => {
    const base = 'https://res.cloudinary.com/dcouze1qx/image/upload/f_auto,q_auto:best';
    const modal = document.getElementById("imageModal");
    const modalImg = document.getElementById("modalImg");
    const modalText = document.getElementById("modalText");
    const elementsToMove = document.querySelectorAll(".home, .enter, .cpd-logo");
    const enterElement = document.querySelector(".enter");

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
        // console.log(`Estimated flyWidth: ${flyWidth}, DPR: ${dpr}, selected Cloudinary width: ${selected}`);
        return selected;
    }

    // Apply background images to flyImages
    document.querySelectorAll("li.flyImage").forEach((li) => {
        const type = li.getAttribute("data-type");
        const id = li.getAttribute("data-image-url");

        if (type === null && id) {
            const selectedWidth = getOptimalWidthFromViewport(3, 10); // adjust numImagesPerRow & gap as needed
            li.style.backgroundImage = `url(${base},w_${selectedWidth}/${id})`;
        } else if (type === "video" && id) {
            const videoUrl = `https://res.cloudinary.com/dcouze1qx/video/upload/v1754667301/${id}.mp4`;
            li.style.backgroundImage = `url(${videoUrl})`;
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
    const base = 'https://res.cloudinary.com/dcouze1qx/image/upload/f_auto,q_auto:best';
    const candidateWidths = [800, 1200, 1600, 2400];

    asciiPaused = true; // pause ascii

    // Cancel any previous high-res preload
    if (modalImg.highResLoader) {
        modalImg.highResLoader.onload = null;
        modalImg.highResLoader = null;
    }

    const type = item.getAttribute("data-type");
    const id = item.getAttribute("data-image-url");

    if (type === "video" && id) {
        // Video: just use the same URL
        const videoUrl = `https://res.cloudinary.com/dcouze1qx/video/upload/v1754667301/${id}.mp4`;
        modalImg.style.animation = "none";
        modalImg.offsetHeight; // force reflow
        modalImg.src = videoUrl;
        modalText.textContent = description;
        modal.style.display = "flex";
        modalImg.style.animation = "fadeIn 0.3s ease-in-out forwards";
    } else {
        // Image: progressive loading as before
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

    // Common transitions
    elementsToMove.forEach(el => el.classList.add("logo-transition"));
    if (enterElement) {
        enterElement.classList.add("logo-transition");
        enterElement.style.animation = "fadeOut 0.5s ease-in-out forwards";
    }
}
    function closeModal() {
    asciiPaused = false;

    const modal = document.getElementById("imageModal");
    const modalImg = document.getElementById("modalImg");
    
    // Remove the high-res reference
    modalImg.src = '';           // remove current image
    if (modalImg.highResLoader) {
        modalImg.highResLoader.onload = null;
        modalImg.highResLoader = null;  // discard preloader
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
});