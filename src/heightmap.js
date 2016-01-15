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
    this.geometry = new THREE.IcosahedronGeometry(1, this.detail);

    this.geometry.vertices.forEach(function(v, i) {
      v.multiplyScalar(this.generationFunc(v));
    }.bind(this));

    this.geometry.faces.forEach(function(f, i) {
      // build face coordinate basis for f
      // f is a triangle with vertices a, b, c and the basis set x,y,z, where z points out from the origin
      const a = this.geometry.vertices[f.a];
      const b = this.geometry.vertices[f.b];
      const c = this.geometry.vertices[f.c];

      const x = a.clone().sub(c).normalize();
      const z = x.clone().cross(a.clone().sub(b).normalize()).normalize();
      const y = x.clone().cross(z).normalize();

      f.faceBasis = {
        x: x,
        y: y,
        z: z,
      };

      const translateMatrix = new THREE.Matrix4().makeTranslation(-a.x, -a.y, -a.z);

      f.fromFaceBasis = new THREE.Matrix4().makeBasis(x, y, z);

      f.toFaceBasis = new THREE.Matrix4().getInverse(f.fromFaceBasis)
          .multiply(translateMatrix);

      f.fromFaceBasis = new THREE.Matrix4().makeTranslation(a.x, a.y, a.z).multiply(f.fromFaceBasis);

      f.toPyramidBasis = new THREE.Matrix4().getInverse(new THREE.Matrix4().makeBasis(a, b, c));

      f.pointsInFaceSpace = [
        a.clone().applyMatrix4(f.toFaceBasis),
        b.clone().applyMatrix4(f.toFaceBasis),
        c.clone().applyMatrix4(f.toFaceBasis),
      ];

      f.faceIndex = i;
    }.bind(this));


    this.geometry.verticesNeedUpdate = true;
    this.geometry.computeBoundingBox();
  }

  locateFace(point) {
    for(let i = 0; i < this.geometry.faces.length; ++i) {
      if (this.inFace(point, this.geometry.faces[i])) {
        return this.geometry.faces[i];
      }
    }
  }

  inFace(point, face) {
    const pyramidCoords = new THREE.Vector3(point.x, point.y, point.z).applyMatrix4(face.toPyramidBasis);
    return pyramidCoords.x >= 0 && pyramidCoords.y >= 0 && pyramidCoords.z >= 0;
  }

  toFaceCoords(cartesianCoords) {
    const face = this.locateFace(cartesianCoords);
    return { face: face, uv: new THREE.Vector3(cartesianCoords.x, cartesianCoords.y, cartesianCoords.z).applyMatrix4(face.toFaceBasis) };
  }

  fromFaceCoords(faceCoords) {
    return faceCoords.uv.clone().applyMatrix4(faceCoords.face.fromFaceBasis);
  }

  updateFaceCoords(faceCoords) {
    if (!this.inTriangle(faceCoords.uv, faceCoords.face.pointsInFaceSpace)) {
      const cartesian = faceCoords.uv.clone().applyMatrix4(faceCoords.face.fromFaceBasis);
      faceCoords.face = this.locateFace(cartesian);
      faceCoords.uv = cartesian.applyMatrix4(faceCoords.face.toFaceBasis);
      faceCoords.uv.z = 0.0;
      return faceCoords;
    } else {
      return faceCoords;
    }
  }

  inTriangle(point, tris) {
    const area = 0.5*(
      -tris[1].y*tris[2].x +
      tris[0].y*(
        -tris[1].x + tris[2].x
      ) + tris[0].x*(
        tris[1].y - tris[2].y
      ) + tris[1].x*tris[2].y
    );

    const s = 1/(2*area)*(tris[0].y*tris[2].x - tris[0].x*tris[2].y + (tris[2].y - tris[0].y)*point.x + (tris[0].x - tris[2].x)*point.y);
    const t = 1/(2*area)*(tris[0].x*tris[1].y - tris[0].y*tris[1].x + (tris[0].y - tris[1].y)*point.x + (tris[1].x - tris[0].x)*point.y);

    return s >= 0 && t >= 0 && 1 - s - t >= 0;
  }

  placeOnSurface(cartesianCoords) {
    const face = this.locateFace(cartesianCoords);
    const faceCoords = cartesianCoords.clone().applyMatrix4(face.toFaceBasis);
    faceCoords.z = 0.0;
    const surfaceCoords = faceCoords.clone().applyMatrix4(face.fromFaceBasis);

    return surfaceCoords;
  }

  faceCentroid(faceIndex) {
    const face = this.geometry.faces[faceIndex];
    return this.geometry.vertices[face.a].clone()
        .add(this.geometry.vertices[face.b])
        .add(this.geometry.vertices[face.c])
        .multiplyScalar(1 / 3);
  }
}

export default Heightmap;