uniform vec3 planetPos;
uniform vec3 sunDir;
uniform float atmosphereSize;
uniform float planetRadius;
uniform vec3 scatteringCoefficient;
uniform vec3 sunIntensity;
uniform sampler2D heightmap;
uniform float heightmapScale;
uniform float heightmapMin;

uniform float rayScaleHeight;
uniform float scaleHeight;

varying vec3 light;

bool rayIntersect(
    // ray
    vec3 origin,
    vec3 direction,
    // sphere
    vec3 center,
    float radius,
    out float firstDist,
    out float secondDist) {
  vec3 sphereDir = center - origin;
  float lenToCenter = dot(sphereDir, direction);
  float radiusSquared = radius * radius;

  float intersectionMagnitudeSquared = dot(sphereDir, sphereDir) - lenToCenter * lenToCenter;

  if (intersectionMagnitudeSquared > radiusSquared) {
    return false;
  }

  float d = sqrt(radiusSquared - intersectionMagnitudeSquared);
  firstDist = lenToCenter - d;
  secondDist = lenToCenter + d;
  return true;
}

const int numSunSamples = 10;

bool sampleLightToSun(vec3 point, vec3 sunDir, vec3 planetPos, float planetRadius, out float opticalDepth) {
  float _;
  float atmosphereThicknessAlongSunDir;
  rayIntersect(point, sunDir, planetPos, atmosphereSize, _, atmosphereThicknessAlongSunDir);

  float distAlongRay = 0.0;
  float segmentLength = distance(point, point + sunDir * atmosphereThicknessAlongSunDir) / float(numSunSamples);
  for (int i = 0; i < numSunSamples; i++) {
    vec3 rayPoint = point + sunDir * (distAlongRay + segmentLength * 0.5);
    float height = distance(planetPos, rayPoint) - planetRadius;

    if (height < 0.0) {
      return false;
    }

    opticalDepth += exp(-height / rayScaleHeight) * segmentLength;

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
    bool overGround = sampleLightToSun(point, sunDir, planetPos, planetRadius, sunRayOpticalDepth);

    if (overGround) {
      vec3 transmittance = exp(-scatteringCoefficient * (sunRayOpticalDepth + opticalDepth));
      accumulatedLight += transmittance * segmentOpticalDepth;
    }

    distAlongRay += segmentLength;
  }

  return accumulatedLight;
}

const float PI = 3.1415926535897932384626433832795;
const float phaseConstant = 3.0 / (16.0 * PI);

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
    light = vec3(0.0, 0.0, 0.0);
  } else {
    secondDist = distance(cameraPosition, position);

    float cosTheta = dot(viewDir, sunDir);
    float phase = phaseConstant * (1.0 + cosTheta * cosTheta);

    light = baseColor + getLightContributionfromRay(cameraPosition, viewDir, sunDir, planetPos, planetRadius, firstDist, secondDist) * sunIntensity * scatteringCoefficient * phase;
  }
}
