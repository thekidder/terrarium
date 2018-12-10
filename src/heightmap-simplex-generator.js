import Simplex from 'simplex-noise';

function HeightmapSimplexGenerator(randomGenerator, scale, magnitude, size) {
  randomGenerator = randomGenerator || Math.random;

  const simplex = new Simplex(randomGenerator);

  const min = size + (-1) * magnitude * 0.5 * size;
  const max = size + (1) * magnitude * 0.5 * size;
  console.log(`min: ${min} max ${max}`);


  return function generator(v) {
    const coords = v.clone().multiplyScalar(scale);
    const noise = simplex.noise3D(coords.x, coords.y, coords.z);
    const fineCoords = v.clone().multiplyScalar(scale * 7.39);
    const fineNoise = simplex.noise3D(fineCoords.x, fineCoords.y, fineCoords.z);
    const fineNoiseContribution = Math.max(0.0, Math.min(1.0, noise - 0.3));
    const r = size + noise * magnitude * 0.5 * size + fineNoise * magnitude * 0.25 * size * fineNoiseContribution;
    if (r < min || r > max) {
      console.log(r);
    }
    return r;
  };
}

export default HeightmapSimplexGenerator;
