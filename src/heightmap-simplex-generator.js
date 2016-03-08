import Simplex from 'simplex-noise';

function HeightmapSimplexGenerator(randomGenerator, scale, magnitude) {
  randomGenerator = randomGenerator || Math.random;

  const simplex = new Simplex(randomGenerator);

  return function generator(v) {
    const noise = simplex.noise3D(v.x * scale, v.y * scale, v.z * scale);
    return 1 + noise * magnitude * 0.5;
  };
}

export default HeightmapSimplexGenerator;
