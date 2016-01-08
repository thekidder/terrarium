import _ from 'underscore';
import Simplex from 'simplex-noise';
import THREE from 'three.js';
import Random from 'random-seed';

import Heightmap from './heightmap.js';
import PlanetMath from './planet-math.js';

class Planet {
  constructor(scene) {
    this.scale = 1.5;
    this.magnitude = 0.25;
    this.waterHeight = 1.02;
    this.sandThreshold = 0.3;

    this.scene = scene;
    this.t = 0;

    // this.material = new THREE.MeshFaceMaterial([
    //   new THREE.MeshPhongMaterial({
    //     color: 0xD5C071,
    //     emissive: 0x382E07,
    //     side: THREE.DoubleSide,
    //     shading: THREE.FlatShading,
    //   }),
    //   new THREE.MeshPhongMaterial({
    //     color: 0x44991D,
    //     emissive: 0x1E430D,
    //     side: THREE.DoubleSide,
    //     shading: THREE.FlatShading,
    //   }),
    // ]);

    this.material = new THREE.MeshPhongMaterial({
      color: 0xD5C071,
      emissive: 0x382E07,
      side: THREE.DoubleSide,
      shading: THREE.FlatShading,
    });

    this.seed = Math.random();
    this.rotation = 0.0;
    this.needsRegeneration = true;

    const waterGeometry = new THREE.IcosahedronGeometry(1, 3);
    const waterMaterial = new THREE.MeshPhongMaterial({
      color: 0x214EA1,
      emissive: 0x0E2143,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
      shading: THREE.FlatShading,
    });
    this.waterSimplex = new Simplex(Math.random);
    this.waterSphere = new THREE.Mesh(waterGeometry, waterMaterial);
    this.scene.add(this.waterSphere);

    this.waterSphere.geometry.vertices.forEach(function(v) {
      v.original = v.clone();
    });

    this.generatePlanet(this.scale, this.magnitude);
  }

  generatePlanet(s, m) {
    if (this.sphere) {
      this.scene.remove(this.sphere);
    }

    const random = Random.create(this.seed);
    const simplex = new Simplex(random.random);

    const generationFunc = function(v) {
      const noise = simplex.noise3D(v.x * s, v.y * s, v.z * s);
      return 1 + noise * m * 0.5;
    };

    this.heightmap = new Heightmap(4, generationFunc);
    this.sphere = new THREE.Mesh(this.heightmap.geometry, this.material);

    this.scene.add(this.sphere);
    this.needsRegeneration = false;
  }

  update(millis) {
    if (this.needsRegeneration) {
      this.generatePlanet(this.scale, this.magnitude);
      this.needsRegeneration = false;
    }

    this.waterSphere.geometry.vertices.forEach(function(v) {
      const s = 2.4;
      let noise = this.waterSimplex.noise4D(v.original.x * s, v.original.y * s, v.original.z * s, this.t / 5000.0);
      noise = noise * 0.5 + 0.5;
      v.copy(v.original.clone().multiplyScalar(this.waterHeight - noise * 0.07));
    }.bind(this));
    this.waterSphere.geometry.verticesNeedUpdate = true;

    this.rotation += 0.001 * millis;
    this.sphere.rotation.y = this.rotation;
    this.waterSphere.rotation.y = this.rotation;
    this.t += millis;
  }

  locateFace(point) {
    return this.heightmap.locateFace(point);
  }

  placeOnSurface(cartesianCoords) {
    return this.heightmap.placeOnSurface(cartesianCoords);
  }
}

export default Planet;
