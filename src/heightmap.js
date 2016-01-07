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

      f.basis = {
        x: x,
        y: y,
        z: z,
      };

      f.basisTransform = new THREE.Matrix4().getInverse(new THREE.Matrix4().makeBasis(x, y, z))
          .multiply(new THREE.Matrix4().makeTranslation(-a.x, -a.y, -a.z));

      f.pointsInBasisSpace = [
        a.clone().applyMatrix4(f.basisTransform),
        b.clone().applyMatrix4(f.basisTransform),
        c.clone().applyMatrix4(f.basisTransform),
      ];

      console.log(f);
    }.bind(this));


    this.geometry.verticesNeedUpdate = true;
    this.geometry.computeBoundingBox();
  }

  locateFace(cartesianCoords) {
    return this.geometry.faces[0];
  }

  face(point) {
    this.geometry.faces.forEach(function(f) {
      if (this.inFace(point, f)) {
        console.log(`${JSON.stringify(point)} is in ${JSON.stringify(f)}`);
      }
    }.bind(this));
  }

  inFace(point, face) {
    const faceCoords = new THREE.Vector3(point.x, point.y, point.z).applyMatrix4(face.basisTransform);
    //console.log(`facecoords: ${JSON.stringify(faceCoords)}`);

    if(this.inTriangle(faceCoords, face.pointsInBasisSpace)) {
      console.log(`facecoords: ${JSON.stringify(faceCoords)}`);
      return true;
    }
    return false;
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
    console.log(`face for ${JSON.stringify(cartesianCoords)} is ${JSON.stringify(face)}`);
    return face;
  }
}

export default Heightmap;
