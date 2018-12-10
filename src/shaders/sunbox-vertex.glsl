uniform vec3 sunDir;
uniform vec3 sunIntensity;
uniform vec3 mieConstant;
uniform float minMieDepth;


varying vec3 mie;
varying vec3 viewDir;

void main() {
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);

  viewDir = normalize(position - cameraPosition);
  mie = sunIntensity * mieConstant * minMieDepth;
}
