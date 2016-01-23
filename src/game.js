import Random from 'random-seed';
import Simplex from 'simplex-noise';
import THREE from 'three.js';

import Debug from './debug.js';
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

    this.pathMarkers = [];
    // positions will be set when path is found
    this.startMarker = Debug.createMarker(new THREE.Vector3(), 0.02, 0x00ff00);
    this.endMarker = Debug.createMarker(new THREE.Vector3(), 0.02, 0xff0000);

    this.nibblePos = new THREE.Vector3();
    this.findPath();
    this.nibblePos.copy(this.planet.faceCentroid(this.path[0]));

    this.nibble = Debug.createMarker(new THREE.Vector3(), 0.02, 0xffffff);

    this.planet.sphere.add(this.startMarker);
    this.planet.sphere.add(this.endMarker);
    this.planet.sphere.add(this.nibble);

    this.velocity = new THREE.Vector3();
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

    this.totalMillis += millis;
    this.planet.update(millis);

    const oldFace = this.pathIndex;

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
      const face = this.planet.locateFace(this.nibble.position).faceIndex;
      console.log(`diverted to ${face}`);
      this.findPath(
          face,
          this.path[this.path.length - 1]);
      return;
    }

    const face = this.planet.heightmap.geometry.faces[this.path[this.pathIndex]];

    if (oldFace != this.pathIndex) {
      console.log(`last: ${this.path[oldFace]} curr: ${this.path[this.pathIndex]} next: ${this.path[this.pathIndex + 1]}`);
      const last = this.planet.heightmap.geometry.faces[this.path[oldFace]];
      this.nibblePos = this.nibblePos.clone()
          .applyMatrix4(last.fromFaceBasis)
          .applyMatrix4(face.toFaceBasis);
      console.log(`pos after ${JSON.stringify(this.nibblePos)}`);

      this.velocity
          .applyMatrix4(last.fromFaceBasis)
          .applyMatrix4(face.toFaceBasis);
      this.velocity.z = 0;
      //this.velocity.set(0, 0, 0);
    }

    const edge = this.planet.navmesh.findEdge(this.path[this.pathIndex], this.path[this.pathIndex + 1]);

    const pointOnLine = edge.point.clone().add(
        edge.direction.clone().multiplyScalar(
              this.nibblePos.clone().sub(edge.point).dot(edge.direction)));

    console.log(`pos: ${JSON.stringify(this.nibblePos)}`);
    console.log(`edge: ${JSON.stringify(edge.point)} ${JSON.stringify(edge.direction)}`);
    console.log(`point: ${JSON.stringify(pointOnLine)}`);
    const accel = 0.00006;
    const speed = 0.0001;

    const direction = pointOnLine
        .sub(this.nibblePos);
    //direction.z = 0;
    direction.normalize()
        .multiplyScalar(speed * millis);

    console.log(`direction: ${JSON.stringify(direction)}`);

    // const direction = dest.clone()
    //     .sub(this.nibble.position)
    //     .normalize()
    //     .multiplyScalar(accel * millis);

    // this.velocity.copy(direction);

    // if (this.velocity.lengthSq() > speed * speed) {
    //   this.velocity.normalize().multiplyScalar(speed);
    // }

    this.nibblePos.add(direction);

    this.nibble.position.copy(this.nibblePos)
        .applyMatrix4(face.fromFaceBasis);

    const cartesianDirection = direction.clone()
        .applyMatrix4(face.fromFaceBasis);
    cartesianDirection
        .normalize()
        .multiplyScalar(0.3);

    this.directionMarker = Debug.createMarkerLine(
        this.nibble.position.clone(),
        this.nibble.position.clone().add(cartesianDirection),
        0x0000ff);

    this.scene.add(this.directionMarker);

    const pos = this.nibble.position.clone()
        .normalize().multiplyScalar(3);

    this.camera.position.copy(pos);
    this.camera.up = new THREE.Vector3(0,0,1);
    this.camera.lookAt(new THREE.Vector3(0, 0, 0));

    const v = this.velocity.clone()
        .applyMatrix4(face.fromFaceBasis);

    console.log(`pos ${JSON.stringify(this.nibblePos)}`);
  }

  findPath(start, end) {
    start = start || (!!this.path ? this.path[this.path.length - 1]: null);
    this.path = null;
    while (this.path == null) {
      this.path = this.planet.findPath(start, end);
    }

    console.log(`node ${this.path[0]} is connected to ${this.planet.connectedness(this.path[0])} other nodes`);

    this.pathIndex = 0;

    this.startMarker.position.copy(this.planet.faceCentroid(this.path[0]));
    this.endMarker.position.copy(this.planet.faceCentroid(this.path[this.path.length - 1]));

    // remove old path visualization
    for (const marker of this.pathMarkers) {
      this.scene.remove(marker);
    }
    // draw new path visualization
    this.pathMarkers = [];
    for (const faceIndex of this.path) {
      const face = this.planet.heightmap.geometry.faces[faceIndex];
      const pos = this.planet.heightmap.geometry.vertices[face.a].clone()
          .add(this.planet.heightmap.geometry.vertices[face.b])
          .add(this.planet.heightmap.geometry.vertices[face.c])
          .multiplyScalar(1 / 3);
      const marker = Debug.createMarker(pos, 0.01, 0xff00ff);
      this.pathMarkers.push(marker);
      this.scene.add(marker);
    }
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
