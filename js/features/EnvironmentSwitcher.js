import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

export class EnvironmentSwitcher {
  constructor(scene, textures) {
    this.scene = scene;
    this.environmentTextures = textures;
    this.currentIndex = 0;
    this.loader = new RGBELoader(); // Now properly imported
  }
  
    async loadEnvironment(index) {
      try {
        const texture = await new Promise((resolve, reject) => {
          this.loader.load(this.environmentTextures[index], resolve, undefined, reject);
        });
        
        texture.mapping = THREE.EquirectangularReflectionMapping;
        this.scene.environment = texture;
        this.scene.background = texture;
        this.currentIndex = index;
        
        console.log(`Environment set to: ${this.environmentTextures[index]}`);
        return true;
      } catch (error) {
        console.error('Failed to load environment:', error);
        return false;
      }
    }
  
    next() {
      this.currentIndex = (this.currentIndex + 1) % this.environmentTextures.length;
      return this.loadEnvironment(this.currentIndex);
    }
  
    previous() {
      this.currentIndex = (this.currentIndex - 1 + this.environmentTextures.length) % this.environmentTextures.length;
      return this.loadEnvironment(this.currentIndex);
    }
  }