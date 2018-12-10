uniform vec3 sunDir;
uniform float g;
uniform float gSq;

varying vec3 mie;
varying vec3 viewDir;

#pragma glslify: getMiePhase = require('./mie-phase.glsl');

void main()	{
	float cosTheta = dot(-viewDir, sunDir) / length(viewDir);
	float cosThetaSq = cosTheta * cosTheta;

	vec3 finalColor = getMiePhase(cosTheta, cosThetaSq, g, gSq) * mie;

	gl_FragColor = vec4(finalColor, finalColor.b);
}
