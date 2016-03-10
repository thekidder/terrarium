const FileSaver = require('filesaver.js');

import THREE from 'three.js';

import App from './app.js';
import ArcBallCamera from './arc-camera.js';
import Debug from './debug.js';
import Planet from './planet.js';

class Editor {
  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new ArcBallCamera(3.0, new THREE.Vector3());
    this.drag = false;

    this.camera.position.set(3, 0, 0);
    this.camera.lookAt(new THREE.Vector3());

    this.planet = new Planet(this.scene);

    this.saveHeightmap();

    this.populateScene();
  }

  saveHeightmap() {
    const data = JSON.stringify(this.planet.heightmap.save());
    const blob = new Blob([JSON.stringify(data)], {type : 'application/json'});
    FileSaver.saveAs(blob, "heightmap.js");
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

    // debug axes
    this.scene.add(Debug.createMarkerLine(
        new THREE.Vector3(), new THREE.Vector3(2, 0, 0), 0xff0000));

    this.scene.add(Debug.createMarkerLine(
        new THREE.Vector3(), new THREE.Vector3(0, 2, 0), 0x00ff00));

    this.scene.add(Debug.createMarkerLine(
        new THREE.Vector3(), new THREE.Vector3(0, 0, 2), 0x0000ff));
  }

  update(millis) {
  }

  onResize(width, height) {
    this.camera.onResize(width, height);
  }

  onFocus(event) {
  }

  onBlur(event) {
  }

  onKeyDown(event) {
  }

  onMouseDown(event) {
    this.drag = true;
    this.camera.startRotate(event.pageX, event.pageY);
  }

  onMouseUp(event) {
    this.drag = false;
    this.camera.endRotate();
  }

  onMouseMove(event) {
    if (this.drag) {
      this.camera.rotate(event.pageX, event.pageY);
    }
  }
}

const app = new App('Terrarium Editor', new Editor());
app.setEventListeners();
app.run();
