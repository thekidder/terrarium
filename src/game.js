import Random from 'random-seed';
import Simplex from 'simplex-noise';
import THREE from 'three.js';

import Planet from './planet.js';
import PlanetMath from './planet-math.js';

class Game {
  constructor(renderer) {
    this.totalMillis = 0;
    this.renderer = renderer;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera( 75, 1.0, 0.1, 1000 ); // aspect will get set in onResize

    this.populateScene();
    this.planet = new Planet(this.scene);

    const startMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
    });

    const endMaterial = new THREE.MeshBasicMaterial({
      color: 0xff0000,
    });

    const nibbleMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
    });

    const nibbleGeometry = new THREE.BoxGeometry(0.02, 0.02, 0.02);
    this.startMarker = new THREE.Mesh(nibbleGeometry, startMaterial);
    this.endMarker = new THREE.Mesh(nibbleGeometry, endMaterial);

    this.nibble = new THREE.Mesh(nibbleGeometry, nibbleMaterial);

    this.planet.sphere.add(this.startMarker);
    this.planet.sphere.add(this.endMarker);
    this.planet.sphere.add(this.nibble);

    this.findPath();
    this.nibble.position.copy(this.planet.faceCentroid(this.path[0]));

    this.camera.position.z = 2.5;
  }

  populateScene() {
    const lights = [];
    lights[0] = new THREE.PointLight(0xffffff, 12, 300, 2);
    lights[1] = new THREE.PointLight(0xffffff, 12, 300, 2);
    lights[2] = new THREE.PointLight(0xffffff, 12, 300, 2);

    lights[0].position.set(0, 200, 0);
    lights[1].position.set(100, 200, 100);
    lights[2].position.set(-100, -200, -100);

    this.scene.add(lights[0]);
    this.scene.add(lights[1]);
    this.scene.add(lights[2]);
  }

  update(millis) {
    const pos = this.nibble.position.clone()
        .normalize().multiplyScalar(2.5);
    //console.log(pos);

    this.camera.position.copy(pos);
    this.camera.up = new THREE.Vector3(0,0,1);
    this.camera.lookAt(new THREE.Vector3(0, 0, 0));

    this.totalMillis += millis;
    this.planet.update(millis);

    while (this.pathIndex < this.path.length &&
        !this.planet.inFace(this.nibble.position, this.path[this.pathIndex])) {
      ++this.pathIndex;
    }

    if (this.pathIndex == this.path.length - 1) {
      console.log('done');
      this.findPath();
      return;
    }

    if (this.pathIndex == this.path.length) {
      console.log('diverted');
      console.log(`face: ${this.planet.locateFace(this.nibble.position).faceIndex}`);
      return;
    }

    const dest = this.planet.findCentroid(this.path[this.pathIndex], this.path[this.pathIndex + 1]);

    const velocity = dest.clone()
        .sub(this.nibble.position)
        .normalize()
        .multiplyScalar(0.0003 * millis);

    this.nibble.position.add(velocity);
  }

  findPath() {
    const from = !!this.path ? this.path[this.path.length - 1]: null;
    this.path = null;
    while (this.path == null) {
      this.path = this.planet.findPath(from);
    }

    this.pathIndex = 0;

    this.startMarker.position.copy(this.planet.faceCentroid(this.path[0]));
    this.endMarker.position.copy(this.planet.faceCentroid(this.path[this.path.length - 1]));
  }

  render() {
    this.renderer.render(this.scene, this.camera);
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
    //this.planet.seed = Math.random();
    //this.planet.needsRegeneration = true;
  }

  onMouseDown(event) {
    this.dragStartEvent = event;
    this.drag = true;
  }

  onMouseUp(event) {
    this.drag = false;
  }

  onMouseMove(event) {
    if(this.drag && false) {
      const x = event.screenX - this.dragStartEvent.screenX;
      const y = event.screenY - this.dragStartEvent.screenY;

      this.planet.scale += x * 0.0005;
      this.planet.magnitude += y * 0.0005;

      this.planet.scale = Math.max(Math.min(this.planet.scale, 10.0), 0.1);
      this.planet.magnitude = Math.max(Math.min(this.planet.magnitude, 0.9), 0.0);

      console.log(`scale: ${this.planet.scale}, magnitude: ${this.planet.magnitude}`);

      this.planet.needsRegeneration = true;
      this.dragStartEvent = event;
    }
  }
}

export default Game;
