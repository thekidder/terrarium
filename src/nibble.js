import * as THREE from 'three';

import Debug from './debug.js';
import Scheduler from './scheduler.js';

import { BehaviorList } from './path.js';
import { Position } from './position.js';

class Nibble {
  constructor(planet, pathFactory, position) {
    this.planet = planet;
    this.pathFactory = pathFactory;
    this.marker = Debug.createMarker(new THREE.Vector3(), 0.8, 0xffffff);
    this.marker.position.copy(position);
    this.options = { debug: true };

    this.makeGrassScheduler = new Scheduler(this.makeGrass.bind(this), 500);

    this.planet.sphere.add(this.marker);

    this.behaviors = new BehaviorList([], planet);
    this.position = Position.fromCartesian(position, planet.heightmap);
    this.lastVelocity = new THREE.Vector3();

    if (this.options.debug) {
      this.debugVelocity = Debug.createMarkerLine(new THREE.Vector3(), new THREE.Vector3(), 0xff0000);
      this.planet.sphere.add(this.debugVelocity);
    }
  }

  wander() {
    this.behaviors.clear();
    this.behaviors.behaviors.push(this.pathFactory.wander(this.position));
    this.behaviors.behaviors.push(this.pathFactory.avoidWater());
    this.behaviors.behaviors.push(this.pathFactory.constrainToRadius(this.position, 5.0));
  }

  pathTo(dest) {
    this.behaviors.clear();
    this.behaviors.behaviors.push(this.pathFactory.findPath(this.position, Position.fromCartesian(dest.clone(), this.planet.heightmap)));
  }

  update(millis) {
    this.move(millis);
    this.makeGrassScheduler.update(millis);
  }

  makeGrass() {
    this.planet.makeGrass(this.position.face.face);
  }

  monument(monument) {
    this.behaviors.clear();
    this.behaviors.behaviors.push(this.pathFactory.avoidWater());
    this.behaviors.behaviors.push(this.pathFactory.monument(this.position, monument));
  }

  move(millis) {
    this.behaviors.update(millis, this.lastVelocity, this.position);

    // ensure velocity is on planet surface
    this.behaviors.velocity.add(this.position.cartesian);
    this.behaviors.velocity.copy(this.planet.heightmap.placeOnSurface(this.behaviors.velocity));
    this.behaviors.velocity.sub(this.position.cartesian);

    this.lastVelocity.copy(this.behaviors.velocity);

    this.position.cartesian.add(this.behaviors.velocity.multiplyScalar(millis * 0.001));
    this.position.cartesian.copy(this.planet.heightmap.placeOnSurface(this.position.cartesian));
    this.position.setCartesian(this.position.cartesian);

    this.marker.position.copy(this.position.cartesian);
  }

  toJSON() {
    return {
      position: {
        x: this.marker.position.x,
        y: this.marker.position.y,
        z: this.marker.position.z,
      },
    };
  }
};

export default Nibble;
