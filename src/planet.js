import _ from 'underscore';
import Simplex from 'simplex-noise';
import * as THREE from 'three';

import Heightmap from './heightmap.js';
import Navmesh from './navmesh.js';
import PlanetMath from './planet-math.js';

import skyVertexShader from './sky-vertex.glsl';
import skyFragmentShader from './sky-fragment.glsl';

class Planet {
  constructor(scene, sun, heightmap, size) {
    this.colors = {
      // TODO: emissive base colors
      sand: { base: 0xBFAE6D, emissive: 0x000000 },
      grass: { base: 0x32B552, emissive: 0x000000 },
    };


    this.size = size;
    this.waterSize = size;
    this.atmosphereSize = size * 1.25;
    this.sandThreshold = 0.3;

    this.scene = scene;
    this.t = 0;

    this.material = new THREE.MeshPhongMaterial({
      emissive: 0x000000,
      side: THREE.DoubleSide,
      flatShading: true,
      vertexColors: THREE.FaceColors,
      shininess: 20,
    });

    this.rotation = 0.0;

    const waterGeometry = new THREE.IcosahedronGeometry(1, 3);
    const waterMaterial = new THREE.MeshPhongMaterial({
      color: 0x214EA1,
      emissive: 0x000000,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
      flatShading: true,
    });
    this.waterSimplex = new Simplex(Math.random);
    this.waterSphere = new THREE.Mesh(waterGeometry, waterMaterial);
    this.waterSphere.name = "water";
    this.scene.add(this.waterSphere);

    this.waterSphere.geometry.vertices.forEach(function(v) {
      v.original = v.clone();
    });

    const skyMaterial = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      vertexShader: skyVertexShader,
      fragmentShader: skyFragmentShader,
      uniforms: {
        sunDir: { value: sun.position },
        planetPos: { value: new THREE.Vector3(0, 0, 0) },
        atmosphereSize: { value: this.atmosphereSize },
      },
    });
    const skyGeometry = new THREE.IcosahedronGeometry(this.atmosphereSize, 4);
    this.skySphere = new THREE.Mesh(skyGeometry, skyMaterial);
    this.skySphere.name = "sky";
    this.scene.add(this.skySphere);

    this.setHeightmap(heightmap);

    this.sphere.geometry.faces.forEach(function(f) {
      // if (Math.random() > 0.5) {
      f.color.setHex(this.colors.sand.base);
      f.emissive = new THREE.Color(this.colors.sand.emissive);
      f.grass = false;
      // } else {
      //   f.color.setHex(this.colors.grass.base);
      //   f.emissive = new THREE.Color(this.colors.grass.emissive);
      //   f.grass = true;
      // }
    }.bind(this));

    this.sphere.geometry.colorsNeedUpdate = true;
  }

  makeGrass(face) {
    if (!face.grass) {
      console.log(`setting face ${face.faceIndex} to grass`);
      face.color.setHex(this.colors.grass.base);
      face.grass = true;

      this.sphere.geometry.colorsNeedUpdate = true;
    }
  }

  setHeightmap(heightmap) {
    if (this.sphere) {
      this.scene.remove(this.sphere);
    }

    this.heightmap = heightmap;
    this.sphere = new THREE.Mesh(this.heightmap.geometry, this.material);
    this.sphere.name = "heightmap";

    this.navmesh = new Navmesh(this.heightmap.geometry, this.size);
    this.navmesh.build();

    this.scene.add(this.sphere);
  }

  update(millis) {
    this.waterSphere.geometry.vertices.forEach(function(v) {
      const s = 2.4;
      let noise = this.waterSimplex.noise4D(v.original.x * s, v.original.y * s, v.original.z * s, this.t / 5000.0);
      noise = noise * 0.5 + 0.5;
      v.copy(v.original.clone().multiplyScalar(this.waterSize));
    }.bind(this));
    this.waterSphere.geometry.verticesNeedUpdate = true;

    // this.rotation += 0.0003 * millis;
    this.sphere.rotation.y = this.rotation;
    this.waterSphere.rotation.y = this.rotation;
    this.t += millis;
  }

  findPath(start, end) {
    if (!start) {
      start = this.randomFace().faceIndex;
    }

    if (!end) {
      end = this.randomFace().faceIndex;
    }

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
        return face;
      }
    }
  }
}

export default Planet;
