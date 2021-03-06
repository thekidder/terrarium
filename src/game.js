import Impetus from 'impetus';
import Random from 'random-seed';
import Simplex from 'simplex-noise';
import * as THREE from 'three';

import ArcBallCamera from './arc-camera.js';
import Debug from './debug.js';
import Heightmap from './heightmap.js';
import MovementMonument from './monuments.js';
import Nibble from './nibble.js';
import { PathFactory } from './path.js';
import Planet from './planet.js';
import PlanetMath from './planet-math.js';
import { Sun } from './sun.js';


class Game {
  constructor() {
    this.scene = new THREE.Scene();
    const loader = new THREE.FileLoader();

    console.log('loading planet data...');
    loader.load('/assets/planet-data.json', this.planetLoaded.bind(this));

    this.raycaster = new THREE.Raycaster();
    this.mouseEvent = new THREE.Vector2();

    this.monuments = [];

    new THREE.ObjectLoader().load(
      'assets/flower.json',
      function ( object, materials ) {
        this.markerObj = object;
      }.bind(this)
    );
    this.startRotation = -0.6 * Math.PI;
    this.rotation = this.startRotation;
    this.cameraXOffset = document.body.clientWidth / 2;
    this.cameraYOffset = document.body.clientHeight / 2;

    this.scroller = new Impetus({
      source: document.body,
      update: this.onDragPlanet.bind(this),
    });
  }

  planetLoaded(data) {
    data = JSON.parse(data);
    console.log('loaded planet data...');

    this.camera = new ArcBallCamera(data.size * 3.3, new THREE.Vector3());
    this.camera.lookAt(new THREE.Vector3());

    if (this.currentHeight && this.currentWidth) {
      this.onResize(this.currentWidth, this.currentHeight);
    }

    this.sun = new Sun(this.scene, this.camera, data.size);

    this.planet = new Planet(this.scene, this.sun, this.camera, Heightmap.load(data.heightmap), data.size);
    this.size = data.size;
    console.log('created planet...');

    this.pathMarkers = [];
    // positions will be set when path is found
    this.startMarker = Debug.createMarker(new THREE.Vector3(), 0.02, 0x00ff00);
    this.endMarker = Debug.createMarker(new THREE.Vector3(), 0.02, 0xff0000);

    this.pathFactory = new PathFactory(this.planet);
    this.nibbles = [];
    for (const nibbleData of data.nibbles) {
      const pos = new THREE.Vector3().copy(nibbleData.position);
      const nibble = new Nibble(this.planet, this.pathFactory, pos);

      const destFace = this.planet.randomFace();
      const dest = this.planet.heightmap.faceCentroidCartesian(destFace);
      //nibble.pathTo(dest);
      nibble.wander();

      this.nibbles.push(nibble);
    }

    // this.lookAtNibbles();
  }

  lookAtNibbles() {
    const avgPos = new THREE.Vector3();
    for (const nibble of this.nibbles) {
      avgPos.add(nibble.marker.position);
    }

    avgPos.multiplyScalar(this.nibbles.length);

    const pos = avgPos.normalize().multiplyScalar(this.size * 2.2);
    this.moveCameraTo(pos);
  }

  onDragPlanet(x, y) {
    const inertia = 0.003;
    this.rotation = this.startRotation + inertia * -x;
  }

  moveCameraTo(pos) {
    this.camera.position.copy(pos);
    this.camera.position.multiplyScalar(80);
    this.camera.up = new THREE.Vector3(0, 1, 0);
    this.camera.rotate(0, 0);
  }

  beforeRender() {
    this.planet && this.planet.beforeRender();
  }

  update(millis) {
    if (!this.planet) {
      return;
    }

    if (!!this.directionMarker) {
      this.scene.remove(this.directionMarker);
    }

    this.planet.update(millis);

    for (const nibble of this.nibbles) {
      nibble.update(millis);
    }

    for (const monument of this.monuments) {
      monument.update(millis);
    }

    this.sun.update(millis);

    //this.rotation += millis * 0.00005;
    this.camPos = new THREE.Vector3(Math.sin(this.rotation), 0.0, Math.cos(this.rotation));
    this.moveCameraTo(this.camPos);

    const arcball = this.camera.getArcballVector(0, document.body.clientHeight / 2);
    arcball.multiplyScalar(-0.8);
    this.camera.rotateBy(arcball);
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
    this.currentWidth = width;
    this.currentHeight = height;
    if (this.camera) {
      this.camera.onResize(width, height);
    }
  }

  onFocus(event) {
  }

  onBlur(event) {
  }

  onKeyDown(event) {
  }

  onMouseOver(event) {
  }

  onMouseDown(event) {
    this.startDragX = event.clientX;
  }

  onMouseUp(event) {
    // if (!this.isDrag) {
    //   this.mouseEvent.x = event.clientX / window.innerWidth * 2 - 1;
    //   this.mouseEvent.y = -event.clientY / window.innerHeight * 2 + 1;

    //   // this.placeMonument(this.mouseEvent);
    // } else {
    //   const totalDrag = event.clientX - this.startDragX;
    // }
  }

  onMouseMove(event) {
    this.cameraXOffset = event.clientX;
    this.cameraYOffset = event.clientY;
  }

  placeMonument(mousePos) {
    this.raycaster.setFromCamera(mousePos, this.camera);
    //const objs = [this.planet.sphere].concat(_.map(this.markers, m => m.object));
    const intersections = this.raycaster.intersectObject(this.planet.sphere, true);

    if (intersections.length > 0) {
      const pos = this.raycaster.ray.at(intersections[0].distance);
      console.log(`adding monument at ${JSON.stringify(pos)}`);
      const monument = new MovementMonument(this.scene, this.planet, this.markerObj, intersections[0].face.normal, pos);
      this.monuments.push(monument);

      console.log(`intersection: ${intersections[0].faceIndex}`);

      for (const nibble of this.nibbles) {
        nibble.monument(monument);
      }
    }
  }
}

export default Game;
