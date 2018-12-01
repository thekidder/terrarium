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

#pragma glslify: export(rayIntersect)
