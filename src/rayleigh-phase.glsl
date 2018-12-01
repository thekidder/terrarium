float getRayleighPhase(vec3 sunDir, vec3 viewDir) {
  const float PI = 3.1415926535897932384626433832795;
  const float phaseConstant = 3.0 / (16.0 * PI);

  float cosTheta = dot(viewDir, sunDir);
  return phaseConstant * (1.0 + cosTheta * cosTheta);
}

#pragma glslify: export(getRayleighPhase)
