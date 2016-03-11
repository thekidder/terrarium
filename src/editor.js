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
          <Button bsSize='xsmall' onClick={this.saveHeightmap.bind(this)}>Save</Button>
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

  saveHeightmap() {
    const data = {
      seed: this.planet.seed,
      heightmap: this.planet.heightmap.save(),
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
  }

  onMouseMove(event) {
    if (this.drag) {
      this.camera.rotate(event.pageX, event.pageY);
    }
  }
}

const app = new App('Terrarium Editor', new Editor());
app.setEventListeners();
app.run();
