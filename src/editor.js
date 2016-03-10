const FileSaver = require('filesaver.js');

import THREE from 'three.js';

import App from './app.js';
import ArcBallCamera from './arc-camera.js';
import Debug from './debug.js';
import Planet from './planet.js';
import Scene from './scene.js';

class Editor {
  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new ArcBallCamera(3.0, new THREE.Vector3());
    this.drag = false;

    this.camera.position.set(3, 0, 0);
    this.camera.lookAt(new THREE.Vector3());

    this.planet = new Planet(this.scene);

    this.saveHeightmap();

    Scene.populate(this.scene, {debug: true});
  }

  saveHeightmap() {
    const data = JSON.stringify(this.planet.heightmap.save());
    const blob = new Blob([JSON.stringify(data)], {type : 'application/json'});
    FileSaver.saveAs(blob, "heightmap.js");
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
