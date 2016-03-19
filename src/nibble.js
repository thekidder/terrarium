import THREE from 'three';

import Debug from './debug.js';

class Nibble {
  constructor(planet, pathFactory, position) {
    this.planet = planet;
    this.pathFactory = pathFactory;
    this.marker = Debug.createMarker(new THREE.Vector3(), 0.02, 0xffffff);
    this.marker.position.copy(position);

    this.planet.sphere.add(this.marker);
  }

  pathTo(dest) {
    this.pather = this.pathFactory.findPath(this.marker.position, dest);
  }

  update(millis) {
    if (this.pather.isPathable()) {
      this.pather.step(millis);
    }
    this.marker.position.copy(this.pather.currentPos.cartesian);
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
