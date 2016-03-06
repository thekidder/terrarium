import _ from 'underscore';
import THREE from 'three.js';

import Debug from './debug.js';

const defaultPathOptions = {
  accel: 0.00005,
  maxSpeed: 0.002, // units/s
  targetDistance: 0.02,
  debug: false,
};

class Position {
  constructor(heightmap) {
    this.heightmap = heightmap;
  }

  static fromCartesian(cartesian, heightmap) {
    const pos = new Position(heightmap);
    pos.setCartesian(cartesian);
    return pos;
  }

  static fromFace(face, heightmap) {
    const pos = new Position(heightmap);
    pos.setFace(face);
    return pos;
  }

  setFace(face) {
    this.face = face;
    this.cartesian = this.heightmap.fromFaceCoords(face);
  }

  setCartesian(cartesian) {
    this.cartesian = cartesian;
    this.face = this.heightmap.toFaceCoords(this.cartesian);
  }
}

class Pather {
  constructor(startPos, destPos, heightmap, navmesh, planet, options) {
    this.currentPos = startPos;
    this.destPos = destPos;
    this.heightmap = heightmap;
    this.navmesh = navmesh;
    this.planet = planet;
    this.options = options;
    this.options.targetDistanceSq = this.options.targetDistance * this.options.targetDistance;
    this.velocity = new THREE.Vector3();
    this.currentFaceIndex = this.currentPos.face.face.faceIndex;

    if (this.options.debug) {
      this.debugVelocity = Debug.createMarkerLine(new THREE.Vector3(), new THREE.Vector3(), 0xff00ff);
      this.planet.add(this.debugVelocity);

      this.currentFaceDebug = Debug.createMarker(new THREE.Vector3(), 0.02,  0x00ff00);
      this.planet.add(this.currentFaceDebug);

      this.currentDestDebug = Debug.createMarker(new THREE.Vector3(), 0.02,  0xff0000);
      this.planet.add(this.currentDestDebug);
    }

    this.repath();
  }

  repath() {
    const startIndex = this.currentPos.face.face.faceIndex;
    const endIndex = this.destPos.face.face.faceIndex;
    this.path = this.navmesh.findPath(startIndex, endIndex);
    console.log(`pathable? ${this.isPathable()}`);
  }

  isPathable() {
    return this.path !== null;
  }

  step(millis) {
    if (!this.isPathable()) { return; }

    if (this.destPos.cartesian.distanceToSquared(this.currentPos.cartesian) < this.options.targetDistanceSq) {
      this.velocity.set(0, 0, 0);
      if (this.options.debug) {
        this.debugVelocity.geometry.vertices[0].copy(this.currentPos.cartesian);
        this.debugVelocity.geometry.vertices[1].copy(this.currentPos.cartesian);
        this.debugVelocity.geometry.verticesNeedUpdate = true;
      }
      return;
    }

    let pathIndex = this.path.indexOf(this.currentFaceIndex);
    if (pathIndex == -1) {
      this.repath();
      this.currentFaceIndex = this.heightmap.locateFace(this.currentPos.cartesian).faceIndex;
      pathIndex = this.path.indexOf(this.currentFaceIndex);
    }

    const dest = this.getNextDestination(pathIndex);
    const face = this.heightmap.geometry.faces[this.currentFaceIndex];

    if (this.options.debug) {
      this.currentFaceDebug.position.copy(this.heightmap.faceCentroidCartesian(face));
      this.currentDestDebug.position.copy(dest);
    }

    const direction = this.getDeltaV(
        this.velocity, this.currentPos.cartesian, dest, pathIndex == this.path.length - 1);

    this.velocity.add(direction);

    const speed = this.options.maxSpeed;
    this.velocity.applyMatrix4(face.toFaceVector);
    this.velocity.z = 0.0;
    this.velocity.applyMatrix4(face.fromFaceVector);

    if (this.velocity.lengthSq() > speed * speed) {
      this.velocity.setLength(speed);
    }

    if (this.options.debug) {
      this.debugVelocity.geometry.vertices[0].copy(this.currentPos.cartesian);
      this.debugVelocity.geometry.vertices[1].copy(this.currentPos.cartesian)
          .add(this.velocity.clone().setLength(0.1));
      this.debugVelocity.geometry.verticesNeedUpdate = true;
    }

    this.currentPos.setCartesian(this.currentPos.cartesian.add(this.velocity));
    this.currentFaceIndex = this.heightmap.locateFace(this.currentPos.cartesian).faceIndex;
  }

  // in cartesian space
  getNextDestination(pathIndex) {
    if (pathIndex == this.path.length - 1) {
      // path within the current (last) face
      return this.destPos.cartesian;
    } else {
      // path to next face
      return this.navmesh.findCentroid(this.path[pathIndex], this.path[pathIndex + 1]);
    }
  }

  getDeltaV(velocity, current, nextWaypoint, finalWaypoint) {
    const direction = nextWaypoint.clone().sub(current); // desired direction

    if (!finalWaypoint) {
      direction.setLength(this.options.maxSpeed);
    }

    // we want the vector that when added to our current velocity yields the desired direction
    direction.sub(velocity);

    // this vector is subject to our maximum acceleration
    if (direction.lengthSq() > this.options.accel * this.options.accel) {
      direction.setLength(this.options.accel);
    }

    return direction;
  }
}

class PathFactory {
  constructor(heightmap, navmesh, planet, options) {
    this.heightmap = heightmap;
    this.navmesh = navmesh;
    this.planet = planet;
    this.options = _.extend({}, defaultPathOptions, options || {});
  }

  /**
   * All arguments are cartesian positions
   */
  findPath(startPos, destPos) {
    return new Pather(
        Position.fromCartesian(startPos.clone(), this.heightmap),
        Position.fromCartesian(destPos.clone(), this.heightmap),
        this.heightmap,
        this.navmesh,
        this.planet,
        this.options);
  }
}

export default PathFactory;
