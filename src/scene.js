import THREE from 'three.js';

import Debug from './debug.js';

const Scene = {
  populate(scene, options) {
    options = options || {};

    const lights = [
      { intensity: 0.8, position: new THREE.Vector3(0, 10, 0), debugColor: 0xff0000 },
      { intensity: 0.7, position: new THREE.Vector3(3, 3, 3), debugColor: 0x00ff00 },
      { intensity: 0.8, position: new THREE.Vector3(-3, -3, -3), debugColor: 0x0000ff },
    ];

    for (const lightInfo of lights) {
      scene.add(Debug.createMarker(lightInfo.position, 0.05, lightInfo.debugColor));
      const light = new THREE.PointLight(0xffffff, lightInfo.intensity, 300, 2);
      light.position.copy(lightInfo.position);
      scene.add(light);
    }

    if (options.debug) {
      // debug axes
      scene.add(Debug.createMarkerLine(
          new THREE.Vector3(), new THREE.Vector3(2, 0, 0), 0xff0000));

      scene.add(Debug.createMarkerLine(
          new THREE.Vector3(), new THREE.Vector3(0, 2, 0), 0x00ff00));

      scene.add(Debug.createMarkerLine(
          new THREE.Vector3(), new THREE.Vector3(0, 0, 2), 0x0000ff));
    }
  }
}

export default Scene;