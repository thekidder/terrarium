import _ from 'underscore';
import * as THREE from 'three';

const defaultOptions = {
  sensitivity: 1.0,
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

    this.arcBallVectorPrevious = new THREE.Vector2();
    this.arcBallVectorCurrent = new THREE.Vector2();

    // the following vars are only used in rotate(), but adding them as class variables to
    // avoid lots of instance creation and GC overhead
    this.eye = new THREE.Vector3();
    this.moveDirection = new THREE.Vector3();
    this.moveAngle = 0.0;
    this.axis = new THREE.Vector3();
    this.rotateQuaternion = new THREE.Quaternion();
    this.eyeDirection = new THREE.Vector3();
    this.objectUpDirection = new THREE.Vector3();
    this.objectSidewaysDirection = new THREE.Vector3();

    this.position.set(radius, 0, 0);
  }

  onResize(width, height) {
    this.screenWidth = width;
    this.screenHeight = height;
    this.aspect = width / height;
    this.updateProjectionMatrix();
  }

  startRotate(x, y) {
    this.arcBallVectorCurrent.copy(this.getArcballVector(x, y));
    this.arcBallVectorPrevious.copy(this.arcBallVectorCurrent);
  }

  endRotate() {
  }

  rotateBy(direction) {
    this.moveDirection.copy(direction);
    this.moveAngle = this.moveDirection.length();
    if (this.moveAngle) {
      this.eye.subVectors(this.position, this.center).normalize();

      this.eyeDirection.copy(this.eye).normalize();
      this.objectUpDirection.copy(this.up).normalize();
      this.objectSidewaysDirection.crossVectors(this.objectUpDirection, this.eyeDirection)
        .normalize();
      this.objectUpDirection.setLength(
        this.moveDirection.y);
      this.objectSidewaysDirection.setLength(
        this.moveDirection.x);
      this.moveDirection.copy(this.objectUpDirection.add(this.objectSidewaysDirection));
      this.axis.crossVectors(this.moveDirection, this.eye).normalize();

      this.moveAngle *= this.options.sensitivity;
      this.rotateQuaternion.setFromAxisAngle(this.axis, this.moveAngle);

      this.eye.applyQuaternion(this.rotateQuaternion);
      this.up.applyQuaternion(this.rotateQuaternion);

      this.position.addVectors(this.center, this.eye);
      this.position.multiplyScalar(this.radius);
    }

    this.lookAt(this.center);
  }

  rotate(x, y) {
    this.arcBallVectorPrevious.copy(this.arcBallVectorCurrent);
    this.arcBallVectorCurrent.copy(this.getArcballVector(x, y));

    this.moveDirection.set(
      this.arcBallVectorCurrent.x - this.arcBallVectorPrevious.x,
      this.arcBallVectorCurrent.y - this.arcBallVectorPrevious.y,
      0.0);

    this.rotateBy(this.moveDirection);
    this.arcBallVectorPrevious.copy(this.arcBallVectorCurrent);
  }

  getArcballVector(x, y) {
    return new THREE.Vector3(
      (x - this.screenWidth * 0.5) / (this.screenWidth * 0.5),
      (this.screenHeight - 2.0 * y) / this.screenWidth, // screen.width intentional
      0.0);
  }
}

export default ArcBallCamera;
