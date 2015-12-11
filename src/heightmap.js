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

    this.geometry.verticesNeedUpdate = true;
    this.geometry.computeBoundingBox();
  }

  _findClosestIndices(coord, list, prop) {
    const closest = _.sortedIndex(list, coord, prop);

    const indices = [];

    // wrap-around:
    for(let i = list.length - 2 + closest; i < list.length; ++i) {
      indices.push(list[i]);
    }

    if(closest === list.length - 1) {
      indices.push(list[0]);
    }

    const minIndex = Math.max(0, closest - 2);
    const maxIndex = Math.min(list.length - 1, closest + 1);

    for(let i = minIndex; i <= maxIndex; ++i) {
      indices.push(list[i]);
    }

    return indices;
  }

  findClosest(sphericalCoords) {
    const closestIndices = this._findClosestIndices(sphericalCoords, this.verticesSortedByTheta, 'theta')
        .concat(this._findClosestIndices(sphericalCoords, this.verticesSortedByPhi, 'phi'));

    const closestIndex = _.min(closestIndices, function(index) {
      const vert = this.geometry.vertices[index.index].sphericalCoords;
      return (vert.theta - sphericalCoords.theta) * (vert.theta - sphericalCoords.theta)
          + (vert.phi - sphericalCoords.phi) * (vert.phi - sphericalCoords.phi);
    }.bind(this));

    return this.geometry.vertices[closestIndex.index];
  }
}

export default Heightmap;
