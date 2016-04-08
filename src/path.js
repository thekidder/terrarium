import _ from 'underscore';
import Simplex from 'simplex-noise';
import THREE from 'three';

import Debug from './debug.js';
import PlanetMath from './planet-math.js';

const defaultOptions = {
  accel: 0.02, // units/s/s
  maxSpeed: 2, // units/s
  rotationSpeed: 0.13, // rads/s
  targetDistance: 0.5,

  // monument
  innerWanderRadius: 4.0,
  pathToRadius: 10.0,
  outerWanderRadius: 20.0,

  debug: true,
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
      this.currentDestDebug = Debug.createMarker(new THREE.Vector3(), 0.5,  0xff0000);
    }

    this.repath(startPos);
  }

  isActive(lastVelocity, position) { return true; }

  activate() {
    if (this.options.debug) {
      this.planet.sphere.add(this.currentFaceDebug);
      this.planet.sphere.add(this.currentDestDebug);
    }
  }

  deactivate() {
    if (this.options.debug) {
      this.planet.sphere.remove(this.currentFaceDebug);
      this.planet.sphere.remove(this.currentDestDebug);
    }
  }

  repath(startPos) {
    const startIndex = startPos.face.face.faceIndex;
    const endIndex = this.destPos.face.face.faceIndex;
    this.path = this.planet.navmesh.findPath(startIndex, endIndex);
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
  }

  isActive(lastVelocity, position) { return true; }

  activate() {}

  deactivate() {}

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

    this.t += millis * speed / 2200;
    return this.velocity.multiplyScalar(speed);
  }

  getAdvancement(millis) {
    const t = Math.max(0.0, this.timeSimplex.noise2D(this.rawT, 0) * 0.5 + 0.5 - 0.1);

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

  isActive(lastVelocity, position) { return true; }

  activate() {}

  deactivate() {}

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
    this.planet = planet;
    this.position = position.cartesian.clone();
    this.radius = radius;
    this.radiusSq = radius * radius;
    this.innerRadiusSq = options.innerRadius || 0;
    options.innerRadius *= options.innerRadius;
    this.options = _.extend({}, defaultOptions, options || {});
    this.velocity = new THREE.Vector3();

    if (this.options.debug) {
      this.constraintPoint = Debug.createMarker(new THREE.Vector3(), 0.5,  0x0000ff);
      this.constraintPoint.position.copy(position.cartesian);

      this.constraintLine = Debug.createMarkerLine(new THREE.Vector3(), new THREE.Vector3(), 0x0000ff);
    }
  }

  isActive(lastVelocity, position) {
    const distSq = position.cartesian.distanceToSquared(this.position);
    return distSq > this.radiusSq;
  }

  activate() {
    if (this.options.debug) {
      this.planet.sphere.add(this.constraintPoint);
      this.planet.sphere.add(this.constraintLine);
    }
  }

  deactivate() {
    if (this.options.debug) {
      this.planet.sphere.remove(this.constraintPoint);
      this.planet.sphere.remove(this.constraintLine);
    }
  }

  update(millis, lastVelocity, position) {
    const distSq = position.cartesian.distanceToSquared(this.position);

    this.velocity.copy(this.position).sub(position.cartesian)
        .normalize()
        .multiplyScalar((distSq - this.radiusSq - this.innerRadiusSq) / this.radiusSq)
        .multiplyScalar(0.1);

    if (this.constraintLine) {
      this.constraintLine.geometry.vertices[0].copy(this.position);
      this.constraintLine.geometry.vertices[1].copy(position.cartesian).sub(this.position).setLength(this.radius).add(this.position);
      this.constraintLine.geometry.verticesNeedUpdate = true;
    }

    return this.velocity;
  }
}

export class BehaviorList {
  constructor(list, planet) {
    this.planet = planet;
    this.behaviors = list;
    this.velocity = new THREE.Vector3();
  }

  isActive() { return true; }

  activate() {}

  deactivate() {}

