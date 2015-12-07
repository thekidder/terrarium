import _ from 'underscore';
import Simplex from 'simplex-noise';
import THREE from 'three.js';
import Random from 'random-seed';

class Planet {
  constructor(scene) {
    this.scene = scene;

    this.material = new THREE.MeshFaceMaterial([
      new THREE.MeshPhongMaterial({
        color: 0x156289,
        emissive: 0x072534,
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
    this.scale = 1.0;
    this.magnitude = 0.2;
    this.rotation = 0.0;
    this.needsRegeneration = true;

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
      v.multiplyScalar(Math.max(1.0, 1 + noise * m * 0.5));
      if (noise > 0) {
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

    this.rotation += 0.0006 * millis;
    this.sphere.rotation.y = this.rotation;
  }
}

export default Planet;
