export class IPodScreen {
    constructor(canvasWidth = 400, canvasHeight = 330) {
        this.canvas = document.createElement('canvas');
        this.canvas.width = canvasWidth;
        this.canvas.height = canvasHeight;
        this.ctx = this.canvas.getContext('2d');
    }

    updateScreen(trackInfo) {
        const { trackName, artistName, albumName, progressMs, durationMs, isPlaying } = trackInfo;

        // Clear and draw background
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, '#111111');
        gradient.addColorStop(1, '#333333');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Load album art (fallback handled in trackInfo)
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = trackInfo.albumImageUrl;

        img.onload = () => {
            this._drawAlbumArt(img);
            this._drawText(trackName, artistName, albumName);
            this._drawProgressBar(progressMs, durationMs);
            this._drawBatteryIcon();
            this._drawPlayPauseButton(isPlaying);
        };

        img.onerror = () => console.error('Failed to load album art');
    }

    // Private methods (internal use only)
    _drawAlbumArt(img) {
        const imgSize = 120;
        const imgX = (this.canvas.width - imgSize) / 2;
        const imgY = 30;
        const radius = 15;

        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.moveTo(imgX + radius, imgY);
        this.ctx.lineTo(imgX + imgSize - radius, imgY);
        this.ctx.quadraticCurveTo(imgX + imgSize, imgY, imgX + imgSize, imgY + radius);
        this.ctx.lineTo(imgX + imgSize, imgY + imgSize - radius);
        this.ctx.quadraticCurveTo(imgX + imgSize, imgY + imgSize, imgX + imgSize - radius, imgY + imgSize);
        this.ctx.lineTo(imgX + radius, imgY + imgSize);
        this.ctx.quadraticCurveTo(imgX, imgY + imgSize, imgX, imgY + imgSize - radius);
        this.ctx.lineTo(imgX, imgY + radius);
        this.ctx.quadraticCurveTo(imgX, imgY, imgX + radius, imgY);
        this.ctx.closePath();
        this.ctx.clip();
        this.ctx.drawImage(img, imgX, imgY, imgSize, imgSize);
        this.ctx.restore();
    }

    _drawText(trackName, artistName, albumName) {
        const imgY = 30;
        const imgSize = 120;
        
        this.ctx.fillStyle = '#ffffff';
        this.ctx.textAlign = 'center';
      
        // Track name
        this.ctx.font = 'bold 18px Arial';
        this.ctx.fillText(trackName, this.canvas.width / 2, imgY + imgSize + 40);
      
        // Artist name
        this.ctx.font = '16px Arial';
        this.ctx.fillText(artistName, this.canvas.width / 2, imgY + imgSize + 70);
      
        // Album name
        this.ctx.font = '14px Arial';
        this.ctx.fillText('Album: ' + albumName, this.canvas.width / 2, imgY + imgSize + 95);
      }

    _drawProgressBar(progressMs, durationMs) {
        const barWidth = this.canvas.width * 0.6;
        const barHeight = 8;
        const barX = (this.canvas.width - barWidth) / 2;
        const barY = this.canvas.height - 40;

        if (durationMs <= 0) return;
        const progress = Math.min(progressMs / durationMs, 1);

        // Background bar
        this.ctx.fillStyle = '#555555';
        this.ctx.fillRect(barX, barY, barWidth, barHeight);

        // Progress bar (Spotify green)
        this.ctx.fillStyle = '#1DB954';
        this.ctx.fillRect(barX, barY, barWidth * progress, barHeight);
    }

    _drawBatteryIcon() {
        const batteryX = this.canvas.width - 50;
        const batteryY = 20;
        const batteryWidth = 30;
        const batteryHeight = 12;

        // Outer rectangle
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(batteryX, batteryY, batteryWidth, batteryHeight);

        // Battery tip
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(batteryX + batteryWidth, batteryY + 3, 4, 6);

        // Battery level (70% for demo)
        this.ctx.fillStyle = '#00ff00';
        this.ctx.fillRect(batteryX + 2, batteryY + 2, batteryWidth * 0.7 - 4, batteryHeight - 4);
    }

    _drawPlayPauseButton(isPlaying) {
        const iconX = 30;
        const iconY = 20;
        const iconSize = 20;

        this.ctx.fillStyle = '#ffffff';

        if (isPlaying) {
            // Pause icon (two bars)
            this.ctx.fillRect(iconX, iconY, 5, iconSize);
            this.ctx.fillRect(iconX + 10, iconY, 5, iconSize);
        } else {
            // Play icon (triangle)
            this.ctx.beginPath();
            this.ctx.moveTo(iconX, iconY);
            this.ctx.lineTo(iconX, iconY + iconSize);
            this.ctx.lineTo(iconX + 15, iconY + iconSize / 2);
            this.ctx.closePath();
            this.ctx.fill();
        }
    }
}