uniform float atmosphereSize;

varying vec3 viewDir;
varying float atmosphereThickness;

void main()	{
	gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0) * (atmosphereThickness / (atmosphereSize * 255.0));
}
