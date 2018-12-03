import _ from 'underscore';
import Simplex from 'simplex-noise';
import * as THREE from 'three';

import Heightmap from './heightmap.js';
import Navmesh from './navmesh.js';
import PlanetMath from './planet-math.js';
import { savePng } from './image.js';

import planetVertexShader from './planet-vertex.glsl';
import skyVertexShader from './sky-vertex.glsl';
import fragmentShader from './sky-fragment.glsl';
import sunboxVertexShader from './sunbox-vertex.glsl';
import sunboxFragmentShader from './sunbox-fragment.glsl';

class Planet {
  constructor(scene, sun, camera, heightmap, size) {
    this.colors = {
      sand: { base: 0xC3BB7A },
      grass: { base: 0x36B129 },
      snow: { base: 0xffffff },
    };

    this.sun = sun;
    this.camera = camera;
    this.size = size;
    this.waterSize = size;
    this.atmosphereSize = size * 1.75;
    this.sandMinThreshold = 1.0;
    this.sandMaxThreshold = 1.05;
    this.grassMaxThreshold = 1.11;

    this.scaleFactor = 1e5;
    this.scaleHeight = 1.9;
    this.rayScaleHeight = 1.1;
    this.sunIntensity = new THREE.Vector3(1, 1, 0.94).multiplyScalar(0.8);
    this.planetPos = new THREE.Vector3(0, 0, 0);
    this.mieConstant = new THREE.Vector3(0.007, 0.007, 0.007);

    this.scene = scene;
    this.t = 0;

    const sunboxGeometry = new THREE.IcosahedronGeometry(this.atmosphereSize * 8.0, 4);
    this.sunboxMaterial = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      vertexShader: sunboxVertexShader,
      fragmentShader: sunboxFragmentShader,
    });

    this.sunbox = new THREE.Mesh(sunboxGeometry, this.sunboxMaterial);
    scene.add(this.sunbox);

    function scatteringForWavelength(wavelength) {
      const refractiveIndex = 1.00029;
      const molecularDensity = 2.504e25;
      return ((8.0 * Math.pow(Math.PI, 3) * Math.pow(refractiveIndex * refractiveIndex - 1, 2)) / 3) *
        (1.0 / molecularDensity) *
        (1 / Math.pow(wavelength, 4));
    }

    this.scatteringCoefficient = new THREE.Vector3(
      scatteringForWavelength(680e-9) * this.scaleFactor,
      scatteringForWavelength(550e-9) * this.scaleFactor,
      scatteringForWavelength(440e-9) * this.scaleFactor,
    );

    console.log(`scattering coefficient: ${JSON.stringify(this.scatteringCoefficient)}`);

    this.material = new THREE.ShaderMaterial({
      side: THREE.FrontSide,
      vertexShader: planetVertexShader,
      fragmentShader: fragmentShader,
      vertexColors: THREE.FaceColors,
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
    });

    const skyGeometry = new THREE.IcosahedronGeometry(this.atmosphereSize * 1.1, 5);
    this.skySphere = new THREE.Mesh(skyGeometry, this.skyMaterial);
    this.skySphere.name = "sky";
    this.scene.add(this.skySphere);

    this.setHeightmap(heightmap);

    this.sphere.geometry.faces.forEach(function(f) {
      const heights = [
        this.sphere.geometry.vertices[f.a].length(),
        this.sphere.geometry.vertices[f.b].length(),
        this.sphere.geometry.vertices[f.c].length(),
      ];
      if (_.min(heights) < this.size * this.sandMinThreshold && _.max(heights) < this.size * this.sandMaxThreshold) {
        f.color.setHex(this.colors.sand.base);
        f.sand = true;
      } else if (_.max(heights) < this.size * this.grassMaxThreshold) {
        f.color.setHex(this.colors.grass.base);
        f.grass = true;
      } else {
        f.color.setHex(this.colors.snow.base);
      }
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

  heightmapAsDataArray(heightmap, width, height) {
    const data = new Uint8ClampedArray(width * height * 4);

    const scale = 255 / (0.25 * this.size);
    const min = this.size - 0.5 * 0.25 * this.size;

    for (let i = 0; i < width; ++i) {
      for (let j = 0; j < height; ++j) {
        const u = i / width;
        const v = j / height;
        const x = Math.cos(2 * Math.PI * (u - 0.5));
        const y = Math.sin(Math.PI * (0.5 - v));
        const z = Math.sin(2 * Math.PI * (u - 0.5));

        const original = (new THREE.Vector3(x, y, z)).normalize().multiplyScalar(this.size);
        const h = heightmap.placeOnSurface(original);
        let relativeHeight = scale * (h.length() - min);
        relativeHeight = Math.max(0, Math.min(relativeHeight, 255));
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

  setScatteringUniforms(material, sunIntensityScale, mieScale) {
    const g = -0.98;
    material.uniforms.sunDir = { value: this.sun.position };
    material.uniforms.planetPos = { value: this.planetPos };
    material.uniforms.planetRadius = { value: this.waterSize * 0.9 };
    material.uniforms.atmosphereSize = { value: this.atmosphereSize };
    material.uniforms.scatteringCoefficient = { value: this.scatteringCoefficient };
    material.uniforms.sunIntensity = { value: this.sunIntensity.clone().multiplyScalar(sunIntensityScale) };
    material.uniforms.scaleHeight ={ value: this.scaleHeight + 0.1 * Math.sin(this.t * 0.0012) };
    material.uniforms.rayScaleHeight = { value: this.rayScaleHeight };
    material.uniforms.g = { value: g };
    material.uniforms.gSq = { value: g * g };
    material.uniforms.minMieDepth = { value: 0.025 };
    material.uniforms.mieConstant = { value: this.mieConstant.clone().multiplyScalar(mieScale) };
  }

  beforeRender() {
  }

  update(millis) {
    this.waterSphere.geometry.vertices.forEach(function(v) {
      const s = 2.4;
      let noise = this.waterSimplex.noise4D(v.original.x * s, v.original.y * s, v.original.z * s, this.t / 2000.0);
      noise = noise * 0.1;
      v.copy(v.original.clone().multiplyScalar(this.waterSize + noise));
    }.bind(this));
    this.waterSphere.geometry.verticesNeedUpdate = true;

    // this.rotation += 0.0003 * millis;
    this.sphere.rotation.y = this.rotation;
    this.waterSphere.rotation.y = this.rotation;
    this.t += millis;

    this.setScatteringUniforms(this.material, 1.5, 0.01);
    this.setScatteringUniforms(this.skyMaterial, 1, 1.0);
    this.setScatteringUniforms(this.sunboxMaterial, 1, 1.0);
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
