import _ from 'underscore';
import Random from 'random-seed';
import Simplex from 'simplex-noise';
import THREE from 'three.js';

import Heightmap from './heightmap.js';
import Navmesh from './navmesh.js';
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

    this.heightmap = new Heightmap(3, generationFunc);
    this.sphere = new THREE.Mesh(this.heightmap.geometry, this.material);

    this.navmesh = new Navmesh(this.heightmap.geometry);
    this.navmesh.build();

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

    this.rotation += 0.0003 * millis;
    this.sphere.rotation.y = this.rotation;
    this.waterSphere.rotation.y = this.rotation;
    this.t += millis;
  }

  findPath() {
    const start = this.randomFace();
    const end = this.randomFace();

    const path = this.navmesh.findPath(start, end);
    console.log(`path from ${start} to ${end}: ${path}`);
    return path;
  }

  randomFace() {
    while (true) {
      const candidate = Math.floor(Math.random() * this.heightmap.geometry.faces.length);
      const face = this.heightmap.geometry.faces[candidate];
      if (this.heightmap.geometry.vertices[face.a].lengthSq() > 1 &&
          this.heightmap.geometry.vertices[face.b].lengthSq() > 1 &&
          this.heightmap.geometry.vertices[face.c].lengthSq() > 1) {
        return candidate;
      }
    }
  }

  locateFace(point) {
    return this.heightmap.locateFace(point);
  }

  placeOnSurface(cartesianCoords) {
    return this.heightmap.placeOnSurface(cartesianCoords);
  }

  toFaceCoords(cartesianCoords) {
    return this.heightmap.toFaceCoords(cartesianCoords);
  }

  fromFaceCoords(faceCoords) {
    return this.heightmap.fromFaceCoords(faceCoords);
  }

  updateFaceCoords(faceCoords) {
    return this.heightmap.updateFaceCoords(faceCoords);
  }

  faceCentroid(faceIndex) {
    return this.heightmap.faceCentroid(faceIndex);
  }
}

export default Planet;
