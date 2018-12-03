float getRayleighPhase(float cosThetaSq) {
  const float PI = 3.1415926535897932384626433832795;
  const float phaseConstant = 3.0 / PI;

  return phaseConstant * (1.0 + cosThetaSq);
}

#pragma glslify: export(getRayleighPhase)
