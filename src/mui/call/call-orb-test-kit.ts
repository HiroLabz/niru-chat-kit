import { vi } from "vitest";

/** Only the WebGL calls the orb makes, recorded; shared by the call tests. */

export interface FakeGlOptions {
  compiles?: boolean;
  links?: boolean;
}

export function fakeGl({ compiles = true, links = true }: FakeGlOptions = {}) {
  const uniforms = new Map<string, number[]>();
  const loseContext = vi.fn();
  const gl = {
    VERTEX_SHADER: 1,
    FRAGMENT_SHADER: 2,
    COMPILE_STATUS: 3,
    LINK_STATUS: 4,
    ARRAY_BUFFER: 5,
    STATIC_DRAW: 6,
    FLOAT: 7,
    TRIANGLES: 8,
    COLOR_BUFFER_BIT: 9,
    createShader: vi.fn(() => ({})),
    shaderSource: vi.fn(),
    compileShader: vi.fn(),
    getShaderParameter: vi.fn(() => compiles),
    deleteShader: vi.fn(),
    createProgram: vi.fn(() => ({})),
    attachShader: vi.fn(),
    linkProgram: vi.fn(),
    getProgramParameter: vi.fn(() => links),
    deleteProgram: vi.fn(),
    useProgram: vi.fn(),
    createBuffer: vi.fn(() => ({})),
    bindBuffer: vi.fn(),
    bufferData: vi.fn(),
    deleteBuffer: vi.fn(),
    getAttribLocation: vi.fn(() => 0),
    enableVertexAttribArray: vi.fn(),
    vertexAttribPointer: vi.fn(),
    getUniformLocation: vi.fn((_program: unknown, name: string) => ({ name })),
    uniform1f: vi.fn((location: { name: string }, value: number) => uniforms.set(location.name, [value])),
    uniform2f: vi.fn((location: { name: string }, x: number, y: number) => uniforms.set(location.name, [x, y])),
    uniform3f: vi.fn((location: { name: string }, x: number, y: number, z: number) => uniforms.set(location.name, [x, y, z])),
    viewport: vi.fn(),
    clearColor: vi.fn(),
    clear: vi.fn(),
    drawArrays: vi.fn(),
    getExtension: vi.fn((name: string) => (name === "WEBGL_lose_context" ? { loseContext } : null)),
  };
  return { gl, uniforms, loseContext, draws: () => gl.drawArrays.mock.calls.length };
}

export type FakeGl = ReturnType<typeof fakeGl>;

/** Makes every canvas hand out this context for "webgl" (or none, for null); returns the spy. */
export function stubWebGl(fake: FakeGl | null) {
  return vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(((kind: string) =>
    kind === "webgl" && fake ? fake.gl : null) as never);
}

/** Animation frames and media queries moved by hand. */
export const frames = { pending: new Map<number, FrameRequestCallback>(), next: 1, requested: 0 };
export const media = { reduced: false };

export function resetWorld(options: { reduced?: boolean } = {}) {
  frames.pending.clear();
  frames.next = 1;
  frames.requested = 0;
  media.reduced = options.reduced ?? false;
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    const id = frames.next++;
    frames.requested += 1;
    frames.pending.set(id, callback);
    return id;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => frames.pending.delete(id));
  window.matchMedia = ((query: string) => ({
    matches: query.includes("prefers-reduced-motion") ? media.reduced : false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

/** Runs the pending frames `rounds` times. */
export function runFrames(rounds = 1) {
  for (let round = 0; round < rounds && frames.pending.size > 0; round += 1) {
    const due = [...frames.pending.values()];
    frames.pending.clear();
    due.forEach((callback) => callback(round * 16));
  }
}
