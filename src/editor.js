import THREE from 'three.js';

import App from './app.js';
import Debug from './debug.js';
import Planet from './planet.js';

class Editor {
  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera( 75, 1.0, 0.1, 1000 ); // aspect will get set in onResize

    this.camera.position.set(3, 0, 0);
    this.camera.lookAt(new THREE.Vector3());

    this.planet = new Planet(this.scene);

    this.populateScene();
  }

  populateScene() {
    const lights = [
      { intensity: 0.8, position: new THREE.Vector3(0, 4, 0), debugColor: 0xff0000 },
      { intensity: 0.7, position: new THREE.Vector3(3, 3, 3), debugColor: 0x00ff00 },
      { intensity: 0.8, position: new THREE.Vector3(-3, -3, -3), debugColor: 0x0000ff },
    ];

    for (const lightInfo of lights) {
      this.scene.add(Debug.createMarker(lightInfo.position, 0.05, lightInfo.debugColor));
      const light = new THREE.PointLight(0xffffff, lightInfo.intensity, 300, 2);
      light.position.copy(lightInfo.position);
      this.scene.add(light);
    }
  }

  update(millis) {
  }

  onResize(width, height) {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  onFocus(event) {
  }

  onBlur(event) {
  }

  onKeyDown(event) {
  }

  onMouseDown(event) {
  }

  onMouseUp(event) {
  }

  onMouseMove(event) {
  }
}

const app = new App('Terrarium Editor', new Editor());
app.setEventListeners();
app.run();
