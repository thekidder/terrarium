import THREE from 'three.js';

class MovementMonument {
  constructor(scene, markerObj, faceNormal, position) {
    this.scene = scene;
    this.markerObj = markerObj.clone();

    this.markerObj.position.copy(position);
    this.markerObj.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), faceNormal);
    this.scene.add(this.markerObj);
  }
}

export default MovementMonument;
