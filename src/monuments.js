import THREE from 'three';

import { Position } from './position.js';

class MovementMonument {
  constructor(scene, planet, markerObj, faceNormal, position) {
    this.scene = scene;

    this.position = Position.fromCartesian(position, planet.heightmap);
    this.object = markerObj.clone();
    this.scale = 0;

    this.object.position.copy(position);
    const spin = Math.random() * Math.PI * 2;
    const faceDirection = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), faceNormal);
    this.object.quaternion
        .setFromAxisAngle(faceNormal, spin)
        .multiply(faceDirection);

    this.scene.add(this.object);
  }

  update(millis) {
    if (this.scale < 1) {
      this.object.scale.set(this.scale, this.scale, this.scale);
      this.scale += millis * 0.001 * 0.75;
    }
  }
}

export default MovementMonument;
