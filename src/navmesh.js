import _ from 'underscore';
import PlanetMath from './planet-math.js';
import THREE from 'three';

import { PriorityQueue } from 'es-collections';

class Navmesh {
  constructor(geometry, size) {
    this.geometry = geometry;
    this.size = size;
  }

  build() {
    const graphBuildStart = new Date().getTime();
    // first build a connectedness graph
    // for now we assume 3-way connectedness: e.g. two triangles are connected if they share at
    // least 2 vertices in common
    this.nodes = new Map();

    for (let i = 0; i < this.geometry.faces.length; ++i) {
      const face = this.geometry.faces[i];
      const vertices = [face.a, face.b, face.c];
      const node = {};
      node.adjacentNodes = [];
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

        node.adjacentNodes.push({index: j, sharedVertices: sharedVerts});
      }
      this.nodes.set(i, node);
    }

    let numConnections = 0;

    for (const nodeIndex of this.nodes.keys()) {
      numConnections += this.buildNeighbors(nodeIndex);
    }

    const graphBuildEnd = new Date().getTime();
    console.log(`Took ${graphBuildEnd - graphBuildStart}ms to build graph with ${numConnections} connections`);

    for (const nodeIndex of this.nodes.keys()) {
      this.buildHeuristic(nodeIndex);
    }

    const heuristicBuildEnd = new Date().getTime();

    console.log(`Took ${heuristicBuildEnd - graphBuildEnd}ms to build heuristic function`);
  }

  connectedness(node) {
    return this.nodes.get(node).h.size;
  }

  neighbors(node) {
    return this.nodes.get(node).neighbors;
  }

  findCentroid(from, to) {
    return _.findWhere(this.nodes.get(from).neighbors, {index: to}).centroid;
  }

  findEdge(from, to) {
    return _.findWhere(this.nodes.get(from).neighbors, {index: to}).sharedEdge;
  }


  isTraversable(nodeIndex) {
    const face = this.geometry.faces[nodeIndex];
    const testVertices = [face.a, face.b, face.c];
    const verticesAboveWater = _.reduce(
        testVertices,
        function(memo, v) {
          return memo + (this.geometry.vertices[v].lengthSq() > (this.size * this.size) ? 1 : 0);
        }.bind(this),
        0);

    return verticesAboveWater >= 2;
  }

  buildNeighbors(nodeIndex) {
    const node = this.nodes.get(nodeIndex);
    const face = this.geometry.faces[nodeIndex];
    node.neighbors = [];

    let numNeighbors = 0;

    for (const testNode of node.adjacentNodes) {
      if (!this.isTraversable(testNode.index)) continue;

      // const pointA = this.geometry.vertices[testNode.sharedVertices[0]]
      //     .clone().applyMatrix4(face.toFaceBasis);
      // const pointB = this.geometry.vertices[testNode.sharedVertices[1]]
      //     .clone().applyMatrix4(face.toFaceBasis);

      // const sharedEdge = {
      //   point: pointA,
      //   direction: pointB.sub(pointA).normalize(),
      // };

      const centroid = this.geometry.vertices[testNode.sharedVertices[0]].clone();

      if (testNode.sharedVertices.length == 2) {
        centroid.add(this.geometry.vertices[testNode.sharedVertices[1]])
            .multiplyScalar(0.5);
      }

      node.neighbors.push({index: testNode.index, centroid: centroid});
      ++numNeighbors;
    }

    return numNeighbors;
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
        if (!visited.has(neighbor.index) || h.get(neighbor.index) > node.distance + 1) {
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
    const costSoFar = new Map();
    const cameFrom = new Map();

    open.add({index: from, cost: 0});

    while (open.size) {
      const current = open.remove();
      if (current.index === to) {
        console.log(`evaluated ${closed.size} nodes`);
        return cameFrom;
      }

      for(const next of this.nodes.get(current.index).neighbors) {
        const newCost = costSoFar.get(current.index) + 1;
        if (!costSoFar.has(next.index) || newCost < costSoFar.get(next.index)) {
          costSoFar.set(next.index, newCost);
          open.add({index: next.index, cost: newCost + this.getH(next.index, to)});
          cameFrom.set(next.index, current.index);
        }
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
