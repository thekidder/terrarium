import _ from 'underscore';
import Simplex from 'simplex-noise';
import THREE from 'three';

import Debug from './debug.js';
import PlanetMath from './planet-math.js';

const defaultOptions = {
  accel: 0.008,
  maxSpeed: 0.1, // units/s
  targetDistance: 0.5,
  debug: true,
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
  constructor(startPos, destPos, planet, options) {
    this.currentPos = startPos;
    this.destPos = destPos;
    this.planet = planet;
    this.options = options;
    this.options.targetDistanceSq = this.options.targetDistance * this.options.targetDistance;
    this.velocity = new THREE.Vector3();
    this.currentFaceIndex = this.currentPos.face.face.faceIndex;

    if (this.options.debug) {
      this.debugVelocity = Debug.createMarkerLine(new THREE.Vector3(), new THREE.Vector3(), 0xff00ff);
      this.planet.sphere.add(this.debugVelocity);

      this.currentFaceDebug = Debug.createMarker(new THREE.Vector3(), 0.02,  0x00ff00);
      this.planet.sphere.add(this.currentFaceDebug);

      this.currentDestDebug = Debug.createMarker(new THREE.Vector3(), 0.02,  0xff0000);
      this.planet.sphere.add(this.currentDestDebug);
    }

    this.repath();
  }

  repath() {
    const startIndex = this.currentPos.face.face.faceIndex;
    const endIndex = this.destPos.face.face.faceIndex;
    this.path = this.planet.navmesh.findPath(startIndex, endIndex);
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
      this.currentFaceIndex = this.planet.heightmap.locateFace(this.currentPos.cartesian).faceIndex;
      pathIndex = this.path.indexOf(this.currentFaceIndex);
    }

    const dest = this.getNextDestination(pathIndex);
    const face = this.planet.heightmap.geometry.faces[this.currentFaceIndex];

    if (this.options.debug) {
      this.currentFaceDebug.position.copy(this.planet.heightmap.faceCentroidCartesian(face));
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
    this.currentFaceIndex = this.planet.heightmap.locateFace(this.currentPos.cartesian).faceIndex;
  }

  // in cartesian space
  getNextDestination(pathIndex) {
    if (pathIndex == this.path.length - 1) {
      // path within the current (last) face
      return this.destPos.cartesian;
    } else {
      // path to next face
      return this.planet.navmesh.findCentroid(this.path[pathIndex], this.path[pathIndex + 1]);
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

class Wanderer {
  constructor(planet, position, options) {
    this.planet = planet;
    this.position = position;
    this.simplex = new Simplex();
    this.velocity = this.randomFaceVelocity(position);
    this.rotation = new THREE.Quaternion();
    this.t = 0;

    if (options.debug) {
      this.debugVelocity = Debug.createMarkerLine(new THREE.Vector3(), new THREE.Vector3(), 0xff0000);
      this.planet.sphere.add(this.debugVelocity);
    }
  }

  randomFaceVelocity(pos) {
    const faceCoords = this.planet.heightmap.toFaceCoords(pos);
    faceCoords.uv.x += Math.random() * 2 - 1;
    faceCoords.uv.y += Math.random() * 2 - 1;
    const direction = this.planet.heightmap.fromFaceCoords(faceCoords);
    direction.sub(pos).normalize();
    return direction;
  }

  step(millis) {
    const angle = this.simplex.noise2D(this.t, 0);
    this.rotation.setFromAxisAngle(this.position, angle * millis * 0.0002);
    this.velocity.applyQuaternion(this.rotation);

    const dest = this.position.clone().add(this.velocity);
    dest.copy(this.planet.heightmap.placeOnSurface(dest));
    this.velocity.copy(dest.sub(this.position));
    this.velocity.normalize();

    if (this.debugVelocity) {
      this.debugVelocity.geometry.vertices[0].copy(this.position);
      this.debugVelocity.geometry.vertices[1].copy(this.position.clone().add(this.velocity));
      this.debugVelocity.geometry.verticesNeedUpdate = true;
    }


    const v = this.velocity.clone().multiplyScalar(millis * 0.003);

    this.position.add(v);

    this.position.copy(this.planet.heightmap.placeOnSurface(this.position));
    this.t += millis / 1500.0;
  }
}


class PathFactory {
  constructor(planet, options) {
    this.planet = planet;
    this.options = _.extend({}, defaultOptions, options || {});
  }

  /**
   * All arguments are cartesian positions
   */
  findPath(startPos, destPos) {
    return new Pather(
        Position.fromCartesian(startPos.clone(), this.planet.heightmap),
        Position.fromCartesian(destPos.clone(), this.planet.heightmap),
        this.planet,
        this.options);
  }

  wander(position) {
    return new Wanderer(
        this.planet,
        position,
        this.options);
  }
}

export default PathFactory;
