
export class FacePosition {
  constructor(face, uv) {
    this.face = face;
    this.uv = uv;
  }

  clone() {
    return new FacePosition(this.face, this.uv.clone());
  }
}

export class Position {
  constructor(heightmap) {
    this.heightmap = heightmap;
  }

  static fromCartesian(cartesian, heightmap) {
    const pos = new Position(heightmap);
    pos.setCartesian(cartesian);
    return pos;
  }

  static fromFace(face, heightmap) {
    const pos = new Position(heightmap);
    pos.setFace(face);
    return pos;
  }

  setFace(face) {
    this.face = face;
    this.cartesian = this.heightmap.fromFaceCoords(face);
  }

  setCartesian(cartesian) {
    this.cartesian = cartesian;
    this.face = this.heightmap.toFaceCoords(this.cartesian);
  }

  clone() {
    const pos = new Position(this.heightmap);
    pos.face = this.face.clone();
    pos.cartesian = this.cartesian.clone();
    return pos;
  }
}
