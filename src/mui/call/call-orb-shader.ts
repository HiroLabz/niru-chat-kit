/**
 * The orb's WebGL shaders, ported from Niru's orb: the three blues are the uniforms `uDeep`, `uMid` and `uPale`, which the
 * kit derives from its accent token.
 * A domain-warped noise makes the cloud; a blue gradient runs from the upper left to a pale lower
 * right; the edge is soft; `uDim` greys the whole orb.
 */

export const ORB_VERTEX_SHADER = `attribute vec2 a; void main(){ gl_Position = vec4(a, 0.0, 1.0); }`;

export const ORB_FRAGMENT_SHADER = `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform float uLevel;
uniform float uPulse;
uniform float uDim;
uniform float uSwirl;
uniform vec3 uDeep;
uniform vec3 uMid;
uniform vec3 uPale;

float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i), b = hash(i + vec2(1.0, 0.0)), c = hash(i + vec2(0.0, 1.0)), d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
float fbm(vec2 p){
  float v = 0.0, amp = 0.5;
  for (int i = 0; i < 5; i++) { v += amp * noise(p); p = p * 2.03 + vec2(1.7, 9.2); amp *= 0.46; }
  return v;
}
void main(){
  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / min(uRes.x, uRes.y);
  float radius = 0.40 + 0.045 * uLevel + uPulse;
  vec2 p = uv / radius;
  float d = length(p);
  float t = uTime;

  float ang = uSwirl * (1.0 - smoothstep(0.0, 1.1, d)) * 0.9;
  float cs = cos(ang), sn = sin(ang);
  vec2 s = vec2(cs * p.x - sn * p.y, sn * p.x + cs * p.y);

  vec2 q = vec2(fbm(s * 1.05 + vec2(0.0, t * 0.22)), fbm(s * 1.05 + vec2(5.2, -t * 0.18)));
  vec2 w = s * 0.85 + (1.15 + 0.9 * uLevel) * q + vec2(t * 0.07, -t * 0.05);
  float n = fbm(w);

  float g = clamp(0.5 + 0.62 * dot(p, normalize(vec2(0.55, -0.83))), 0.0, 1.0);
  vec3 sky = mix(uDeep, uMid, smoothstep(0.0, 0.85, g));

  float cloud = smoothstep(0.36, 0.80, n + 0.50 * g - 0.15 + 0.10 * uLevel);
  vec3 col = mix(sky, uPale, cloud);
  col = mix(col, vec3(1.0), 0.22 * cloud * cloud);

  float shade = smoothstep(0.55, 1.0, d);
  col *= 1.0 - 0.16 * shade;
  col += 0.05 * (1.0 - smoothstep(0.0, 0.9, length(p - vec2(-0.35, 0.40))));

  float lum = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(col, vec3(lum) * 0.78, uDim);

  float alpha = 1.0 - smoothstep(0.975, 1.0, d);
  gl_FragColor = vec4(col * alpha, alpha);
}`;

export const ORB_UNIFORMS = ["uRes", "uTime", "uLevel", "uPulse", "uDim", "uSwirl", "uDeep", "uMid", "uPale"] as const;
export type OrbUniform = (typeof ORB_UNIFORMS)[number];