  update(millis, lastVelocity, position) {
    this.velocity.set(0, 0, 0);

    for(const behavior of this.behaviors) {
      const isActive = behavior.isActive(lastVelocity, position);

      if (!isActive && behavior.wasActive) {
        behavior.deactivate();
        if (behavior.debugVelocity) {
          this.planet.sphere.remove(behavior.debugVelocity);
        }

      } else if (isActive && !behavior.wasActive) {
        behavior.activate();
      }

      if (isActive) {
        const v = behavior.update(millis, lastVelocity, position);
        this.velocity.add(v);

        if (behavior.options && behavior.options.debug) {
          if (!behavior.debugVelocity) {
            behavior.debugVelocity = Debug.createMarkerLine(new THREE.Vector3(), new THREE.Vector3(), 0x00ff00);
            this.planet.sphere.add(behavior.debugVelocity);
          }

          Debug.drawDebugVelocity(behavior.debugVelocity, position.cartesian, v);
        }
      }

      behavior.wasActive = isActive;
    }

    if (this.debugVelocity) {
      Debug.drawDebugVelocity(this.debugVelocity, position.cartesian, this.velocity);
    }

    return this.velocity;
  }

  clear() {
    for(const behavior of this.behaviors) {
      if (behavior.wasActive) {
        behavior.deactivate();
      }
    }

    this.behaviors.length = 0;
  }
}

class MonumentBehavior {
  constructor(currentPos, monument, planet, options) {
    this.monument = monument;
    this.planet = planet;
    this.options = _.extend({}, defaultOptions, options || {});
    this.options.innerRadius = this.options.pathToRadius;

    this.innerWanderRadiusSq = this.options.innerWanderRadius * this.options.innerWanderRadius;
    this.pathToRadiusSq = this.options.pathToRadius * this.options.pathToRadius;
    this.outerWanderRadiusSq = this.options.outerWanderRadius * this.options.outerWanderRadius;

    this.innerBehavior = new ConstrainToRadiusBehavior(monument.position, this.options.innerWanderRadius, this.planet, this.options);
    this.pathToBehavior = new PathToBehavior(currentPos, monument.position, this.planet, this.options);
    this.outerBehavior = new ConstrainToRadiusBehavior(monument.position, this.options.outerWanderRadius, this.planet, this.options);

    this.wander = new WanderBehavior(currentPos, this.planet, this.options);

    this.velocity = new THREE.Vector3();

    const sqDist = p => p.cartesian.distanceToSquared(this.monument.position.cartesian);
    const innerActive = (lastVelocity, position) => sqDist(position) < this.innerWanderRadiusSq;
    const midActive   = (lastVelocity, position) => sqDist(position) >= this.innerWanderRadiusSq && sqDist(position) < this.pathToRadiusSq;
    const outerActive = (lastVelocity, position) => sqDist(position) >= this.pathToRadiusSq && sqDist(position) < this.outerWanderRadiusSq;

    this.innerBehavior.isActive = innerActive;
    this.pathToBehavior.isActive = midActive;
    this.outerBehavior.isActive = outerActive;

    this.behaviors = new BehaviorList([this.innerBehavior, this.pathToBehavior, this.outerBehavior], planet);

  }

  isActive(lastVelocity, position) {
    const distSq = position.cartesian.distanceToSquared(this.monument.position.cartesian);
    return distSq < this.outerWanderRadiusSq;
  }

  activate() {}

  deactivate() {}

  update(millis, lastVelocity, position) {
    return this.behaviors.update(millis, lastVelocity, position);
    // const distSq = position.cartesian.distanceToSquared(this.monument.position.cartesian);

    // if (distSq < this.innerWanderRadiusSq) {
    //   this.velocity.copy(this.innerBehavior.update(millis, lastVelocity, position));
    //   this.velocity.add(this.wander.update(millis, lastVelocity, position));
    // } else if (distSq < this.pathToRadiusSq) {
    //   this.velocity.copy(this.pathToBehavior.update(millis, lastVelocity, position));
    //   //this.velocity.add(this.wander.update(millis, lastVelocity, position));
    // } else {
    //   this.velocity.copy(this.outerBehavior.update(millis, lastVelocity, position));
    //   this.velocity.add(this.wander.update(millis, lastVelocity, position));
    // }

    // return this.velocity;
  }
}


export class PathFactory {
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

  monument(pos, monument) {
    return new MonumentBehavior(pos, monument, this.planet, this.options);
  }
}
