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

    this.sun = sun;
    this.size = size;
    this.waterSize = size;
    this.atmosphereSize = size * 1.75;
    this.sandThreshold = 0.3;

    this.scaleFactor = 1e5;
    this.scaleHeight = 1.9;
    this.rayScaleHeight = 1.1;
    this.sunIntensity = 15;

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

    function scatteringForWavelength(wavelength) {
      const refractiveIndex = 1.00029;
      const molecularDensity = 2.504e25;
      return ((8.0 * Math.pow(Math.PI, 3) * Math.pow(refractiveIndex * refractiveIndex - 1, 2)) / 3) *
          (1.0 / molecularDensity) *
          (1 / Math.pow(wavelength, 4));
    }

    const scatteringCoefficient = new THREE.Vector3(
      scatteringForWavelength(680e-9) * this.scaleFactor,
      scatteringForWavelength(550e-9) * this.scaleFactor,
      scatteringForWavelength(440e-9) * this.scaleFactor,
    );

    console.log(`scattering coefficient: ${JSON.stringify(scatteringCoefficient)}`);

    this.skyMaterial = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      vertexShader: skyVertexShader,
      fragmentShader: skyFragmentShader,
      uniforms: {
        sunDir: { value: this.sun.position.clone() },
        planetPos: { value: new THREE.Vector3(0, 0, 0) },
        planetRadius: { value: this.waterSize * 0.9 },
        atmosphereSize: { value: this.atmosphereSize },
        scatteringCoefficient: { value: scatteringCoefficient },
        sunIntensity: { value: new THREE.Vector3(this.sunIntensity, this.sunIntensity, this.sunIntensity) },
        scaleHeight: { value:this.scaleHeight },
        rayScaleHeight: { value: this.rayScaleHeight },
      },
    });
    const skyGeometry = new THREE.IcosahedronGeometry(this.atmosphereSize, 5);
    this.skySphere = new THREE.Mesh(skyGeometry, this.skyMaterial);
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

    this.skyMaterial.uniforms.sunDir.value = this.sun.position.clone();
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
