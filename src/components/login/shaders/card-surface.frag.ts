export const fragmentShaderSource = `
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;
uniform vec2 u_tilt;    // radians, [-0.175, 0.175]
uniform vec2 u_cursor;  // normalized [0,1] over card
uniform sampler2D u_textMask;

varying vec2 v_uv;

// --- Simplex 2D noise (Ashima Arts / MIT) ---
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                      -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m;
  m = m * m;
  vec3 x_ = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x_) - 0.5;
  vec3 ox = floor(x_ + 0.5);
  vec3 a0 = x_ - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

// --- Spectral wavelength to RGB (Bruton/CIE piecewise) ---
vec3 wavelengthToRGB(float wavelength) {
  float w = clamp(wavelength, 380.0, 780.0);
  vec3 color;

  if (w < 440.0) {
    color = vec3(-(w - 440.0) / 60.0, 0.0, 1.0);
  } else if (w < 490.0) {
    color = vec3(0.0, (w - 440.0) / 50.0, 1.0);
  } else if (w < 510.0) {
    color = vec3(0.0, 1.0, -(w - 510.0) / 20.0);
  } else if (w < 580.0) {
    color = vec3((w - 510.0) / 70.0, 1.0, 0.0);
  } else if (w < 645.0) {
    color = vec3(1.0, -(w - 645.0) / 65.0, 0.0);
  } else {
    color = vec3(1.0, 0.0, 0.0);
  }

  // Intensity fall-off at edges of visible spectrum
  float factor;
  if (w < 420.0) {
    factor = 0.3 + 0.7 * (w - 380.0) / 40.0;
  } else if (w > 700.0) {
    factor = 0.3 + 0.7 * (780.0 - w) / 80.0;
  } else {
    factor = 1.0;
  }

  return color * factor;
}

void main() {
  vec2 uv = v_uv;

  // --- Layer 1: Paper grain ---
  float timeOffset = u_time * 0.003;
  float coarseNoise = snoise(uv * 8.0 + timeOffset) * 0.7;
  float fineNoise = snoise(uv * 40.0 + timeOffset * 2.0) * 0.3;
  float grain = (coarseNoise + fineNoise) * 0.03;
  vec3 cardColor = vec3(0.106) + grain; // #1b1b1b base

  // --- Layer 2: Surface lighting ---
  // Card surface normal tilted by u_tilt
  vec3 N = normalize(vec3(-sin(u_tilt.x), -sin(u_tilt.y), cos(u_tilt.x) * cos(u_tilt.y)));
  vec3 V = vec3(0.0, 0.0, 1.0); // viewer direction

  // Primary overhead light
  vec3 L1 = normalize(vec3(0.0, -0.3, 1.0));
  vec3 H1 = normalize(L1 + V);
  float spec1 = pow(max(dot(N, H1), 0.0), 64.0);
  cardColor += spec1 * 0.15;

  // Secondary cursor-following light
  vec2 cursorOffset = (u_cursor - 0.5) * 2.0;
  vec3 L2 = normalize(vec3(cursorOffset.x * 0.6, cursorOffset.y * -0.6, 1.0));
  vec3 H2 = normalize(L2 + V);
  float spec2 = pow(max(dot(N, H2), 0.0), 32.0);
  cardColor += spec2 * 0.08;

  // --- Layer 3: Holographic foil (text regions only) ---
  float mask = texture2D(u_textMask, uv).r;

  if (mask > 0.1) {
    // Diffraction grating simulation
    float gratingPeriod = 1.6; // micrometers
    float incidentAngle = u_tilt.x * 2.0 + (uv.x - 0.5) * 0.4 + u_cursor.x * 0.3;
    float verticalAngle = u_tilt.y * 1.5 + (uv.y - 0.5) * 0.2 + u_cursor.y * 0.2;

    // Compute diffracted wavelength for first order
    float sinTheta = sin(incidentAngle + verticalAngle * 0.5);
    float wavelength = gratingPeriod * (sinTheta + sin(0.0)) * 1000.0; // nm scale

    // Map to visible range with wrapping for continuous rainbow
    wavelength = mod(wavelength, 400.0) + 380.0;

    vec3 holoColor = wavelengthToRGB(wavelength);

    // Fresnel-like edge brightening
    float fresnel = 1.0 + 0.5 * pow(1.0 - abs(dot(N, V)), 3.0);

    // Metallic base + rainbow
    vec3 metallic = vec3(0.7, 0.7, 0.72); // slightly cool silver
    vec3 foilColor = mix(metallic, holoColor, 0.6) * fresnel;

    // Specular highlight on foil (brighter than card surface)
    float foilSpec = pow(max(dot(N, H1), 0.0), 24.0) * 0.4;
    foilColor += foilSpec;

    // Blend foil onto card via mask
    cardColor = mix(cardColor, foilColor, mask * 0.95);
  }

  gl_FragColor = vec4(cardColor, 1.0);
}
`;
