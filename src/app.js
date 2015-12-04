import THREE from 'three.js';
import Simplex from 'simplex-noise';
import Random from 'random-seed';

const seed = Math.random();

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );

const renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
renderer.setPixelRatio( window.devicePixelRatio );
document.body.appendChild( renderer.domElement );

const x = 0.525731112119133606;
const z = 0.850650808352039932;
//const scale = 1.0;

function generate(x, y, z) {
  const noise = simplex.noise3D(x, y, z);
  return (new THREE.Vector3(x, y, z)).multiplyScalar(1 + noise * 0.2);
}

// const geometry = new THREE.Geometry();
// geometry.vertices = [
//   generate(-x,  0.0,  z),
//   generate( x,  0.0,  z),
//   generate(-x,  0.0, -z),
//   generate( x,  0.0, -z),

//   generate(0.0,  z,  x),
//   generate(0.0,  z, -x),
//   generate(0.0, -z,  x),
//   generate(0.0, -z, -x),

//   generate( z,  x,  0.0),
//   generate(-z,  x,  0.0),
//   generate( z, -x,  0.0),
//   generate(-z, -x,  0.0),
// ];

// geometry.faces = [
//   new THREE.Face3(0, 4, 1),
//   new THREE.Face3(0, 9, 4),
//   new THREE.Face3(9, 5, 4),
//   new THREE.Face3(4, 5, 8),
//   new THREE.Face3(4, 8, 1),

//   new THREE.Face3(8, 10, 1),
//   new THREE.Face3(8, 3, 10),
//   new THREE.Face3(5, 3, 8),
//   new THREE.Face3(5, 2, 3),
//   new THREE.Face3(2, 7, 3),

//   new THREE.Face3(7, 10, 3),
//   new THREE.Face3(7, 6, 10),
//   new THREE.Face3(7, 11, 6),
//   new THREE.Face3(11, 0, 6),
//   new THREE.Face3(0, 1, 6),

//   new THREE.Face3(6, 1, 10),
//   new THREE.Face3(9, 0, 11),
//   new THREE.Face3(9, 11, 2),
//   new THREE.Face3(9, 2, 5),
//   new THREE.Face3(7, 2, 11),
// ];
const geometry = new THREE.IcosahedronGeometry(1, 3);
geometry.vertices.forEach(function(v) {
  v.original = v.clone();
});
geometry.dynamic = true;

const material = new THREE.MeshPhongMaterial({
  color: 0x156289,
  emissive: 0x072534,
  side: THREE.DoubleSide,
  shading: THREE.FlatShading,
});
const sphere = new THREE.Mesh( geometry, material );
scene.add( sphere );
const lights = [];
lights[0] = new THREE.PointLight( 0xffffff, 1, 0 );
lights[1] = new THREE.PointLight( 0xffffff, 1, 0 );
lights[2] = new THREE.PointLight( 0xffffff, 1, 0 );

lights[0].position.set( 0, 200, 0 );
lights[1].position.set( 100, 200, 100 );
lights[2].position.set( -100, -200, -100 );

scene.add( lights[0] );
scene.add( lights[1] );
scene.add( lights[2] );
camera.position.z = 2.5;

let r = true;
let scale = 1, magnitude = 0.2;

function regen(s, m) {
  const random = Random.create(seed);
  const simplex = new Simplex(random.random);

  sphere.geometry.vertices.forEach(function(v) {
    const noise = simplex.noise3D(v.x * s, v.y * s, v.z * s);
    v.copy(v.original.clone().multiplyScalar(Math.max(1.0, 1 + noise * m * 0.5)));
  });
  sphere.geometry.verticesNeedUpdate = true;
  sphere.geometry.computeBoundingBox();
  sphere.geometry.center();
}


function render() {
  if (r) {
    regen(scale, magnitude);
  }
  r = false;
  requestAnimationFrame( render );
  sphere.rotation.x += 0.01;
  sphere.rotation.y += 0.01;
  renderer.render( scene, camera );
}
render();

window.onresize = function() {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
};

let drag = false;
let mx = 0, my = 0;

document.onmousedown = function(event) { drag = true; mx = event.screenX; my = event.screenY; };
document.onmouseup   = function() { drag = false; };
document.onmousemove = function(event) {
  if(drag) {
    const vx = event.screenX - mx;
    const vy = event.screenY - my;

    scale += vx * 0.0005;
    magnitude += vy * 0.0005;

    scale = Math.max(Math.min(scale, 10.0), 0.1);
    magnitude = Math.max(Math.min(magnitude, 0.9), 0.0);

    console.log(`scale: ${scale}, magnitude: ${magnitude}`);

    r = true;
    mx = event.screenX; my = event.screenY;
  }
};
