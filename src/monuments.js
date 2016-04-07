import THREE from 'three.js';

import { Position } from './position.js';

class MovementMonument {
  constructor(scene, planet, markerObj, faceNormal, position) {
    this.scene = scene;

    this.position = Position.fromCartesian(position, planet.heightmap);
    this.object = markerObj.clone();

    this.object.position.copy(position);
    this.object.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), faceNormal);
    this.scene.add(this.object);
  }
}

export default MovementMonument;
