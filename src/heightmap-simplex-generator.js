import Simplex from 'simplex-noise';

function HeightmapSimplexGenerator(randomGenerator, scale, magnitude, size) {
  randomGenerator = randomGenerator || Math.random;

  const simplex = new Simplex(randomGenerator);

  return function generator(v) {
    const coords = v.clone().multiplyScalar(scale);
    const noise = simplex.noise3D(coords.x, coords.y, coords.z);
    return size + noise * magnitude * 0.5 * size;
  };
}

export default HeightmapSimplexGenerator;
