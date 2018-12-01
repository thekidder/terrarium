const int numSunSamples = 30;

#pragma glslify: rayIntersect = require('./ray-intersect.glsl');

bool sampleLightToSun(vec3 point, vec3 sunDir, vec3 planetPos, float planetRadius, float atmosphereRadius, float sunScaleHeight, out float opticalDepth) {
  float _;
  float atmosphereThicknessAlongSunDir;
  rayIntersect(point, sunDir, planetPos, atmosphereRadius, _, atmosphereThicknessAlongSunDir);

  float distAlongRay = 0.0;
  float segmentLength = distance(point, point + sunDir * atmosphereThicknessAlongSunDir) / float(numSunSamples);
  for (int i = 0; i < numSunSamples; i++) {
    vec3 rayPoint = point + sunDir * (distAlongRay + segmentLength * 0.5);
    float height = distance(planetPos, rayPoint) - planetRadius;

    if (height < 0.0) {
      return false;
    }

    opticalDepth += exp(-height / sunScaleHeight) * segmentLength;

    distAlongRay += segmentLength;
  }
  return true;
}

const int numViewSamples = 100;

vec3 getLightContributionfromRay(
    vec3 cameraPos,
    vec3 viewDir,
    vec3 sunDir,
    vec3 planetPos,
    float planetRadius,
    float atmosphereRadius,
    vec3 scatteringCoefficient,
    float scaleHeight,
    float sunScaleHeight,
    float firstDist,
    float secondDist) {
  float opticalDepth = 0.0;

  vec3 accumulatedLight;
  float distAlongRay = 0.0;
  float segmentLength = (secondDist - firstDist) / float(numViewSamples);
  for (int i = 0; i < numViewSamples; i++) {
    vec3 point = cameraPos + viewDir * (distAlongRay + segmentLength * 0.5);

    float height = distance(point, planetPos) - planetRadius;
    float segmentOpticalDepth = exp(-height / scaleHeight) * segmentLength;
    opticalDepth += segmentOpticalDepth;

    float sunRayOpticalDepth = 0.0;
    bool overGround = sampleLightToSun(point, sunDir, planetPos, planetRadius, atmosphereRadius, sunScaleHeight, sunRayOpticalDepth);

    if (overGround) {
      vec3 transmittance = exp(-scatteringCoefficient * (sunRayOpticalDepth + opticalDepth));
      accumulatedLight += transmittance * segmentOpticalDepth;
    }

    distAlongRay += segmentLength;
  }

  return accumulatedLight;
}

#pragma glslify: export(getLightContributionfromRay)
