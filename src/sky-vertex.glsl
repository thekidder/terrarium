uniform vec3 planetPos;
uniform float atmosphereSize;

varying vec3 viewDir;

void main() {
  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

  viewDir = normalize(cameraPosition - position);
  vec3 frontOfAtmosphereAlongView = viewDir * dot(viewDir * atmosphereSize, cameraPosition - position);
}
