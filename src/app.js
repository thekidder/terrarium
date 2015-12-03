import THREE from 'three.js';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );

const renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
renderer.setPixelRatio( window.devicePixelRatio );
document.body.appendChild( renderer.domElement );

const geometry = new THREE.SphereGeometry( 1, 7, 7);
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
camera.position.z = 8;

function render() {
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
