'use client';

import { useEffect, useRef, useCallback } from 'react';
import { detectPerformanceTier } from '@/lib/performance';
import styles from './ShaderBackground.module.css';

interface Props {
    variant?: 'bank' | 'monolith' | 'risk';
    intensity?: number; // 0-1, reactive to data (e.g. volatility)
}

/**
 * ShaderBackground — animated gradient background system.
 * Uses WebGL fragment shader with Simplex noise for organic movement.
 * Falls back to CSS gradient on devices without WebGL.
 */
export function ShaderBackground({ variant = 'bank', intensity = 0.5 }: Props) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const rafRef = useRef<number | null>(null);
    const glRef = useRef<WebGLRenderingContext | null>(null);

    const tier = detectPerformanceTier();
    const useWebGL = tier !== 'potato' && tier !== 'low';

    const colors = {
        bank: { r: 0.0, g: 0.05, b: 0.15 },
        monolith: { r: 0.0, g: 0.08, b: 0.02 },
        risk: { r: 0.12, g: 0.04, b: 0.0 },
    };

    const initGL = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas || !useWebGL) return;

        const gl = canvas.getContext('webgl');
        if (!gl) return;
        glRef.current = gl;

        const vertSrc = `attribute vec2 a_pos; void main(){ gl_Position=vec4(a_pos,0,1); }`;
        const fragSrc = `
      precision mediump float;
      uniform float u_time;
      uniform vec2 u_res;
      uniform vec3 u_color;
      uniform float u_intensity;

      float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
      float noise(vec2 p){
        vec2 i=floor(p), f=fract(p);
        f=f*f*(3.0-2.0*f);
        return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
      }

      void main(){
        vec2 uv=gl_FragCoord.xy/u_res;
        float n=noise(uv*3.0+u_time*0.1)*0.5+noise(uv*6.0-u_time*0.05)*0.3;
        n*=u_intensity;
        vec3 col=u_color+vec3(n*0.02, n*0.04, n*0.06);
        col+=vec3(0.0, 0.02, 0.04)*sin(u_time*0.3)*u_intensity;
        gl_FragColor=vec4(col,1.0);
      }
    `;

        const compile = (type: number, src: string) => {
            const s = gl.createShader(type)!;
            gl.shaderSource(s, src); gl.compileShader(s);
            return s;
        };

        const prog = gl.createProgram()!;
        gl.attachShader(prog, compile(gl.VERTEX_SHADER, vertSrc));
        gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, fragSrc));
        gl.linkProgram(prog); gl.useProgram(prog);

        const buf = gl.createBuffer()!;
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

        const aPos = gl.getAttribLocation(prog, 'a_pos');
        gl.enableVertexAttribArray(aPos);
        gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

        const uTime = gl.getUniformLocation(prog, 'u_time');
        const uRes = gl.getUniformLocation(prog, 'u_res');
        const uColor = gl.getUniformLocation(prog, 'u_color');
        const uInt = gl.getUniformLocation(prog, 'u_intensity');

        const c = colors[variant];

        const render = (t: number) => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            gl.viewport(0, 0, canvas.width, canvas.height);
            gl.uniform1f(uTime, t * 0.001);
            gl.uniform2f(uRes, canvas.width, canvas.height);
            gl.uniform3f(uColor, c.r, c.g, c.b);
            gl.uniform1f(uInt, intensity);
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
            rafRef.current = requestAnimationFrame(render);
        };

        rafRef.current = requestAnimationFrame(render);
    }, [variant, intensity, useWebGL]);

    useEffect(() => {
        initGL();
        return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
    }, [initGL]);

    // CSS fallback gradient classes
    const fallbackClass = variant === 'monolith' ? styles.fallbackMonolith : variant === 'risk' ? styles.fallbackRisk : styles.fallbackBank;

    return useWebGL
        ? <canvas ref={canvasRef} className={styles.canvas} />
        : <div className={`${styles.fallback} ${fallbackClass}`} />;
}
