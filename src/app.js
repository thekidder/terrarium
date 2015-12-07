import THREE from 'three.js';
import Stats from 'stats.js';

import Game from './game.js';

// create FPS counter
const stats = new Stats();
stats.setMode(0); // 0: fps, 1: ms, 2: mb
stats.domElement.style.position = 'absolute';
stats.domElement.style.left = '0px';
stats.domElement.style.top = '0px';
document.body.appendChild( stats.domElement );

// create renderer
const renderer = new THREE.WebGLRenderer({antialias: true});
renderer.setPixelRatio( window.devicePixelRatio );
document.body.appendChild( renderer.domElement );

// create game object
const game = new Game(renderer);

// define event listeners
window.onresize = function() {
  const width = window.innerWidth;
  const height = window.innerHeight;

  renderer.setSize(width, height);

  game.onResize(width, height);
};

document.onkeydown   = function(event) { game.onKeyDown(event); };
document.onmousedown = function(event) { game.onMouseDown(event); };
document.onmouseup   = function(event) { game.onMouseUp(event); };
document.onmousemove = function(event) { game.onMouseMove(event); };

// update and render loop boilerplate
const timestepMillis = 10;
let lastMillis = new Date().getTime();
let accumulatorMillis = 0;

function updateLoop() {
  const currentMillis = new Date().getTime();

  let differenceMillis = currentMillis - lastMillis;
  while (differenceMillis > timestepMillis) {
    differenceMillis -= timestepMillis;
    game.update(timestepMillis);
  }

  lastMillis = currentMillis;
  accumulatorMillis += differenceMillis;
}

function render() {
  stats.begin();

  updateLoop();
  game.render();
  stats.end();

  window.requestAnimationFrame(render);
}

// initial update, resize, and start rendering!
game.update(0);
window.onresize();
render();
