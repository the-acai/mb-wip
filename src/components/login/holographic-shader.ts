import { vertexShaderSource } from "./shaders/fullscreen-quad.vert";
import { fragmentShaderSource } from "./shaders/card-surface.frag";

export interface UniformState {
  tiltX: number;
  tiltY: number;
  cursorX: number;
  cursorY: number;
}

interface ShaderController {
  destroy(): void;
}

function compileShader(
  gl: WebGLRenderingContext,
  type: number,
  source: string
): WebGLShader {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`Shader compile error: ${info}`);
  }
  return shader;
}

export function createHolographicShader(
  canvas: HTMLCanvasElement,
  maskCanvas: HTMLCanvasElement,
  embossCanvas: HTMLCanvasElement,
  uniformState: UniformState
): ShaderController {
  const gl = canvas.getContext("webgl", {
    alpha: false,
    premultipliedAlpha: false,
    antialias: false,
  });

  if (!gl) {
    console.warn("WebGL not available, shader disabled");
    return { destroy() {} };
  }

  // Compile shaders and link program
  const vertShader = compileShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
  const fragShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
  const program = gl.createProgram()!;
  gl.attachShader(program, vertShader);
  gl.attachShader(program, fragShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program);
    throw new Error(`Program link error: ${info}`);
  }

  gl.useProgram(program);

  // Fullscreen triangle (covers clip space with a single triangle)
  const positions = new Float32Array([-1, -1, 3, -1, -1, 3]);
  const buffer = gl.createBuffer()!;
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

  const aPosition = gl.getAttribLocation(program, "a_position");
  gl.enableVertexAttribArray(aPosition);
  gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

  // Uniform locations
  const uResolution = gl.getUniformLocation(program, "u_resolution");
  const uTime = gl.getUniformLocation(program, "u_time");
  const uTilt = gl.getUniformLocation(program, "u_tilt");
  const uCursor = gl.getUniformLocation(program, "u_cursor");
  const uTextMask = gl.getUniformLocation(program, "u_textMask");
  const uEmbossMask = gl.getUniformLocation(program, "u_embossMask");

  // Upload sharp text mask texture (unit 0)
  const texture = gl.createTexture()!;
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, gl.LUMINANCE, gl.UNSIGNED_BYTE, maskCanvas);
  gl.uniform1i(uTextMask, 0);

  // Upload pre-blurred emboss mask texture (unit 1)
  const embossTexture = gl.createTexture()!;
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, embossTexture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, gl.LUMINANCE, gl.UNSIGNED_BYTE, embossCanvas);
  gl.uniform1i(uEmbossMask, 1);

  // Resize handling
  const dpr = Math.min(window.devicePixelRatio, 2);

  function resize() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    const pw = Math.round(w * dpr);
    const ph = Math.round(h * dpr);
    if (canvas.width !== pw || canvas.height !== ph) {
      canvas.width = pw;
      canvas.height = ph;
      gl!.viewport(0, 0, pw, ph);
    }
  }

  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();

  // Render loop
  const startTime = performance.now();
  let rafId = 0;
  let destroyed = false;

  function render() {
    if (destroyed) return;
    rafId = requestAnimationFrame(render);

    const elapsed = (performance.now() - startTime) / 1000;

    gl!.uniform2f(uResolution, canvas.width, canvas.height);
    gl!.uniform1f(uTime, elapsed);
    gl!.uniform2f(uTilt, uniformState.tiltX, uniformState.tiltY);
    gl!.uniform2f(uCursor, uniformState.cursorX, uniformState.cursorY);

    gl!.drawArrays(gl!.TRIANGLES, 0, 3);
  }

  rafId = requestAnimationFrame(render);

  // Context loss handling
  function handleContextLost(e: Event) {
    e.preventDefault();
    destroyed = true;
    cancelAnimationFrame(rafId);
  }

  function handleContextRestored() {
    // Full re-init would be needed here; for now just log
    console.warn("WebGL context restored — reload recommended");
  }

  canvas.addEventListener("webglcontextlost", handleContextLost);
  canvas.addEventListener("webglcontextrestored", handleContextRestored);

  return {
    destroy() {
      destroyed = true;
      cancelAnimationFrame(rafId);
      observer.disconnect();
      canvas.removeEventListener("webglcontextlost", handleContextLost);
      canvas.removeEventListener("webglcontextrestored", handleContextRestored);
      gl!.deleteTexture(texture);
      gl!.deleteTexture(embossTexture);
      gl!.deleteBuffer(buffer);
      gl!.deleteProgram(program);
      gl!.deleteShader(vertShader);
      gl!.deleteShader(fragShader);
      gl!.getExtension("WEBGL_lose_context")?.loseContext();
    },
  };
}
