import _ from 'underscore';
import Simplex from 'simplex-noise';
import * as THREE from 'three';

import Heightmap from './heightmap.js';
import Navmesh from './navmesh.js';
import PlanetMath from './planet-math.js';
import { savePng } from './image.js';

import planetVertexShader from './planet-vertex.glsl';
import skyVertexShader from './sky-vertex.glsl';
import fragmentShader from './vertex-lighting-fragment.glsl';

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

    const heightmapTexture = this.heightmapAsTexture(heightmap);

    // this.material = new THREE.MeshPhongMaterial({
    //   emissive: 0x000000,
    //   side: THREE.DoubleSide,
    //   flatShading: true,
    //   vertexColors: THREE.FaceColors,
    //   shininess: 20,
    // });
    this.material = new THREE.ShaderMaterial({
      side: THREE.FrontSide,
      vertexShader: planetVertexShader,
      fragmentShader: fragmentShader,
      vertexColors: THREE.FaceColors,
      uniforms: {
        sunDir: { value: this.sun.position.clone() },
        planetPos: { value: new THREE.Vector3(0, 0, 0) },
        planetRadius: { value: this.waterSize * 0.9 },
        atmosphereSize: { value: this.atmosphereSize },
        scatteringCoefficient: { value: scatteringCoefficient },
        sunIntensity: { value: (new THREE.Vector3(this.sunIntensity, this.sunIntensity, this.sunIntensity)).multiplyScalar(1.5) },
        scaleHeight: { value: this.scaleHeight },
        rayScaleHeight: { value: this.rayScaleHeight },
        heightmap: { value: heightmapTexture },
        heightmapMin: { value: this.size - 0.5 * 0.25 * this.size },
        heightmapScale: { value: 255 / (0.25 * this.size) },
      },
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

    this.skyMaterial = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      vertexShader: skyVertexShader,
      fragmentShader: fragmentShader,
      uniforms: {
        sunDir: { value: this.sun.position.clone() },
        planetPos: { value: new THREE.Vector3(0, 0, 0) },
        planetRadius: { value: this.waterSize * 0.9 },
        atmosphereSize: { value: this.atmosphereSize },
        scatteringCoefficient: { value: scatteringCoefficient },
        sunIntensity: { value: new THREE.Vector3(this.sunIntensity, this.sunIntensity, this.sunIntensity) },
        scaleHeight: { value:this.scaleHeight },
        rayScaleHeight: { value: this.rayScaleHeight },
        heightmap: { value: heightmapTexture },
        heightmapMin: { value: this.size - 0.5 * 0.25 * this.size },
        heightmapScale: { value: 255 / (0.25 * this.size) },
      },
    });
    const skyGeometry = new THREE.IcosahedronGeometry(this.atmosphereSize * 1.5, 5);
    this.skySphere = new THREE.Mesh(skyGeometry, this.skyMaterial);
    this.skySphere.name = "sky";
    this.scene.add(this.skySphere);

    this.setHeightmap(heightmap);
    this.heightmapTexture = heightmapTexture;

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

    // this.saveHeightmap(this.heightmap);

    this.scene.add(this.sphere);
  }

  heightmapAsDataArray(heightmap, width, height) {
    const data = new Uint8ClampedArray(width * height * 4);

    const scale = 255 / (0.25 * this.size);
    const min = this.size - 0.5 * 0.25 * this.size;

    console.log(`scale: ${scale} min: ${min}`);

    for (let i = 0; i < width; ++i) {
      for (let j = 0; j < height; ++j) {
        const u = i / width;
        const v = j / height;
        // console.log(`uv: ${u},${v}`);
        const x = Math.cos(2 * Math.PI * (u - 0.5));
        const y = Math.sin(Math.PI * (0.5 - v));
        const z = Math.sin(2 * Math.PI * (u - 0.5));
        // console.log(`xyz: ${x},${y},${z}`);

        const original = (new THREE.Vector3(x, y, z)).normalize().multiplyScalar(this.size);
        const h = heightmap.placeOnSurface(original);
        // console.log(`original: ${JSON.stringify(original)} h: ${JSON.stringify(h.normalize().multiplyScalar(this.size))}`);
        // if (h.length() < 5.574625) {
        //   console.log(h.length());
        // }
        // let relativeHeight = 0;
        // if (h.length() > this.size) {
        //   relativeHeight = 255;
        // }
        let relativeHeight = scale * (h.length() - min);
        relativeHeight = Math.max(0, Math.min(relativeHeight, 255));
        // console.log(`rel: ${relativeHeight}`);
        const index = i + j * width;
        data[index * 4 + 0] = relativeHeight;
        data[index * 4 + 1] = relativeHeight;
        data[index * 4 + 2] = relativeHeight;
        data[index * 4 + 3] = 255;
      }
    }
    return data;
  }

  heightmapAsTexture(heightmap) {
    const width = 256;
    const height = 256;

    const data = this.heightmapAsDataArray(heightmap, width, height);

    return THREE.DataTexture(data, width, height, THREE.RGBAFormat, THREE.UnsignedByteType,THREE.UVMapping,
      THREE.RepeatWrapping, THREE.ClampToEdgeWrapping, THREE.LinearFilter, THREE.LinearFilter, 1);
  }

  saveHeightmap(heightmap) {
    const width = 128;
    const height = 128;

    const data = this.heightmapAsDataArray(heightmap, width, height);
    savePng('heightmap.png', width, height, data);
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
    this.skyMaterial.uniforms.sunIntensity.value = (new THREE.Vector3(this.sunIntensity, this.sunIntensity, this.sunIntensity)).addScalar(Math.sin(this.t * 0.0012));
    this.skyMaterial.uniforms.scaleHeight.value = this.scaleHeight + 0.1 * Math.sin(this.t * 0.0012);
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
