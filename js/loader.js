document.addEventListener("DOMContentLoaded", function () {
    let images = document.images,
        totalImages = images.length,
        imagesLoaded = 0,
        percentageDisplay = document.getElementById("percentage");

    // Function to update the loading percentage
    function updatePercentage() {
        let percentage = Math.round((imagesLoaded / totalImages) * 100);
        percentageDisplay.textContent = percentage + "%";

        // Once all images are loaded, fade out the preloader
        if (imagesLoaded === totalImages) {
            setTimeout(() => {
                document.getElementById("preloader").style.opacity = "0";
                setTimeout(() => {
                    document.getElementById("preloader").style.display = "none";
                    document.getElementById("content").style.display = "block";
                }, 500); // Delay to allow the fade-out effect
            }, 300);
        }
    }

    // Check when each image is loaded
    for (let i = 0; i < totalImages; i++) {
        let img = new Image();
        img.src = images[i].src;
        img.onload = function () {
            imagesLoaded++;
            updatePercentage();
        };
        img.onerror = function () { // Handle broken images
            imagesLoaded++;
            updatePercentage();
        };
    }
});