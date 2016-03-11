import Random from 'random-seed';

import Heightmap from './heightmap.js';
import HeightmapSimplexGenerator from './heightmap-simplex-generator.js';

const PlanetGenerator = {
  buildHeightmap: function(seed, scale, magnitude) {
    console.log(`seed: ${seed}`);

    const random = new Random(seed).random;

    return Heightmap.generate(
        3, HeightmapSimplexGenerator(random, scale, magnitude));
  },
};

export default PlanetGenerator;
