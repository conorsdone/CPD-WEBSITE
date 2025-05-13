import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export class CameraManager {
  constructor(camera, renderer, settings = {}) {
    this.camera = camera;
    this.renderer = renderer;
    this.settings = {
      damping: 0.05,
      enablePan: false,
      ...settings
    };
    
    this.controls = new OrbitControls(camera, renderer.domElement);
    this.setupControls();
  }

  setupControls() {
    this.controls.enableDamping = true;
    this.controls.dampingFactor = this.settings.damping;
    this.controls.enablePan = this.settings.enablePan;
  }

  update() {
    this.controls.update();
  }

  
  

  calculateFocusPosition(object) {
    const boundingBox = new THREE.Box3().setFromObject(object);
    const center = boundingBox.getCenter(new THREE.Vector3());
    const size = boundingBox.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const distance = maxDim * 1.5;
    
    const direction = new THREE.Vector3()
      .subVectors(this.camera.position, center)
      .normalize()
      .multiplyScalar(distance);
      
    return new THREE.Vector3().addVectors(center, direction);
  }

  handleResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
  }
}