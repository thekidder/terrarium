import THREE from 'three';

import Debug from './debug.js';

class Nibble {
  constructor(planet, pathFactory, position) {
    this.planet = planet;
    this.pathFactory = pathFactory;
    this.marker = Debug.createMarker(new THREE.Vector3(), 0.8, 0xffffff);
    this.marker.position.copy(position);

    this.planet.sphere.add(this.marker);
  }

  wander() {
    if (!this.wanderBehavior) {
      this.wanderBehavior = this.pathFactory.wander(this.marker.position);
    }
    this.pather = null;
  }

  pathTo(dest) {
    this.pather = this.pathFactory.findPath(this.marker.position, dest);
    this.wanderBehavior = null;
  }

  update(millis) {
    if (this.pather && this.pather.isPathable()) {
      this.pather.step(millis);
      this.marker.position.copy(this.pather.currentPos.cartesian);
    }

    if (this.wanderBehavior) {
      this.wanderBehavior.step(millis);
    }
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
