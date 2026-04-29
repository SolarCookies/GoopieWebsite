import { useRef, useEffect, useState, useCallback } from 'react';

export interface AttributeBuffer {
  /** Matches the `layout (location=N) in ...` name in the vertex shader */
  name: string;
  data: Float32Array;
  /** Number of components per vertex (e.g. 3 for vec3) */
  size: number;
}

export interface WebGLViewportProps {
  vertexShader: string;
  fragmentShader: string;
  /** Attribute buffers bound in order (location 0, 1, 2, …) */
  attributes: AttributeBuffer[];
  vertexCount: number;
  className?: string;
  style?: React.CSSProperties;
}

function compileShader(
  gl: WebGL2RenderingContext,
  source: string,
  type: number
): WebGLShader {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`Shader compile error:\n${info}`);
  }
  return shader;
}

function buildProgram(
  gl: WebGL2RenderingContext,
  vertSrc: string,
  fragSrc: string
): WebGLProgram {
  const vert = compileShader(gl, vertSrc, gl.VERTEX_SHADER);
  const frag = compileShader(gl, fragSrc, gl.FRAGMENT_SHADER);
  const program = gl.createProgram()!;
  gl.attachShader(program, vert);
  gl.attachShader(program, frag);
  gl.linkProgram(program);
  gl.detachShader(program, vert);
  gl.detachShader(program, frag);
  gl.deleteShader(vert);
  gl.deleteShader(frag);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error(`Program link error:\n${info}`);
  }
  return program;
}

/**
 * Render a single draw call to an offscreen canvas and return a data URL.
 * Creates and immediately disposes its own GL context so it never accumulates.
 * Returns null if WebGL2 is unavailable or an error occurs.
 */
export function renderToDataURL(
  vertexShader: string,
  fragmentShader: string,
  attributes: AttributeBuffer[],
  vertexCount: number,
  width = 320,
  height = 200,
): string | null {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const gl = canvas.getContext('webgl2', {
      alpha: false,
      antialias: true,
      depth: false,
      stencil: false,
    });
    if (!gl) return null;

    const program = buildProgram(gl, vertexShader, fragmentShader);
    const vao = gl.createVertexArray();
    if (!vao) return null;
    gl.bindVertexArray(vao);

    const buffers: WebGLBuffer[] = [];
    attributes.forEach(({ data, size }, location) => {
      const buf = gl.createBuffer();
      if (!buf) return;
      buffers.push(buf);
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      gl.vertexAttribPointer(location, size, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(location);
    });

    gl.bindVertexArray(null);
    gl.clearColor(0.08, 0.08, 0.08, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program);
    gl.bindVertexArray(vao);
    gl.drawArrays(gl.TRIANGLES, 0, vertexCount);

    const url = canvas.toDataURL();

    gl.bindVertexArray(null);
    buffers.forEach(b => gl.deleteBuffer(b));
    gl.deleteVertexArray(vao);
    gl.deleteProgram(program);

    return url;
  } catch (err) {
    console.error('[renderToDataURL]', err);
    return null;
  }
}

/**
 * A self-contained WebGL2 canvas that renders a single draw call.
 * Pass in vertex/fragment shader GLSL source and an array of attribute buffers.
 * The page that uses this component owns the shader code and geometry data;
 * this component only owns the GL context.
 */
export function WebGLViewport({
  vertexShader,
  fragmentShader,
  attributes,
  vertexCount,
  className,
  style,
}: WebGLViewportProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [glError, setGlError] = useState<string | null>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let gl: WebGL2RenderingContext | null = null;
    try {
      gl = canvas.getContext('webgl2', {
        alpha: false,
        antialias: true,
        depth: false,
        stencil: false,
        powerPreference: 'default',
      });
    } catch (e) {
      setGlError('Failed to acquire WebGL2 context.');
      return;
    }

    if (!gl) {
      setGlError('WebGL2 is not available in this environment. Check that GPU acceleration is enabled.');
      return;
    }

    try {
      const program = buildProgram(gl, vertexShader, fragmentShader);

      const vao = gl.createVertexArray();
      if (!vao) { setGlError('createVertexArray() returned null.'); return; }
      gl.bindVertexArray(vao);

      const buffers: WebGLBuffer[] = [];
      attributes.forEach(({ data, size }, location) => {
        const buf = gl.createBuffer();
        if (!buf) return;
        buffers.push(buf);
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
        gl.vertexAttribPointer(location, size, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(location);
      });

      gl.bindVertexArray(null);

      gl.clearColor(0.08, 0.08, 0.08, 1.0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(program);
      gl.bindVertexArray(vao);
      gl.drawArrays(gl.TRIANGLES, 0, vertexCount);

      // Cleanup
      gl.bindVertexArray(null);
      buffers.forEach(b => gl!.deleteBuffer(b));
      gl.deleteVertexArray(vao);
      gl.deleteProgram(program);

      setGlError(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setGlError(msg);
      console.error('[WebGLViewport]', err);
    }
  }, [vertexShader, fragmentShader, attributes, vertexCount]);

  useEffect(() => {
    draw();
  }, [draw]);

  if (glError) {
    return (
      <div
        className={className}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#111',
          color: '#ff6b6b',
          padding: '2rem',
          fontFamily: 'monospace',
          fontSize: '0.85rem',
          textAlign: 'center',
          gap: '0.5rem',
          ...style,
        }}
      >
        <span style={{ fontSize: '1.5rem' }}>⚠</span>
        <strong>WebGL Error</strong>
        <span style={{ color: '#ccc', maxWidth: 480 }}>{glError}</span>
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={600}
      className={className}
      style={{
        width: '100%',
        height: '100%',
        display: 'block',
        ...style,
      }}
    />
  );
}
