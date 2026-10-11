import { decomposeColor } from "@mui/material/styles";
import type { VoiceLevels } from "../../core/voice/voice-types";
import { isLiveOrb, type OrbState } from "./call-orb-state";
import { ORB_LOOKS, advance, frameOf, heardLevel, motionAt, type OrbMotion } from "./call-orb-motion";
import { ORB_FRAGMENT_SHADER, ORB_UNIFORMS, ORB_VERTEX_SHADER, type OrbUniform } from "./call-orb-shader";

/** The orb's three blues (deep, mid, pale), as any CSS colour the kit's tokens produce. */
export interface OrbColors {
  deep: string;
  mid: string;
  pale: string;
}

const CONTEXT_ATTRIBUTES: WebGLContextAttributes = { premultipliedAlpha: true, alpha: true, antialias: true };
const TRIANGLE = new Float32Array([-1, -1, 3, -1, -1, 3]);
const LOSE_CONTEXT = "WEBGL_lose_context";
const MILLISECONDS = 1000;

/** A CSS colour (hex, rgb() or hsl()) as the shader's normalised vector; black when it cannot be read. */
export function colorToVector(color: string): [number, number, number] {
  try {
    const [r, g, b] = decomposeColor(color).values;
    return [r / 255, g / 255, b / 255];
  } catch {
    return [0, 0, 0];
  }
}

/** What the orb is told: the state to look like, the levels to read, whether it holds still, and its size. */
export interface OrbSettings {
  state: OrbState;
  levels: VoiceLevels;
  still: boolean;
  /** The edge of the square box, in CSS pixels. */
  size: number;
  /** Device pixels per CSS pixel, already capped. */
  ratio: number;
}

export interface OrbEngine {
  /** Applies new settings: a still orb draws once, a moving one makes sure its loop runs. */
  configure(settings: OrbSettings): void;
  /** Stops the loop, releases the program, buffer and context, and takes the canvas out of the page. */
  dispose(): void;
}

export interface OrbEngineOptions {
  /** The element the canvas is placed in. */
  host: HTMLElement;
  colors: OrbColors;
  /** Called when the context cannot be rebuilt after being lost. */
  onFail: () => void;
}

interface Program {
  program: WebGLProgram;
  buffer: WebGLBuffer | null;
  shaders: WebGLShader[];
  uniforms: Record<OrbUniform, WebGLUniformLocation | null>;
}

function compile(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
  gl.deleteShader(shader);
  return null;
}

function release(gl: WebGLRenderingContext, built: Program): void {
  gl.deleteBuffer(built.buffer);
  built.shaders.forEach((shader) => gl.deleteShader(shader));
  gl.deleteProgram(built.program);
}

/** Compiles and links the program, fills the buffer and sets the colours once; null if any step fails. */
function build(gl: WebGLRenderingContext, colors: OrbColors): Program | null {
  const vertex = compile(gl, gl.VERTEX_SHADER, ORB_VERTEX_SHADER);
  const fragment = compile(gl, gl.FRAGMENT_SHADER, ORB_FRAGMENT_SHADER);
  const program = gl.createProgram();
  if (!vertex || !fragment || !program) {
    if (vertex) gl.deleteShader(vertex);
    if (fragment) gl.deleteShader(fragment);
    if (program) gl.deleteProgram(program);
    return null;
  }
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  const buffer = gl.createBuffer();
  const uniforms = Object.fromEntries(ORB_UNIFORMS.map((name) => [name, gl.getUniformLocation(program, name)])) as Program["uniforms"];
  const built: Program = { program, buffer, shaders: [vertex, fragment], uniforms };
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    release(gl, built);
    return null;
  }
  gl.useProgram(program);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, TRIANGLE, gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, "a");
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  gl.uniform3f(uniforms.uDeep, ...colorToVector(colors.deep));
  gl.uniform3f(uniforms.uMid, ...colorToVector(colors.mid));
  gl.uniform3f(uniforms.uPale, ...colorToVector(colors.pale));
  return built;
}

