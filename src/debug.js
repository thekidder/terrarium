import THREE from 'three.js';

const Debug = {
  createMarker: function(position, size, color) {
    const material = new THREE.MeshBasicMaterial({
      color: color,
    });
    const geometry = new THREE.BoxGeometry(size, size, size);
    const marker = new THREE.Mesh(geometry, material);

    marker.position.copy(position);

    return marker;
  },

  createMarkerLine: function(start, end, color) {
    const material = new THREE.LineBasicMaterial({
      color: color,
    });

    const geometry = new THREE.Geometry();
    geometry.vertices.push(start, end);

    return new THREE.Line(geometry, material);
  },
};

export default Debug;
