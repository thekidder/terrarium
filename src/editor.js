const FileSaver = require('filesaver.js');

require('bootstrap.min.css');

import React from 'react';
import ReactDOM from 'react-dom';
import THREE from 'three';

import { Button, ButtonToolbar, Panel } from 'react-bootstrap';

import App from './app.js';
import ArcBallCamera from './arc-camera.js';
import Debug from './debug.js';
import Planet from './planet.js';
import PlanetGenerator from './planet-generator.js';
import Nibble from './nibble.js';
import Scene from './scene.js';

const size = 30.0;

class Editor {
  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new ArcBallCamera(size * 2.2, new THREE.Vector3());
    this.drag = false;

    this.camera.lookAt(new THREE.Vector3());

    this.seed = 8711939729391615;
    this.planet = new Planet(this.scene, this.buildHeightmap(), size);
    this.mouse = new THREE.Vector2();
    this.raycaster = new THREE.Raycaster();
    this.raycaster.near = size / 3;
    this.raycaster.far = size * 3;

    this.nibbles = [];

    Scene.populate(this.scene, {debug: true, scale: size});

    this.renderUI();

    // load a resource
    new THREE.ObjectLoader().load(
      // resource URL
      'assets/marker1.json',
      // Function when resource is loaded
      function ( object, materials ) {
        const material = new THREE.MeshPhongMaterial({
          color: 0x555555,
          emissive: 0x333333,
          side: THREE.DoubleSide,
          shading: THREE.FlatShading,
        });
        // const object = new THREE.Mesh( geometry, material );
        object.position.set(0, size, 0);
        object.traverse(function(o) {
          o.material = material;
        });

        this.scene.add( object );
      }.bind(this)
    );
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
    return PlanetGenerator.buildHeightmap(this.seed, 1.5, 0.25, size);
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
      size: size,
    };

    const wrappedData = `${JSON.stringify(data)}\n`;

    const blob = new Blob([wrappedData], {type : 'application/json'});
    FileSaver.saveAs(blob, 'planet-data.json');
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
    this.mouse.x = event.clientX / window.innerWidth * 2 - 1;
    this.mouse.y = -event.clientY / window.innerHeight * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersections = this.raycaster.intersectObject(this.planet.sphere, true);

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
