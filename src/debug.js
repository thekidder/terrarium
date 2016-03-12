import THREE from 'three.js';

const Debug = {
  createMarker: function(position, size, color) {
    const material = new THREE.MeshBasicMaterial({
      color: color,
    });

    if (!(size instanceof THREE.Vector3)) {
      size = new THREE.Vector3(size, size, size);
    }

    const geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
    const marker = new THREE.Mesh(geometry, material);
    marker.name = "debug marker";

    marker.position.copy(position);

    return marker;
  },

  createMarkerLine: function(start, end, color) {
    const material = new THREE.LineBasicMaterial({
      color: color,
    });

    const geometry = new THREE.Geometry();
    geometry.vertices.push(start, end);

    const line = new THREE.Line(geometry, material);
    line.name = "debug line";

    return line;
  },
};

export default Debug;
