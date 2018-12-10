uniform vec3 planetPos;
uniform vec3 sunDir;
uniform float atmosphereSize;
uniform float planetRadius;
uniform vec3 scatteringCoefficient;
uniform vec3 sunIntensity;
uniform vec3 mieConstant;
uniform float minMieDepth;

uniform float rayScaleHeight;
uniform float scaleHeight;

varying vec3 rayleigh;
varying vec3 mie;
varying vec3 viewDir;
varying vec3 baseColor;

#pragma glslify: rayIntersect = require('./ray-intersect.glsl');
#pragma glslify: getLightContributionfromRay = require('./scattering.glsl');
#pragma glslify: getRayleighPhase = require('./rayleigh-phase.glsl');

void main() {
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);

  float height = length(position);
  float colorMultiplier = min(1.0, max(-1.0, (height - 6.6) * 0.5));
  vec3 heightColor = 1.2 * colorMultiplier * vec3(1.0, 1.0, 1.0) + color;

  viewDir = normalize(position - cameraPosition);

  vec3 ambient = vec3(0.30, 0.36, 0.64) * 0.12;
  vec3 diffuse = pow(max(dot(sunDir, normal), 0.0), 2.0) * vec3(0.94, 0.93, 0.79) * 0.7;
  vec3 halfDir = normalize(sunDir + viewDir);
  float specAngle = max(dot(halfDir, normal), 0.0);
  vec3 specular = pow(specAngle, 1.0) * vec3(0.94, 0.93, 0.79) * 0.15;
  // vec3 specular =
  baseColor = heightColor * (ambient + diffuse + specular);

  float firstDist, secondDist, _;
  if(!rayIntersect(cameraPosition, viewDir, planetPos, atmosphereSize, firstDist, _)) {
    // ray is outside atmosphere
    rayleigh = vec3(0.0, 0.0, 0.0);
    // use mie scattering with a very small optical depth to render the sun
    mie = sunIntensity * mieConstant * minMieDepth;
  } else {
    secondDist = distance(cameraPosition, position);

    vec3 light = getLightContributionfromRay(cameraPosition, viewDir, sunDir, planetPos, planetRadius,
      atmosphereSize, scatteringCoefficient, scaleHeight, rayScaleHeight, firstDist, secondDist);

    rayleigh = light * sunIntensity * scatteringCoefficient;
    mie = sunIntensity * light * mieConstant;
  }
}
