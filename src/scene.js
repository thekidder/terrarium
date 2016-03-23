import _ from 'underscore';
import THREE from 'three';

import Debug from './debug.js';

const defaultOptions = {
  debug: false,
  scale: 1,
};

const Scene = {
  populate(scene, options) {
    options = _.extend({}, defaultOptions, options || {});

    const l = 5;

    const lights = [
      { intensity: l * 0.8, position: new THREE.Vector3(0, 10, 0).multiplyScalar(options.scale), debugColor: 0xff0000 },
      { intensity: l * 0.7, position: new THREE.Vector3(3, 3, 3).multiplyScalar(options.scale), debugColor: 0x00ff00 },
      { intensity: l * 0.8, position: new THREE.Vector3(-3, -3, -3).multiplyScalar(options.scale), debugColor: 0x0000ff },
    ];

    for (const lightInfo of lights) {
      scene.add(Debug.createMarker(lightInfo.position, 0.05, lightInfo.debugColor));
      const light = new THREE.PointLight(0xffffff, lightInfo.intensity, 300, 2);
      light.position.copy(lightInfo.position);
      scene.add(light);
    }

    if (options.debug) {
      const axisHelper = new THREE.AxisHelper(2);
      scene.add(axisHelper);
    }
  },
};

export default Scene;
