uniform vec3 sunDir;
uniform float g;
uniform float gSq;

varying vec3 rayleigh;
varying vec3 mie;
varying vec3 viewDir;
varying vec3 baseColor;

#pragma glslify: getRayleighPhase = require('./rayleigh-phase.glsl');
#pragma glslify: getMiePhase = require('./mie-phase.glsl');

void main()	{
	float cosTheta = dot(-viewDir, sunDir) / length(viewDir);
	float cosThetaSq = cosTheta * cosTheta;

	vec3 finalColor = baseColor +
		getRayleighPhase(cosThetaSq) * rayleigh +
  	getMiePhase(cosTheta, cosThetaSq, g, gSq) * mie;

	gl_FragColor = vec4(finalColor, finalColor.b);
}
