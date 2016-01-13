import Random from 'random-seed';
import Simplex from 'simplex-noise';
import THREE from 'three.js';

import Planet from './planet.js';
import PlanetMath from './planet-math.js';

class Game {
  constructor(renderer) {
    this.totalMillis = 0;
    this.renderer = renderer;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera( 75, 1.0, 0.1, 1000 ); // aspect will get set in onResize
    this.camera.position.z = 2.5;

    this.populateScene();
    this.planet = new Planet(this.scene);

    const nibbleMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
    });
    this.nibbles = [];
    for(let i = 0; i < 50; ++i) {
      const nibbleGeometry = new THREE.BoxGeometry(0.02, 0.02, 0.02);
      const nibble = new THREE.Mesh(nibbleGeometry, nibbleMaterial);
      const nibbleTheta = Math.random() * Math.PI * 2;
      const nibblePhi = Math.random() * Math.PI;

      const nibblePos = PlanetMath.sphericalToCartesian({
        theta: nibbleTheta,
        phi: nibblePhi,
        r: 1.0,
      });
      const nibbleSurfacePos = this.planet.placeOnSurface(new THREE.Vector3(nibblePos.x, nibblePos.y, nibblePos.z));
      //console.log(`found nibble pos: ${JSON.stringify(nibbleSurfacePos)} from ${JSON.stringify(nibblePos)}`);
      nibble.position.x = nibbleSurfacePos.x;
      nibble.position.y = nibbleSurfacePos.y;
      nibble.position.z = nibbleSurfacePos.z;

      nibble.faceCoords = this.planet.toFaceCoords(nibbleSurfacePos);
      nibble.simplex = new Simplex(Math.random);

      this.nibbles.push(nibble);
      this.planet.waterSphere.add(nibble);
    }
  }

  populateScene() {
    const lights = [];
    lights[0] = new THREE.PointLight(0xffffff, 1, 0);
    lights[1] = new THREE.PointLight(0xffffff, 1, 0);
    lights[2] = new THREE.PointLight(0xffffff, 1, 0);

    lights[0].position.set(0, 200, 0);
    lights[1].position.set(100, 200, 100);
    lights[2].position.set(-100, -200, -100);

    this.scene.add(lights[0]);
    this.scene.add(lights[1]);
    this.scene.add(lights[2]);
  }

  update(millis) {
    this.totalMillis += millis;
    this.planet.update(millis);

    this.nibbles.forEach(function(nibble) {
      const angle = nibble.simplex.noise3D(nibble.faceCoords.uv.x * 100, nibble.faceCoords.uv.y * 100, this.totalMillis / 20000);
      nibble.faceCoords.uv.x += 0.002 * Math.cos(angle);
      nibble.faceCoords.uv.y += 0.002 * Math.sin(angle);
      nibble.faceCoords = this.planet.updateFaceCoords(nibble.faceCoords);
      const pos = this.planet.fromFaceCoords(nibble.faceCoords);
      //console.log(`moving from ${JSON.stringify(nibble.position)} to ${JSON.stringify(pos)}`);
      nibble.position.copy(pos);
      nibble.updateMatrix();
    }.bind(this));
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  onResize(width, height) {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  onFocus(event) {
  }

  onBlur(event) {
  }

  onKeyDown(event) {
    //this.planet.seed = Math.random();
    //this.planet.needsRegeneration = true;
    this.planet.findPath();
  }

  onMouseDown(event) {
    this.dragStartEvent = event;
    this.drag = true;
  }

  onMouseUp(event) {
    this.drag = false;
  }

  onMouseMove(event) {
    if(this.drag && false) {
      const x = event.screenX - this.dragStartEvent.screenX;
      const y = event.screenY - this.dragStartEvent.screenY;

      this.planet.scale += x * 0.0005;
      this.planet.magnitude += y * 0.0005;

      this.planet.scale = Math.max(Math.min(this.planet.scale, 10.0), 0.1);
      this.planet.magnitude = Math.max(Math.min(this.planet.magnitude, 0.9), 0.0);

      console.log(`scale: ${this.planet.scale}, magnitude: ${this.planet.magnitude}`);

      this.planet.needsRegeneration = true;
      this.dragStartEvent = event;
    }
  }
}

export default Game;
