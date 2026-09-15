"use client"

import { useEffect, useRef } from "react"
import type { ComponentProps, ComponentType, ReactNode } from "react"
import { cn } from "@/lib/utils"

/*
 * Glass login surface over an animated WebGL "smoke" background.
 * Adapted from a 21st.dev community component: colours come from theme
 * tokens, the smoke drifts on its own (it does not follow the pointer), and
 * the form shell is presentational — callers own state and submission.
 */

const vertexSmokeySource = `
  attribute vec4 a_position;
  void main() {
    gl_Position = a_position;
  }
`

const fragmentSmokeySource = `
precision mediump float;

uniform vec2 iResolution;
uniform float iTime;
uniform vec3 u_color;
uniform vec3 u_background;
uniform float u_intensity;

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 centeredUV = (2.0 * fragCoord - iResolution.xy) / min(iResolution.x, iResolution.y);
  float time = iTime * 0.5;

  vec2 distortion = centeredUV;
  for (float i = 1.0; i < 8.0; i++) {
    distortion.x += 0.5 / i * cos(i * 2.0 * distortion.y + time);
    distortion.y += 0.5 / i * cos(i * 2.0 * distortion.x + time);
  }

  float wave = abs(sin(distortion.x + distortion.y + time));
  float glow = smoothstep(0.9, 0.2, wave);

  // Mix toward the page background rather than black, so light theme stays light.
  fragColor = vec4(mix(u_background, u_color, glow * u_intensity), 1.0);
}

void main() {
  mainImage(gl_FragColor, gl_FragCoord.xy);
}
`

type BlurSize = "none" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl"

const blurClassMap: Record<BlurSize, string> = {
  none: "backdrop-blur-none",
  sm: "backdrop-blur-sm",
  md: "backdrop-blur-md",
  lg: "backdrop-blur-lg",
  xl: "backdrop-blur-xl",
  "2xl": "backdrop-blur-2xl",
  "3xl": "backdrop-blur-3xl",
}

/** Resolves any CSS colour — including the app's oklch tokens — to 0..1 RGB. */
function cssColorToRgb(color: string): [number, number, number] {
  const ctx = document.createElement("canvas").getContext("2d")
  if (!ctx) return [0, 0, 0]
  ctx.fillStyle = color
  ctx.fillRect(0, 0, 1, 1)
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data
  return [r / 255, g / 255, b / 255]
}

function readToken(name: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

interface SmokeyBackgroundProps {
  backdropBlurAmount?: BlurSize
  /** Any CSS colour. Defaults to the theme's `--primary`. */
  color?: string
  /** Smoke strength, 0..1. Defaults to a per-theme value tuned for text contrast. */
  intensity?: number
  className?: string
}

/** Ambient WebGL smoke. Decorative: hidden from assistive tech, ignores the pointer entirely. */
export function SmokeyBackground({ backdropBlurAmount = "sm", color, intensity, className }: SmokeyBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    // No WebGL: the container's bg-background shows instead.
    const gl = canvas.getContext("webgl")
    if (!gl) return

    const compileShader = (type: number, source: string) => {
      const shader = gl.createShader(type)
      if (!shader) return null
      gl.shaderSource(shader, source)
      gl.compileShader(shader)
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error("SmokeyBackground shader error:", gl.getShaderInfoLog(shader))
        gl.deleteShader(shader)
        return null
      }
      return shader
    }

    const vertexShader = compileShader(gl.VERTEX_SHADER, vertexSmokeySource)
    const fragmentShader = compileShader(gl.FRAGMENT_SHADER, fragmentSmokeySource)
    const program = gl.createProgram()
    if (!vertexShader || !fragmentShader || !program) return
    gl.attachShader(program, vertexShader)
    gl.attachShader(program, fragmentShader)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error("SmokeyBackground link error:", gl.getProgramInfoLog(program))
      return
    }
    gl.useProgram(program)

    const positionBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW)
    const positionLocation = gl.getAttribLocation(program, "a_position")
    gl.enableVertexAttribArray(positionLocation)
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0)

    const iResolution = gl.getUniformLocation(program, "iResolution")
    const iTime = gl.getUniformLocation(program, "iTime")

    const uColor = gl.getUniformLocation(program, "u_color")
    const uBackground = gl.getUniformLocation(program, "u_background")
    const uIntensity = gl.getUniformLocation(program, "u_intensity")
    // Colours are read from the DOM, not React theme state. next-themes swaps the
    // <html> class in its own effect, which runs after this (child) effect, so
    // reacting to the theme hook read the previous theme's tokens. Watching the
    // class (below) always runs after the swap, including OS-level theme changes.
    const applyTheme = () => {
      gl.uniform3f(uColor, ...cssColorToRgb(color ?? readToken("--primary")))
      gl.uniform3f(uBackground, ...cssColorToRgb(readToken("--background")))
      gl.uniform1f(uIntensity, intensity ?? (document.documentElement.classList.contains("dark") ? 0.55 : 0.3))
    }
    applyTheme()

    const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const start = performance.now()
    let frame = 0

    const draw = () => {
      const width = Math.round(canvas.clientWidth * dpr)
      const height = Math.round(canvas.clientHeight * dpr)
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width
        canvas.height = height
        gl.viewport(0, 0, width, height)
      }
      gl.uniform2f(iResolution, width, height)
      gl.uniform1f(iTime, reduceMotion ? 0 : (performance.now() - start) / 1000)
      gl.drawArrays(gl.TRIANGLES, 0, 6)
    }

    const themeObserver = new MutationObserver(() => {
      applyTheme()
      if (reduceMotion) draw()
    })
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "style"] })

    // Reduced motion: one still frame, redrawn only when the size or theme changes.
    const resizeObserver = new ResizeObserver(() => reduceMotion && draw())
    if (reduceMotion) {
      resizeObserver.observe(canvas)
      draw()
    } else {
      const loop = () => {
        draw()
        frame = requestAnimationFrame(loop)
      }
      loop()
    }

    return () => {
      cancelAnimationFrame(frame)
      themeObserver.disconnect()
      resizeObserver.disconnect()
      gl.deleteBuffer(positionBuffer)
      gl.deleteProgram(program)
      gl.deleteShader(vertexShader)
      gl.deleteShader(fragmentShader)
    }
  }, [color, intensity])

  return (
    <div aria-hidden="true" className={cn("pointer-events-none absolute inset-0 h-full w-full overflow-hidden bg-background", className)}>
      <canvas ref={canvasRef} className="h-full w-full" />
      <div className={cn("absolute inset-0", blurClassMap[backdropBlurAmount])} />
    </div>
  )
}

