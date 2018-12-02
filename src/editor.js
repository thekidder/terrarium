import saveAs from 'file-saver';

require('bootstrap.min.css');

import React from 'react';
import ReactDOM from 'react-dom';
import * as THREE from 'three';

import { Button, ButtonToolbar, Form, FormControl, Panel } from 'react-bootstrap';

import ColorPicker from 'react-color';

import App from './app.js';
import ArcBallCamera from './arc-camera.js';
import Debug from './debug.js';
import Planet from './planet.js';
import PlanetGenerator from './planet-generator.js';
import Nibble from './nibble.js';
import { Sun } from './sun.js';

const size = 6.371;

class Editor {
  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new ArcBallCamera(size * 3.3, new THREE.Vector3());
    this.drag = false;

    this.camera.lookAt(new THREE.Vector3());

    this.seed = 8711939729391615;
    this.sun = new Sun(this.scene, this.camera, size, { debug: true });
    this.planet = new Planet(this.scene, this.sun, this.buildHeightmap(), size);
    this.mouse = new THREE.Vector2();
    this.raycaster = new THREE.Raycaster();
    this.raycaster.near = size / 3;
    this.raycaster.far = size * 3;
    this.mixer = null;

    this.nibbles = [];

    this.editor = document.getElementById('editor-left');

    this.state = {
      scaleHeight: this.planet.scaleHeight,
      rayScaleHeight: this.planet.rayScaleHeight,
      sunIntensity: this.planet.sunIntensity,
    };

    this.renderUI();
  }

  renderUI() {
    ReactDOM.render(
      <Panel>
        <h6>Heightmap</h6>
        <p>Seed: {this.seed}</p>
        <ButtonToolbar>
          <Button
            bsSize='xsmall'
            className='pull-right'
            onClick={this.showTraversable.bind(this)}>
            Show navigable nodes
          </Button>
        </ButtonToolbar>
        <ButtonToolbar>
          <Button bsSize='xsmall' className='pull-right' onClick={this.regenerate.bind(this)}>
            Regenerate
          </Button>
          <Button bsSize='xsmall' className='pull-right' onClick={this.save.bind(this)}>
            Save
          </Button>
        </ButtonToolbar>
        <Form inline>
          <FormControl
            type='text'
            value={this.state.scaleHeight}
            style={{ width:'100px' }}
            placeholder='scaleHeight'
            onChange={this.scaleHeightChange.bind(this)}
          />
          <FormControl
            type='text'
            value={this.state.rayScaleHeight}
            style={{ width: '100px' }}
            placeholder='rayScaleHeight'
            onChange={this.rayScaleHeightChange.bind(this)}
          />
        </Form>
        <h6>Grass Color</h6>
        <ColorPicker
          type='sketch'
          color={ new THREE.Color(this.planet.colors.grass.base).getHexString() }
          onChange={ this.grassChange.bind(this) } />
        <h6>Sand Color</h6>
        <ColorPicker
          type='sketch'
          color={ new THREE.Color(this.planet.colors.sand.base).getHexString () }
          onChange={ this.sandChange.bind(this) }/>
      </Panel>,
      this.editor
    );
  }

  showTraversable() {
    const markers = this.planet.navmesh.showTraversable();
    for (const marker of markers) {
      this.planet.sphere.add(marker);
    }
  }

  grassChange(color) {
    this.planet.sphere.geometry.faces.forEach(function(f) {
      if (f.grass) {
        f.color.setRGB(color.rgb.r/255, color.rgb.g/255, color.rgb.b/255);
      }
    });

    this.planet.sphere.geometry.colorsNeedUpdate = true;
  }

  sandChange(color) {
    this.planet.sphere.geometry.faces.forEach(function(f) {
      if (!f.grass) {
        f.color.setRGB(color.rgb.r/255, color.rgb.g/255, color.rgb.b/255);
      }
    });

    this.planet.sphere.geometry.colorsNeedUpdate = true;
  }

  buildHeightmap() {
    return PlanetGenerator.buildHeightmap(this.seed, 1.5, 0.25, size);
  }

  regenerate() {
    this.seed = Math.floor(Number.MAX_SAFE_INTEGER * Math.random());
    this.planet.setHeightmap(this.buildHeightmap());
    this.renderUI();
  }

  scaleHeightChange(event) {
    this.state.scaleHeight = event.target.value;
    const val = parseFloat(event.target.value);
    if (!isNaN(val)) {
      console.log(`changing scale height to ${JSON.stringify(val)}`);

      this.planet.scaleHeight = val;
      this.planet.skyMaterial.uniforms.scaleHeight.value = val;

    }
    this.renderUI();
  }

  rayScaleHeightChange(event) {
    this.state.rayScaleHeight = event.target.value;
    const val = parseFloat(event.target.value);
    if (!isNaN(val)) {
      console.log(`changing ray scale height to ${JSON.stringify(val)}`);

      this.planet.rayScaleHeight = val;
      this.planet.skyMaterial.uniforms.rayScaleHeight.value = val;

    }
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
    saveAs(blob, 'planet-data.json');
  }

  update(millis) {
    this.planet.update(millis);

    if (this.mixer) {
      this.mixer.update(millis * 0.001);
    }

    this.sun.update(millis);
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

  isDescendentFrom(child, parent) {
    if (child === parent) { return true; }
    if (child.parentElement === null) { return false; }
    return this.isDescendentFrom(child.parentElement, parent);
  }

  isUi(event) {
    return this.isDescendentFrom(event.target, this.editor);
  }

  onMouseDown(event) {
    if (this.isUi(event)) {
      return;
    }


    this.drag = true;
    this.isDrag = false;
    this.camera.startRotate(event.pageX, event.pageY);
  }

  onMouseUp(event) {
    this.drag = false;
    this.camera.endRotate();

    if (!this.isDrag && !this.isUi(event)) {
      this.placeNibble(event);
    }

    this.isDrag = false;
  }

  onMouseMove(event) {
    if (this.isUi(event)) {
      return;
    }

    if (this.drag) {
      this.isDrag = true;
      this.camera.rotate(event.pageX, event.pageY);
    }
  }

  onMouseOver(event) {
  }

  placeNibble(event) {
    this.mouse.x = event.clientX / window.innerWidth * 2 - 1;
    this.mouse.y = -event.clientY / window.innerHeight * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersections = this.raycaster.intersectObject(this.planet.sphere, true);

    if (intersections.length > 0) {

      const pos = this.raycaster.ray.at(intersections[0].distance);
      console.log(`adding nibble at ${JSON.stringify(pos)}`);
      const nibble = new Nibble(this.planet, null, pos);
      this.nibbles.push(nibble);

      console.log(`intersection: ${intersections[0].faceIndex}`);
    }
  }
}

const app = new App('Terrarium Editor', new Editor(), { debug: true });
app.setEventListeners();
app.run();
