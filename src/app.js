import THREE from 'three';
import Stats from 'stats.js';

class App {
  constructor(name, game) {
    this.name = name;
    this.game = game;

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

    // update and render loop boilerplate
    this.timestepMillis = 20;
    this.lastMillis = new Date().getTime();
    this.accumulatorMillis = 0;

    this.paused = false;
  }

  setEventListeners() {
    document.onkeydown   = this.game.onKeyDown.bind(this.game);
    document.onmousedown = this.game.onMouseDown.bind(this.game);
    document.onmouseup   = this.game.onMouseUp.bind(this.game);
    document.onmousemove = this.game.onMouseMove.bind(this.game);

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

    this.updateLoop();
    this.renderer.render(this.game.scene, this.game.camera);
    this.stats.end();

    if (!this.paused) {
      this.requestRender();
    }
  }

  requestRender() {
    this.requestAnimationId = window.requestAnimationFrame(this.render.bind(this));
  }

  cancelRenderRequest() {
    if (!!this.requestAnimationId) {
      window.cancelAnimationFrame(this.requestAnimationId);
      this.requestAnimationId = null;
    }
  }

  onBlur(event) {
    document.title = `${this.name} - paused`;
    this.game.onBlur(event);
    this.paused = true;

    this.cancelRenderRequest();
  }

  onFocus(event) {
    document.title = this.name;
    this.game.onFocus(event);
    this.paused = false;
    // don't advance game while paused
    this.lastMillis = new Date().getTime();
    this.cancelRenderRequest();
    this.requestRender();
  }

  onResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.renderer.setSize(width, height);
    this.game.onResize(width, height);
  }
}

export default App;
