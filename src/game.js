import Random from 'random-seed';
import Simplex from 'simplex-noise';
import THREE from 'three.js';

import Debug from './debug.js';
import PathFactory from './path.js';
import Planet from './planet.js';
import PlanetMath from './planet-math.js';

class Game {
  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera( 75, 1.0, 0.1, 1000 ); // aspect will get set in onResize

    this.populateScene();
    this.planet = new Planet(this.scene);

    this.pathMarkers = [];
    // positions will be set when path is found
    this.startMarker = Debug.createMarker(new THREE.Vector3(), 0.02, 0x00ff00);
    this.endMarker = Debug.createMarker(new THREE.Vector3(), 0.02, 0xff0000);

    this.nibble = Debug.createMarker(new THREE.Vector3(), 0.02, 0xffffff);
    this.nibble.position.copy(this.planet.heightmap.faceCentroidCartesian(this.planet.randomFace()));

    this.planet.sphere.add(this.startMarker);
    this.planet.sphere.add(this.endMarker);
    this.planet.sphere.add(this.nibble);

    this.velocity = new THREE.Vector3();

    const destFace = this.planet.randomFace();
    const dest = this.planet.heightmap.faceCentroidCartesian(destFace);

    this.pathFactory = new PathFactory(this.planet.heightmap, this.planet.navmesh, this.planet.sphere);
    this.pather = this.pathFactory.findPath(this.nibble.position, dest);
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
    if (!!this.directionMarker) {
      this.scene.remove(this.directionMarker);
    }

    this.planet.update(millis);

    if (this.pather.isPathable()) {
      this.pather.step(millis);
    }
    this.nibble.position.copy(this.pather.currentPos.cartesian);

    const pos = this.nibble.position.clone()
        .normalize().multiplyScalar(3);

    this.camera.position.copy(pos);
    this.camera.up = new THREE.Vector3(0,0,1);
    this.camera.lookAt(new THREE.Vector3(0, 0, 0));
  }

  findPath(start, end) {
    start = start || (!!this.path ? this.path[this.path.length - 1]: null);
    this.path = null;
    while (this.path == null) {
      this.path = this.planet.findPath(start, end);
    }

    console.log(`node ${this.path[0]} is connected to ${this.planet.connectedness(this.path[0])} other nodes`);

    this.pathIndex = 0;

    this.startMarker.position.copy(this.faceCenter(this.path[0]));
    this.endMarker.position.copy(this.faceCenter(this.path[this.path.length - 1]));

    // remove old path visualization
    for (const marker of this.pathMarkers) {
      this.scene.remove(marker);
    }
    // draw new path visualization
    this.pathMarkers = [];
    for (const faceIndex of this.path) {
      const marker = Debug.createMarker(this.faceCenter(faceIndex), 0.01, 0xff00ff);
      this.pathMarkers.push(marker);
      this.scene.add(marker);
    }
  }

  faceCenter(faceIndex) {
    const face = this.planet.heightmap.geometry.faces[faceIndex];
    return this.planet.heightmap.geometry.vertices[face.a].clone()
        .add(this.planet.heightmap.geometry.vertices[face.b])
        .add(this.planet.heightmap.geometry.vertices[face.c])
        .multiplyScalar(1 / 3);
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
