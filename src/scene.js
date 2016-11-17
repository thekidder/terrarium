import _ from 'underscore';
import THREE from 'three';

import Debug from './debug.js';

const defaultOptions = {
  debug: false,
  scale: 1,
};

class Sun {
  constructor(scene, camera, options) {
    options = _.extend({}, defaultOptions, options || {});

    this.scene = scene;
    this.speed = (2 * Math.PI) * 0.001 * (1/60);

    this.sun = new THREE.DirectionalLight(0xF1EEC9, 0.9);
    this.scene.add(this.sun);
    this.ambient = new THREE.AmbientLight(0x4D5CA3, 0.12);
    this.scene.add(this.ambient);

    this.position = new THREE.Vector3(1, 0, 0);
    this.sunRotationVector = new THREE.Vector3(0, 0, 1);
  }

  update(millis) {
    this.position.applyAxisAngle(this.sunRotationVector, -millis * this.speed);
    this.sun.position.copy(this.position);
    this.sun.position.normalize();
  }
}

export { Sun };
