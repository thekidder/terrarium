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
};

export default Debug;
