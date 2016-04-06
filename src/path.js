import _ from 'underscore';
import Simplex from 'simplex-noise';
import THREE from 'three';

import Debug from './debug.js';
import PlanetMath from './planet-math.js';

const defaultOptions = {
  accel: 0.02, // units/s/s
  maxSpeed: 2, // units/s
  rotationSpeed: 0.2, // rads/s
  targetDistance: 0.5,
  debug: false,
};

class PathToBehavior {
  constructor(startPos, destPos, planet, options) {
    this.destPos = destPos;
    this.planet = planet;
    this.options = options;
    this.options.targetDistanceSq = this.options.targetDistance * this.options.targetDistance;
    this.velocity = new THREE.Vector3();

    if (this.options.debug) {
      this.currentFaceDebug = Debug.createMarker(new THREE.Vector3(), 0.5,  0x00ff00);
      this.planet.sphere.add(this.currentFaceDebug);

      this.currentDestDebug = Debug.createMarker(new THREE.Vector3(), 0.5,  0xff0000);
      this.planet.sphere.add(this.currentDestDebug);
    }

    this.repath(startPos);
  }

  repath(startPos) {
    const startIndex = startPos.face.face.faceIndex;
    const endIndex = this.destPos.face.face.faceIndex;
    this.path = this.planet.navmesh.findPath(startIndex, endIndex);
    console.log(`pathable? ${this.isPathable()}`);
  }

  isPathable() {
    return this.path !== null;
  }

  update(millis, lastVelocity, position) {
    if (!this.isPathable()) {
      this.velocity.set(0, 0, 0);
      return this.velocity;
    }

    if (this.destPos.cartesian.distanceToSquared(position.cartesian) < this.options.targetDistanceSq) {
      this.velocity.set(0, 0, 0);
      return this.velocity;
    }

    this.velocity.copy(lastVelocity);

    const currentFaceIndex = position.face.face.faceIndex;
    let pathIndex = this.path.indexOf(currentFaceIndex);
    if (pathIndex == -1) {
      this.repath(position);
      pathIndex = this.path.indexOf(currentFaceIndex);
    }

    const dest = this.getNextDestination(pathIndex);
    const face = position.face.face;

    if (this.options.debug) {
      this.currentFaceDebug.position.copy(this.planet.heightmap.faceCentroidCartesian(face));
      this.currentDestDebug.position.copy(dest);
    }

    const direction = this.getDeltaV(
        this.velocity, position.cartesian, dest, pathIndex == this.path.length - 1);

    this.velocity.add(direction);

    if (this.velocity.lengthSq() > this.options.maxSpeed * this.options.maxSpeed) {
      this.velocity.setLength(this.options.maxSpeed);
    }

    return this.velocity;
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

class WanderBehavior {
  constructor(position, planet, options) {
    this.planet = planet;
    this.simplex = new Simplex();
    this.timeSimplex = new Simplex();
    this.options = options;
    this.rotation = new THREE.Quaternion();
    this.dest = new THREE.Vector3();
    this.t = 0;
    this.rawT = 0;

    this.velocity = this.randomFaceVelocity(position);

    if (options.debug) {
      this.debugVelocity = Debug.createMarkerLine(new THREE.Vector3(), new THREE.Vector3(), 0xff0000);
      this.debugVelocityWater = Debug.createMarkerLine(new THREE.Vector3(), new THREE.Vector3(), 0x00ff00);
      this.planet.sphere.add(this.debugVelocity);
      this.planet.sphere.add(this.debugVelocityWater);
    }
  }

  randomFaceVelocity(pos) {
    const direction = pos.clone();
    direction.face.uv.x += Math.random() * 2 - 1;
    direction.face.uv.y += Math.random() * 2 - 1;
    direction.setFace(direction.face);
    return direction.cartesian.sub(pos.cartesian).normalize().multiplyScalar(this.options.maxSpeed);
  }

  update(millis, lastVelocity, position) {
    const angle = this.simplex.noise2D(this.t, 0);
    this.rotation.setFromAxisAngle(position.cartesian, angle * millis * 0.001 * this.options.rotationSpeed);
    this.velocity.copy(lastVelocity);
    this.velocity.applyQuaternion(this.rotation);

    this.velocity.normalize().multiplyScalar(this.options.maxSpeed);

    const speed = this.getAdvancement(millis);

    this.t += millis * speed / 1500;
    return this.velocity.multiplyScalar(speed);
  }

  getAdvancement(millis) {
    const t = Math.max(0.0, this.timeSimplex.noise2D(this.rawT, 0) * 0.5 + 0.5 - 0.05);

    this.rawT += millis / 8000;

    return t;
  }
}

class AvoidWaterBehavior {
  constructor(planet, options) {
    this.planet = planet;
    this.options = options;
    this.velocity = new THREE.Vector3();
  }

  update(millis, lastVelocity, position) {
    if (position.cartesian.lengthSq() < this.planet.size * this.planet.size) {
      const face = position.face.face;
      const highestVert = _.max(
          [face.a, face.b, face.c],
          function(v) { return this.planet.heightmap.geometry.vertices[v].lengthSq(); }.bind(this));
      this.velocity.copy(this.planet.heightmap.geometry.vertices[highestVert]).sub(position.cartesian)
          .normalize()
          .multiplyScalar((this.planet.size * this.planet.size - position.cartesian.lengthSq()) / (this.planet.size * this.planet.size))
          .multiplyScalar(40);
    } else {
      this.velocity.set(0, 0, 0);
    }
    return this.velocity;
  }
}

class ConstrainToRadiusBehavior {
  constructor(position, radius, planet, options) {
    this.position = position.cartesian.clone();
    this.radius = radius;
    this.radiusSq = radius * radius;
    this.options = options;
    this.velocity = new THREE.Vector3();

    if (this.options.debug) {
      this.constraintPoint = Debug.createMarker(new THREE.Vector3(), 0.5,  0x0000ff);
      planet.sphere.add(this.constraintPoint);
      this.constraintPoint.position.copy(position.cartesian);

      this.constraintLine = Debug.createMarkerLine(new THREE.Vector3(), new THREE.Vector3(), 0x0000ff);
      planet.sphere.add(this.constraintLine);
    }
  }

  update(millis, lastVelocity, position) {
    const distSq = position.cartesian.distanceToSquared(this.position);

    if (distSq > this.radiusSq) {
      this.velocity.copy(this.position).sub(position.cartesian)
          .normalize()
          .multiplyScalar((distSq - this.radiusSq) / this.radiusSq)
          .multiplyScalar(0.05);
    } else {
      this.velocity.set(0, 0, 0);
    }

    if (this.constraintLine) {
      this.constraintLine.geometry.vertices[0].copy(this.position);
      this.constraintLine.geometry.vertices[1].copy(position.cartesian).sub(this.position).setLength(this.radius).add(this.position);
      this.constraintLine.geometry.verticesNeedUpdate = true;
    }

    return this.velocity;
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
    return new PathToBehavior(
        startPos,
        destPos,
        this.planet,
        this.options);
  }

  wander(position) {
    return new WanderBehavior(
        position,
        this.planet,
        this.options);
  }

  constrainToRadius(position, radius) {
    return new ConstrainToRadiusBehavior(position, radius, this.planet, this.options);
  }

  avoidWater() {
    return new AvoidWaterBehavior(this.planet, this.options);
  }
}

export default PathFactory;
