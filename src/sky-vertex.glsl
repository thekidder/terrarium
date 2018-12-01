uniform vec3 planetPos;
uniform vec3 sunDir;
uniform float atmosphereSize;
uniform float planetRadius;
uniform vec3 scatteringCoefficient;
uniform vec3 sunIntensity;

uniform float scaleHeight;
uniform float rayScaleHeight;

varying vec3 finalColor;

#pragma glslify: rayIntersect = require('./ray-intersect.glsl');
#pragma glslify: getLightContributionfromRay = require('./rayleigh-scattering.glsl');
#pragma glslify: getRayleighPhase = require('./rayleigh-phase.glsl');

void main() {
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);

  vec3 viewDir = normalize(position - cameraPosition);

  float firstDist, secondDist;
  if(!rayIntersect(cameraPosition, viewDir, planetPos, atmosphereSize, firstDist, secondDist)) {
    // ray is outside atmosphere
    finalColor = vec3(0.0, 0.0, 0.0);
  } else {
    float firstPlanetDist, secondPlanetDist;
    if (rayIntersect(cameraPosition, viewDir, planetPos, planetRadius, firstPlanetDist, secondPlanetDist)) {
      // ray early terminates at planet
      secondDist = firstPlanetDist;
    }

    vec3 rayleigh = getLightContributionfromRay(cameraPosition, viewDir, sunDir, planetPos, planetRadius,
      atmosphereSize, scatteringCoefficient, scaleHeight, rayScaleHeight, firstDist, secondDist);
    float phase = getRayleighPhase(sunDir, viewDir);

    finalColor = rayleigh * sunIntensity * scatteringCoefficient * phase;
  }
}
