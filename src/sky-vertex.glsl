uniform vec3 planetPos;
uniform vec3 sunDir;
uniform float atmosphereSize;
uniform float planetRadius;
uniform vec3 scatteringCoefficient;
uniform vec3 sunIntensity;
uniform vec3 mieConstant;
uniform float minMieDepth;

uniform float scaleHeight;
uniform float rayScaleHeight;

varying vec3 rayleigh;
varying vec3 mie;
varying vec3 viewDir;
varying vec3 baseColor;

#pragma glslify: rayIntersect = require('./ray-intersect.glsl');
#pragma glslify: getLightContributionfromRay = require('./scattering.glsl');

void main() {
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);

  baseColor = vec3(0.0, 0.0, 0.0);
  viewDir = normalize(position - cameraPosition);

  float firstDist, secondDist;
  if(!rayIntersect(cameraPosition, viewDir, planetPos, atmosphereSize, firstDist, secondDist)) {
    // ray is outside atmosphere
    rayleigh = vec3(0.0, 0.0, 0.0);
    // use mie scattering with a very small optical depth to render the sun
    mie = sunIntensity * mieConstant * minMieDepth;
  } else {
    float firstPlanetDist, secondPlanetDist;
    if (rayIntersect(cameraPosition, viewDir, planetPos, planetRadius, firstPlanetDist, secondPlanetDist)) {
      // ray early terminates at planet
      secondDist = firstPlanetDist;
    }

    vec3 light = getLightContributionfromRay(cameraPosition, viewDir, sunDir, planetPos, planetRadius,
      atmosphereSize, scatteringCoefficient, scaleHeight, rayScaleHeight, firstDist, secondDist);

    rayleigh = sunIntensity * scatteringCoefficient * light;
    mie = sunIntensity * max(light, minMieDepth) * mieConstant;
  }
}
