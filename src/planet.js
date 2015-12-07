import _ from 'underscore';
import Simplex from 'simplex-noise';
import THREE from 'three.js';
import Random from 'random-seed';

class Planet {
  constructor(scene) {
    this.scene = scene;
    this.t = 0;

    this.material = new THREE.MeshFaceMaterial([
      new THREE.MeshPhongMaterial({
        color: 0xD5C071,
        emissive: 0x382E07,
        side: THREE.DoubleSide,
        shading: THREE.FlatShading,
      }),
      new THREE.MeshPhongMaterial({
        color: 0x44991D,
        emissive: 0x1E430D,
        side: THREE.DoubleSide,
        shading: THREE.FlatShading,
      }),
    ]);

    this.seed = Math.random();
    this.scale = 1.5;
    this.magnitude = 0.25;
    this.rotation = 0.0;
    this.needsRegeneration = true;

    const waterGeometry = new THREE.IcosahedronGeometry(1, 4);
    const waterMaterial = new THREE.MeshPhongMaterial({
      color: 0x156289,
      emissive: 0x072534,
      side: THREE.DoubleSide,
      shading: THREE.FlatShading,
      transparent: true,
      opacity: 0.8,
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

    const geometry = new THREE.IcosahedronGeometry(1, 4);
    this.sphere = new THREE.Mesh(geometry, this.material);

    const random = Random.create(this.seed);
    const simplex = new Simplex(random.random);

    const groundVerts = [];

    this.sphere.geometry.vertices.forEach(function(v, i) {
      const noise = simplex.noise3D(v.x * s, v.y * s, v.z * s);
      v.multiplyScalar(1 + noise * m * 0.5);
      if (noise > 0.1) {
        groundVerts.push(i);
      }
    });

    this.sphere.geometry.faces.forEach(function(f) {
      if (_.indexOf(groundVerts, f.a, true) !== -1 ||
          _.indexOf(groundVerts, f.b, true) !== -1 ||
          _.indexOf(groundVerts, f.c, true) !== -1) {
        f.materialIndex = 1;
      } else {
        f.materialIndex = 0;
      }
    });

    this.sphere.geometry.verticesNeedUpdate = true;
    this.sphere.geometry.computeBoundingBox();
    this.sphere.geometry.center();
    this.scene.add(this.sphere);
  }

  update(millis) {
    if (this.needsRegeneration) {
      this.generatePlanet(this.scale, this.magnitude);
      this.needsRegeneration = false;
    }

    this.waterSphere.geometry.vertices.forEach(function(v) {
      let noise = this.waterSimplex.noise4D(v.original.x, v.original.y, v.original.z, this.t / 3000.0);
      noise = noise * 0.5 + 0.5;
      v.copy(v.original.clone().multiplyScalar(1.0 - noise * 0.03));
    }.bind(this));
    this.waterSphere.geometry.verticesNeedUpdate = true;

    this.rotation += 0.0002 * millis;
    this.sphere.rotation.y = this.rotation;
    this.t += millis;
  }
}

export default Planet;