interface FloatingFieldProps extends Omit<ComponentProps<"input">, "id" | "placeholder"> {
  id: string
  label: string
  icon?: ComponentType<{ className?: string }>
  /** Muted text after the label, e.g. "(optional)". */
  labelSuffix?: string
  /** Guidance under the field; replaced by `error` when present. */
  help?: string
  error?: string
  /** Control pinned to the right edge of the input, e.g. a show-password toggle. */
  trailing?: ReactNode
}

/** Underlined input whose label floats up on focus, when filled, or when autofilled. */
export function FloatingField({ id, label, icon: Icon, labelSuffix, help, error, trailing, className, ...props }: FloatingFieldProps) {
  const messageId = error || help ? `${id}-message` : undefined
  return (
    <div>
      <div className="relative z-0">
        <input
          id={id}
          // A single space keeps :placeholder-shown true while empty, which drives the floating label.
          placeholder=" "
          aria-invalid={error ? true : undefined}
          aria-describedby={messageId}
          className={cn(
            "peer block w-full appearance-none border-0 border-b-2 border-muted-foreground/50 bg-transparent px-0 py-2.5 text-sm text-foreground transition-colors focus:border-primary focus:outline-none focus:ring-0 aria-invalid:border-destructive",
            trailing && "pr-9",
            className,
          )}
          {...props}
        />
        <label
          htmlFor={id}
          className="absolute top-3 -z-10 origin-[0] -translate-y-6 scale-75 text-sm text-muted-foreground transition-all duration-300 peer-placeholder-shown:translate-y-0 peer-placeholder-shown:scale-100 peer-focus:-translate-y-6 peer-focus:scale-75 peer-focus:text-primary peer-autofill:-translate-y-6 peer-autofill:scale-75"
        >
          {Icon && <Icon className="-mt-1 mr-2 inline-block size-4" />}
          {label}
          {labelSuffix && <span className="ml-1 opacity-80">{labelSuffix}</span>}
        </label>
        {trailing && <div className="absolute right-0 top-1/2 -translate-y-1/2">{trailing}</div>}
      </div>
      {messageId && (
        <p id={messageId} className={cn("mt-1.5 text-xs", error ? "text-destructive" : "text-muted-foreground")}>
          {error ?? help}
        </p>
      )}
    </div>
  )
}

interface LoginFormProps extends Omit<ComponentProps<"form">, "title"> {
  title: ReactNode
  description?: ReactNode
  footer?: ReactNode
}

/** Glass card holding an auth form. Fields and the submit button are passed as children. */
export function LoginForm({ title, description, footer, className, children, ...props }: LoginFormProps) {
  return (
    <div className="glass w-full max-w-sm space-y-6 rounded-2xl p-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        {description && <p className="mt-2 text-sm text-muted-foreground">{description}</p>}
      </div>
      <form className={cn("space-y-8", className)} {...props}>
        {children}
      </form>
      {footer && <p className="text-center text-sm text-muted-foreground">{footer}</p>}
    </div>
  )
}
