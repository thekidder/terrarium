uniform vec3 planetPos;
uniform vec3 sunDir;
uniform float atmosphereSize;
uniform float planetRadius;
uniform vec3 scatteringCoefficient;
uniform vec3 sunIntensity;

uniform float rayScaleHeight;
uniform float scaleHeight;

varying vec3 finalColor;

#pragma glslify: rayIntersect = require('./ray-intersect.glsl');
#pragma glslify: getLightContributionfromRay = require('./rayleigh-scattering.glsl');
#pragma glslify: getRayleighPhase = require('./rayleigh-phase.glsl');

void main() {
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);

  vec3 viewDir = normalize(position - cameraPosition);

  vec3 ambient = vec3(0.30, 0.36, 0.64) * 0.12;
  vec3 diffuse = pow(max(dot(sunDir, normal), 0.0), 2.0) * vec3(0.94, 0.93, 0.79) * 0.7;
  vec3 halfDir = normalize(sunDir + viewDir);
  float specAngle = max(dot(halfDir, normal), 0.0);
  vec3 specular = pow(specAngle, 1.0) * vec3(0.94, 0.93, 0.79) * 0.15;
  // vec3 specular =
  vec3 baseColor = color * (ambient + diffuse + specular);

  float firstDist, secondDist, _;
  if(!rayIntersect(cameraPosition, viewDir, planetPos, atmosphereSize, firstDist, _)) {
    // ray is outside atmosphere
    finalColor = vec3(0.0, 0.0, 0.0);
  } else {
    secondDist = distance(cameraPosition, position);

    vec3 rayleigh = getLightContributionfromRay(cameraPosition, viewDir, sunDir, planetPos, planetRadius,
      atmosphereSize, scatteringCoefficient, scaleHeight, rayScaleHeight, firstDist, secondDist);
    float phase = getRayleighPhase(sunDir, viewDir);

    finalColor = baseColor + rayleigh * sunIntensity * scatteringCoefficient * phase;
  }
}