/**
 * The orb's drawing, outside React. It makes the canvas and its WebGL context once, draws the
 * preview's shader from one animation-frame loop that reads the state and `levels.get()` from its own
 * fields, and never touches React. The loop stops while the document is hidden, while the orb is
 * held still, and on dispose; a lost context is rebuilt when the browser restores it. Returns null
 * when WebGL is missing or the shader will not compile or link, and the caller shows its fallback.
 */
export function createOrbEngine({ host, colors, onFail }: OrbEngineOptions): OrbEngine | null {
  const canvas = host.ownerDocument.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.display = "block";
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  const gl = canvas.getContext("webgl", CONTEXT_ATTRIBUTES);
  const first = gl ? build(gl, colors) : null;
  if (!gl || !first) {
    if (gl && !first) gl.getExtension(LOSE_CONTEXT)?.loseContext();
    return null;
  }
  host.appendChild(canvas);

  let built: Program | null = first;
  let settings: OrbSettings | null = null;
  let motion: OrbMotion = motionAt(ORB_LOOKS.idle);
  let programSized = false;
  let frame = 0;
  let last: number | null = null;
  let visible = host.ownerDocument.visibilityState !== "hidden";
  let lost = false;

  const draw = (seconds: number) => {
    if (!built || !settings) return;
    const look = ORB_LOOKS[settings.state];
    const values = frameOf(motion, look, seconds, settings.still);
    const { uniforms } = built;
    gl.uniform1f(uniforms.uTime, values.time);
    gl.uniform1f(uniforms.uLevel, values.level);
    gl.uniform1f(uniforms.uPulse, values.pulse);
    gl.uniform1f(uniforms.uDim, values.dim);
    gl.uniform1f(uniforms.uSwirl, values.swirl);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  const drawNow = () => draw(performance.now() / MILLISECONDS);

  const resize = (): boolean => {
    if (!settings) return false;
    const edge = Math.max(1, Math.round(settings.size * settings.ratio));
    const grown = canvas.width !== edge;
    if (grown) {
      canvas.width = edge;
      canvas.height = edge;
    }
    if (!built || (!grown && programSized)) return grown;
    gl.viewport(0, 0, edge, edge);
    gl.uniform2f(built.uniforms.uRes, edge, edge);
    programSized = true;
    return true;
  };

  const tick = (now: number) => {
    frame = 0;
    if (!settings || !built) return;
    const look = ORB_LOOKS[settings.state];
    const elapsed = last === null ? 0 : (now - last) / MILLISECONDS;
    last = now;
    advance(motion, look, isLiveOrb(settings.state) ? heardLevel(look, settings.levels) : 0, elapsed);
    draw(now / MILLISECONDS);
    frame = requestAnimationFrame(tick);
  };

  const stop = () => {
    if (frame !== 0) cancelAnimationFrame(frame);
    frame = 0;
    last = null;
  };

  const run = () => {
    if (frame !== 0 || !visible || lost || !built || !settings || settings.still) return;
    frame = requestAnimationFrame(tick);
  };

  const sync = () => {
    if (!settings) return;
    const changed = resize();
    if (settings.still) {
      stop();
      const look = ORB_LOOKS[settings.state];
      motion = { ...motion, level: 0, swirl: look.swirl, dim: look.dim };
      if (!lost) drawNow();
      return;
    }
    if (changed && !lost) drawNow();
    run();
  };

  const onVisibility = () => {
    visible = host.ownerDocument.visibilityState !== "hidden";
    if (visible) run();
    else stop();
  };

  const onLost = (event: Event) => {
    event.preventDefault();
    lost = true;
    stop();
    built = null;
  };

  const onRestored = () => {
    const rebuilt = build(gl, colors);
    if (!rebuilt) {
      onFail();
      return;
    }
    built = rebuilt;
    lost = false;
    programSized = false;
    sync();
  };

  host.ownerDocument.addEventListener("visibilitychange", onVisibility);
  canvas.addEventListener("webglcontextlost", onLost);
  canvas.addEventListener("webglcontextrestored", onRestored);

  return {
    configure(next) {
      settings = next;
      sync();
    },
    dispose() {
      stop();
      host.ownerDocument.removeEventListener("visibilitychange", onVisibility);
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
      if (built) release(gl, built);
      built = null;
      gl.getExtension(LOSE_CONTEXT)?.loseContext();
      canvas.remove();
    },
  };
}
