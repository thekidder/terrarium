import THREE from 'three.js';
import Stats from 'stats.js';

import Game from './game.js';

class App {
  constructor() {
    // create FPS counter
    this.stats = new Stats();
    this.stats.setMode(0); // 0: fps, 1: ms, 2: mb
    this.stats.domElement.style.position = 'absolute';
    this.stats.domElement.style.left = '0px';
    this.stats.domElement.style.top = '0px';
    document.body.appendChild(this.stats.domElement);

    // create renderer
    this.renderer = new THREE.WebGLRenderer({antialias: true});
    this.renderer.setPixelRatio(window.devicePixelRatio);
    document.body.appendChild(this.renderer.domElement);

    // create game object
    this.game = new Game(this.renderer);

    // update and render loop boilerplate
    this.timestepMillis = 20;
    this.lastMillis = new Date().getTime();
    this.accumulatorMillis = 0;

    this.paused = false;
  }

  setEventListeners() {
    document.onkeydown   = this.game.onKeyDown;
    document.onmousedown = this.game.onMouseDown;
    document.onmouseup   = this.game.onMouseUp;
    document.onmousemove = this.game.onMouseMove;

    window.onresize      = this.onResize.bind(this);
    window.onfocus       = this.onFocus.bind(this);
    window.onblur        = this.onBlur.bind(this);
  }

  run() {
    // initial update, resize, and start rendering!
    this.game.update(0);
    this.onResize();
    this.render();
  }

  updateLoop() {
    const currentMillis = new Date().getTime();

    this.accumulatorMillis += currentMillis - this.lastMillis;
    while (this.accumulatorMillis > this.timestepMillis) {
      this.accumulatorMillis -= this.timestepMillis;
      this.game.update(this.timestepMillis);
    }

    this.lastMillis = currentMillis;
  }

  render() {
    this.stats.begin();

    if (!this.paused) {
      this.updateLoop();
    }
    this.game.render();
    this.stats.end();

    if (!this.paused) {
      window.requestAnimationFrame(this.render.bind(this));
    }
  }

  onBlur(event) {
    document.title = "Terrarium - paused";
    this.game.onBlur(event);
    this.paused = true;
  }

  onFocus(event) {
    document.title = "Terrarium";
    this.game.onFocus(event);
    this.paused = false;
    // don't advance game while paused
    this.lastMillis = new Date().getTime();
    window.requestAnimationFrame(this.render.bind(this));
  }

  onResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.renderer.setSize(width, height);
    this.game.onResize(width, height);
  }
}

const app = new App();
app.setEventListeners();
app.run();
