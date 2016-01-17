import _ from 'underscore';
import PlanetMath from './planet-math.js';
import THREE from 'three.js';

import { PriorityQueue } from 'es-collections';

class Navmesh {
  constructor(geometry) {
    this.geometry = geometry;
  }

  build() {
    let numConnections = 0;
    const graphBuildStart = new Date().getTime();
    // first build a connectedness graph
    // for now we assume 3-way connectedness: e.g. two triangles are connected if they share at
    // least 2 vertices in common
    const nodes = new Map();

    for (let i = 0; i < this.geometry.faces.length; ++i) {
      const face = this.geometry.faces[i];
      const vertices = [face.a, face.b, face.c];
      const node = {};
      node.neighbors = [];
      for (let j = 0; j < this.geometry.faces.length; ++j) {
        if (i == j) {
          continue;
        }

        const testFace = this.geometry.faces[j];
        const testVertices = [testFace.a, testFace.b, testFace.c];

        const sharedVerts = _.intersection(vertices, testVertices);

        if (sharedVerts.length < 2) {
          continue;
        }

        const verticesAboveWater = _.reduce(
            testVertices,
            function(memo, v) {
              return memo + (this.geometry.vertices[v].lengthSq() > 1 ? 1 : 0);
            }.bind(this),
            0);

        if (verticesAboveWater < 2) {
          continue;
        }

        const centroid = this.geometry.vertices[sharedVerts[0]].clone()
            .add(this.geometry.vertices[sharedVerts[1]])
            .multiplyScalar(0.5);

        node.neighbors.push({index: j, centroid: centroid});
        ++numConnections;
      }
      nodes.set(i, node);
    }

    this.nodes = nodes;

    const graphBuildEnd = new Date().getTime();

    console.log(`Took ${graphBuildEnd - graphBuildStart}ms to build graph with ${numConnections} connections`);

    for (let i = 0; i < this.geometry.faces.length; ++i) {
      this.buildHeuristic(i);
    }

    const heuristicBuildEnd = new Date().getTime();

    console.log(`Took ${heuristicBuildEnd - graphBuildEnd}ms to build heuristic function`);
  }

  findCentroid(from, to) {
    return _.findWhere(this.nodes.get(from).neighbors, {index: to}).centroid;
  }

  // build our A* heuristic. Do a breadth-first search over all nodes to find the distance
  // (in number of nodes) to every other node.
  buildHeuristic(nodeIndex) {
    this.nodes.get(nodeIndex).h = new Map();
    const h = this.nodes.get(nodeIndex).h;

    const visited = new Set();
    const next = [{node: nodeIndex, distance: 0}];

    while(next.length > 0) {
      const node = next.shift();
      for (const neighbor of this.nodes.get(node.node).neighbors) {
        if (!visited.has(neighbor.index)) {
          next.push({node: neighbor.index, distance: node.distance + 1});
          visited.add(neighbor.index);
        }
      }

      h.set(node.node, node.distance);
    }
  }

  // a* pathing using the precomputed h (distance to goal in nodes)
  findPath(from, to) {
    const path = [];
    const parents = this.collectPath(from, to);

    if (!parents) {
      return null;
    }

    while (from !== to) {
      path.push(to);
      to = parents.get(to);
    }
    path.push(to);

    path.reverse();

    return path;
  }

  collectPath(from, to) {
    const open = new PriorityQueue((a, b) => a.f - b.f);
    const closed = new Set();
    const parents = new Map();

    open.add({node: from, g: 0});

    while (open.size) {
      const current = open.remove();
      if (current.node === to) {
        console.log(`evaluated ${closed.size} nodes`);
        return parents;
      }
      closed.add(current.node);

      for(const neighbor of this.nodes.get(current.node).neighbors) {
        if (closed.has(neighbor.index)) continue;
        const currentCost = current.g + 1;
        const next = {node: neighbor.index, g: currentCost, f: currentCost + this.getH(neighbor.index, to)};
        parents.set(neighbor.index, current.node);
        open.add(next);
      }
    }
    return null;
  }

  getH(from, to) {
    if (from > to) {
      [from, to] = [to, from];
    }

    return this.nodes.get(from).h.get(to);
  }
}

export default Navmesh;
