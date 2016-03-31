import THREE from 'three';

import Debug from './debug.js';
import { Position } from './position.js';

class Nibble {
  constructor(planet, pathFactory, position) {
    this.planet = planet;
    this.pathFactory = pathFactory;
    this.marker = Debug.createMarker(new THREE.Vector3(), 0.8, 0xffffff);
    this.marker.position.copy(position);
    this.options = { debug: true };

    this.planet.sphere.add(this.marker);

    this.movementBehaviors = [];
    this.position = Position.fromCartesian(position, planet.heightmap);
    this.currentVelocity = new THREE.Vector3();
    this.lastVelocity = new THREE.Vector3();

    if (this.options.debug) {
      this.debugVelocity = Debug.createMarkerLine(new THREE.Vector3(), new THREE.Vector3(), 0xff0000);
      this.planet.sphere.add(this.debugVelocity);
    }
  }

  wander() {
    this.movementBehaviors.length = 0;
    this.movementBehaviors.push(this.pathFactory.wander(this.position));
  }

  pathTo(dest) {
    this.movementBehaviors.length = 0;
    this.movementBehaviors.push(this.pathFactory.findPath(this.position, Position.fromCartesian(dest.clone(), this.planet.heightmap)));
  }

  update(millis) {
    this.move(millis);
  }

  move(millis) {
    this.currentVelocity.set(0, 0, 0);
    for (const behavior of this.movementBehaviors) {
      const v = behavior.update(millis, this.lastVelocity, this.position);
      this.currentVelocity.add(v);

      if (behavior.options.debug) {
        if (!behavior.debugVelocity) {
          behavior.debugVelocity = Debug.createMarkerLine(new THREE.Vector3(), new THREE.Vector3(), 0x00ff00);
          this.planet.sphere.add(behavior.debugVelocity);
        }

        Debug.drawDebugVelocity(behavior.debugVelocity, this.position.cartesian, v);
      }
    }

    // ensure velocity is on planet surface
    this.currentVelocity.add(this.position.cartesian);
    this.currentVelocity.copy(this.planet.heightmap.placeOnSurface(this.currentVelocity));
    this.currentVelocity.sub(this.position.cartesian);

    if (this.debugVelocity) {
      Debug.drawDebugVelocity(this.debugVelocity, this.position.cartesian, this.currentVelocity);
    }

    this.lastVelocity.copy(this.currentVelocity);
    this.position.cartesian.add(this.currentVelocity.multiplyScalar(millis * 0.001));
    this.position.cartesian.copy(this.planet.heightmap.placeOnSurface(this.position.cartesian));
    this.position.setCartesian(this.position.cartesian);

    this.marker.position.copy(this.position.cartesian);
  }

  toJSON() {
    return {
      position: {
        x: this.marker.position.x,
        y: this.marker.position.y,
        z: this.marker.position.z,
      },
    };
  }
};

export default Nibble;
