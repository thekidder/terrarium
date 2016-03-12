const FileSaver = require('filesaver.js');

require('bootstrap.min.css');

import React from 'react';
import ReactDOM from 'react-dom';
import THREE from 'three.js';

import { Button, ButtonToolbar, Panel } from 'react-bootstrap';

import App from './app.js';
import ArcBallCamera from './arc-camera.js';
import Debug from './debug.js';
import Planet from './planet.js';
import PlanetGenerator from './planet-generator.js';
import Nibble from './nibble.js';
import Scene from './scene.js';

class Editor {
  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new ArcBallCamera(3.0, new THREE.Vector3());
    this.drag = false;

    this.camera.position.set(3, 0, 0);
    this.camera.lookAt(new THREE.Vector3());

    this.seed = 8711939729391615;
    this.planet = new Planet(this.scene, this.buildHeightmap());
    this.mouse = new THREE.Vector2();
    this.raycaster = new THREE.Raycaster();

    this.nibbles = [];

    Scene.populate(this.scene, {debug: true});

    this.renderUI();
  }

  renderUI() {
    ReactDOM.render(
      <Panel>
        <h6>Heightmap</h6>
        <p>Seed: {this.seed}</p>
        <ButtonToolbar>
          <Button bsSize='xsmall' onClick={this.regenerate.bind(this)}>Regenerate</Button>
          <Button bsSize='xsmall' onClick={this.save.bind(this)}>Save</Button>
        </ButtonToolbar>
      </Panel>,
      document.getElementById('editor-left')
    );
  }

  buildHeightmap() {
    return PlanetGenerator.buildHeightmap(this.seed, 1.5, 0.25);
  }

  regenerate() {
    this.seed = Math.floor(Number.MAX_SAFE_INTEGER * Math.random());
    this.planet.setHeightmap(this.buildHeightmap());
    this.renderUI();
  }

  save() {
    const data = {
      seed: this.planet.seed,
      heightmap: this.planet.heightmap,
      nibbles: this.nibbles,
    };

    const wrappedData = `const PlanetData = ${JSON.stringify(data)}; export default PlanetData;\n`;

    const blob = new Blob([wrappedData], {type : 'application/json'});
    FileSaver.saveAs(blob, "planet-data.js");
  }

  update(millis) {
    this.planet.update(millis);
  }

  onResize(width, height) {
    this.camera.onResize(width, height);
  }

  onFocus(event) {
  }

  onBlur(event) {
  }

  onKeyDown(event) {
  }


  onMouseDown(event) {
    this.drag = true;
    this.camera.startRotate(event.pageX, event.pageY);
  }

  onMouseUp(event) {
    this.drag = false;
    this.camera.endRotate();

    this.placeNibble(event);
  }

  onMouseMove(event) {
    if (this.drag) {
      this.camera.rotate(event.pageX, event.pageY);
    }
  }

  placeNibble(event) {
    this.mouse.x = event.pageX / window.innerWidth * 2 - 1;
    this.mouse.y = -event.pageY / window.innerHeight * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersections = this.raycaster.intersectObject(this.planet.sphere);

    const pos = this.raycaster.ray.at(intersections[0].distance);
    console.log(`adding nibble at ${JSON.stringify(pos)}`);
    const nibble = new Nibble(this.planet, null, pos);
    this.nibbles.push(nibble);

    console.log(`intersection: ${intersections[0].faceIndex}`);
  }
}

const app = new App('Terrarium Editor', new Editor());
app.setEventListeners();
app.run();
