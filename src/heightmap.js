import _ from 'underscore';
import PlanetMath from './planet-math.js';
import THREE from 'three.js';

class Heightmap {
  constructor(detail, generationFunc) {
    this.detail = detail;
    this.generationFunc = generationFunc;
    this._generate();
  }

  _generate() {
    this.verticesSortedByTheta = [];
    this.verticesSortedByPhi = [];
    this.geometry = new THREE.IcosahedronGeometry(1, this.detail);
    this.geometry.vertices.forEach(function(v, i) {
      v.sphericalCoords = PlanetMath.cartesianToSpherical(v);
      this.verticesSortedByTheta.push({index: i, theta: v.sphericalCoords.theta});
      this.verticesSortedByPhi.push({index: i, phi: v.sphericalCoords.phi});
    }.bind(this));
    this.verticesSortedByTheta = _.sortBy(this.verticesSortedByTheta, 'theta');
    this.verticesSortedByPhi = _.sortBy(this.verticesSortedByPhi, 'phi');

    this.geometry.vertices.forEach(function(v, i) {
      v.multiplyScalar(this.generationFunc(v));
    }.bind(this));

    this.geometry.faces.forEach(function(f) {
      const uv = function(index) {
        const polar = PlanetMath.cartesianToSpherical(this.geometry.vertices[index]);
        return `(${polar.theta.toFixed(3)}, ${polar.phi.toFixed(3)})`;
      }.bind(this);

      const xyz = function(index) {
        const v = this.geometry.vertices[index];
        return `(${v.x.toFixed(3)}, ${v.y.toFixed(3)}, ${v.z.toFixed(3)})`;
      }.bind(this);

      const angle = function(i1, i2) {
        const p1 = PlanetMath.cartesianToSpherical(this.geometry.vertices[i1]);
        const p2 = PlanetMath.cartesianToSpherical(this.geometry.vertices[i2]);
        return 180/Math.PI * Math.acos(Math.cos(p1.phi) * Math.cos(p2.phi) + Math.sin(p1.phi) * Math.sin(p2.phi) * Math.cos(p1.theta - p2.theta));
      }.bind(this);

      const angle2 = function(i1, i2) {
        const p1 = this.geometry.vertices[i1];
        const p2 = this.geometry.vertices[i2];
        return 180/Math.PI * Math.acos(p1.dot(p2) / (p1.length() * p2.length()));
      }.bind(this);
    }.bind(this));

    this.geometry.verticesNeedUpdate = true;
    this.geometry.computeBoundingBox();
  }

  findClosest(sphericalCoords) {
    const closest = _.min(this.geometry.vertices, function(v) {
      const vert = v.sphericalCoords;
      const thetaDiff = (vert.theta - sphericalCoords.theta) % (Math.PI * 2);
      const phiDiff = (vert.phi - sphericalCoords.phi) % (Math.PI * 2);
      return thetaDiff * thetaDiff + phiDiff * phiDiff;
    }.bind(this));

    return closest;
  }
}

export default Heightmap;
