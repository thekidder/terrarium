float getMiePhase(float cosTheta, float cosThetaSq, float g, float gSq) {
  const float PI = 3.1415926535897932384626433832795;
  const float phaseConstant = 4.0 * PI;

  return phaseConstant *
    (3.0 * (1.0 - gSq) / (2.0 * (2.0 + gSq))) *
    ((1.0 + cosThetaSq) / pow(1.0 + gSq - 2.0 * g * cosTheta , 1.5));
}

#pragma glslify: export(getMiePhase)
