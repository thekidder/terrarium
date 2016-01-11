import _ from 'underscore';
import PlanetMath from './planet-math.js';
import THREE from 'three.js';

class Navmesh {
  constructor(geometry) {
    this.geometry = geometry;
  }

  build() {
    // first build a connectedness graph
    // for now we assume 3-way connectedness: e.g. two triangles are connected if they share at
    // least 2 vertices in common
    this.nodes = new Map();

    for (let i = 0; i < this.geometry.faces.length; ++i) {
      const face = this.geometry.faces[i];
      const vertices = [face.a, face.b, face.c];
      face.neighbors = new Set();
      for (let j = 0; j < this.geometry.faces.length; ++j) {
        if (i == j) continue;

        const testFace = this.geometry.faces[j];
        const testVertices = [testFace.a, testFace.b, testFace.c];

        if (_.intersection(vertices, testVertices).length == 2) {
          face.neighbors.add(j);
        }
      }
    }

    // next build our A* heuristic. Do a breadth-first search over all nodes to find the distance
    // (in number of nodes) to every other node.
    for (let i = 0; i < this.geometry.faces.length; ++i) {
      const face = this.geometry.faces[i];
      for (let j = 0; j < this.geometry.faces.length; ++j) {
      }
    }
  }
}

export default Navmesh;
