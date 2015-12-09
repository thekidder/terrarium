import _ from 'underscore';
import PlanetMath from './planet-math.js';
import Simplex from 'simplex-noise';
import THREE from 'three.js';
import Random from 'random-seed';

class Planet {
  constructor(scene) {
    this.scale = 1.5;
    this.magnitude = 0.25;
    this.waterHeight = 1.02;
    this.sandThreshold = 0.3;

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
    this.rotation = 0.0;
    this.needsRegeneration = true;

    const waterGeometry = new THREE.IcosahedronGeometry(1, 4);
    const waterMaterial = new THREE.ShaderMaterial( {
      vertexShader:`
        varying vec3 n;
        varying vec3 p;

        void main() {
          gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
          n = normal;
          p = gl_Position.xyz;
        }
      `,
      fragmentShader: `
        varying vec3 p;
        varying vec3 n;

        uniform vec3 pointLightColor[ MAX_POINT_LIGHTS ];

        uniform vec3 pointLightPosition[ MAX_POINT_LIGHTS ];
        uniform float pointLightDistance[ MAX_POINT_LIGHTS ];
        uniform float pointLightDecay[ MAX_POINT_LIGHTS ];

        float diffuse(vec3 n,vec3 l,float p) {
          return pow(dot(n,l) * 0.4 + 0.6,p);
        }

        vec3 getSkyColor(vec3 e) {
          e.y = max(e.y,0.0);
          vec3 ret;
          ret.x = pow(1.0-e.y,2.0);
          ret.y = 1.0-e.y;
          ret.z = 0.6+(1.0-e.y)*0.4;
          return ret;
        }

        const vec3 SEA_BASE = vec3(0.1,0.19,0.22);
        const vec3 SEA_WATER_COLOR = vec3(0.8,0.9,0.6);

        void main() {
          vec3 eye = cameraPosition - p;

          vec3 color = vec3(0.0, 0.0, 0.0);
          for ( int i = 0; i < MAX_POINT_LIGHTS; i ++ ) {
            //const int i = 2;
            vec3 lightColor = pointLightColor[ i ];

            vec3 lightDirection = normalize(pointLightPosition[ i ] - p);
            float fresnel = 1.0 - max(dot(n,-eye),0.0);
            fresnel = pow(fresnel,3.0) * 0.65;

            vec3 reflected = getSkyColor(reflect(eye,n));
            vec3 refracted = SEA_BASE + diffuse(n,lightDirection,80.0) * SEA_WATER_COLOR * 0.12;

            color += 0.45 * mix(refracted,reflected,fresnel);
          }
          gl_FragColor = vec4(color, 1.0);
        }
      `,
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
    this.heights = [];

    this.sphere.geometry.vertices.forEach(function(v, i) {
      const noise = simplex.noise3D(v.x * s, v.y * s, v.z * s);
      const height = 1 + noise * m * 0.5;
      this.heights.push({
        x: v.x,
        y: v.y,
        z: v.z,
        height: height,
      });
      v.multiplyScalar(height);
      if (noise > this.sandThreshold) {
        groundVerts.push(i);
      }
    }.bind(this));

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
      v.copy(v.original.clone().multiplyScalar(this.waterHeight - noise * 0.04));
    }.bind(this));
    this.waterSphere.geometry.verticesNeedUpdate = true;

    //this.rotation += 0.0008 * millis;
    this.sphere.rotation.y = this.rotation;
    this.waterSphere.rotation.y = this.rotation;
    this.t += millis;
  }

  getHeight(theta, phi) {
    // convert to cartesian, then look for closest anchor
    const cartesian = PlanetMath.polarToCartesian({r: 1, theta: theta, phi: phi});

    return _.min(this.heights, function(anchor) {
      return (cartesian.x - anchor.x) * (cartesian.x - anchor.x) +
          (cartesian.y - anchor.y) * (cartesian.y * anchor.y) +
          (cartesian.z - anchor.z) * (cartesian.z * anchor.z);
    }).height;
  }
}

export default Planet;
