import _ from 'underscore';
import * as THREE from 'three';

import Debug from './debug.js';

const defaultOptions = {
  debug: true,
  scale: 1,
};

class Sun {
  constructor(scene, camera, size, options) {
    options = _.extend({}, defaultOptions, options || {});

    this.scene = scene;
    this.size = size;
    this.speed = (2 * Math.PI) * 0.000 * (1/60);

    this.sun = new THREE.DirectionalLight(0xF1EEC9, 0.9);
    this.scene.add(this.sun);
    this.ambient = new THREE.AmbientLight(0x4D5CA3, 0.12);
    this.scene.add(this.ambient);

    if (options.debug) {
      console.log('visualzing sun');
      const sunMaterial = new THREE.MeshPhongMaterial({
        color: 0xFFFF00,
        emissive: 0x333300,
        transparent: false,
        side: THREE.DoubleSide,
        flatShading: true,
      });
      this.sunGeometry = new THREE.IcosahedronGeometry(this.size / 50.0, 0);
      this.sunMesh = new THREE.Mesh(this.sunGeometry, sunMaterial);
      this.scene.add(this.sunMesh);
    }

    this.position = new THREE.Vector3(1, 0, 0);
    this.sunRotationVector = new THREE.Vector3(0, 0, 1);
  }

  update(millis) {
    this.position.applyAxisAngle(this.sunRotationVector, -millis * this.speed);
    this.sun.position.copy(this.position);
    this.sun.position.normalize();
    if (this.sunMesh) {
      this.sunMesh.position.copy(this.sun.position.clone().multiplyScalar(this.size * 1.2));
    }
  }
}

export { Sun };
