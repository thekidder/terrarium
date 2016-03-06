import _ from 'underscore';
import THREE from 'three.js';

const defaultOptions = {
  sensitivity: 0.01,
};

class ArcBallCamera extends THREE.PerspectiveCamera {
  constructor(radius, center, options) {
    // requires aspect ratio to be set somewhere else
    super(75, 1.0, 0.1, 1000);

    this.yaw = 0.0;
    this.pitch = 0.0;
    this.radius = radius;
    this.center = center;
    this.options = _.extend({}, defaultOptions, options || {});
    this.previousRotation = new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(1, 0, 0), 0);
    this.currentRotation = new THREE.Quaternion();
    this.totalRotation = new THREE.Quaternion();

    this._update();
  }

  onResize(width, height) {
    this.screenWidth = width;
    this.screenHeight = height;
    this.aspect = width / height;
    this.updateProjectionMatrix();
  }

  startRotate(x, y) {
    this.dragStart = this.getArcballVector(x, y);
  }

  endRotate() {
    this.previousRotation.copy(this.totalRotation);
    this.previousRotation.normalize();
  }

  rotate(x, y) {
    const dragEnd = this.getArcballVector(x, y);

    const angle = Math.acos(this.dragStart.dot(dragEnd));
    const axis = this.dragStart.clone().cross(dragEnd).normalize();
    this.currentRotation.setFromAxisAngle(axis, angle);

    this.totalRotation.multiplyQuaternions(this.previousRotation, this.currentRotation).normalize();
    this._update();
  }

  getArcballVector(x, y) {
    x = -(x / this.screenWidth  * 2.0 - 1.0);
    y = -(y / this.screenHeight * 2.0 - 1.0);
    const vector = new THREE.Vector3(x, y, 0.0);
    if (vector.lengthSq() <= 1.0) {
      vector.z = Math.sqrt(1 - vector.lengthSq());
    } else {
      vector.normalize();
    }
    return vector;
  }

  _update() {
    this.position.set(0, 0, -this.radius)
        .applyQuaternion(this.totalRotation);
    this.lookAt(this.center);
  }
}

export default ArcBallCamera;
