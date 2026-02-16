import React, { useRef, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { Float } from '@react-three/drei'
import glsl from 'vite-plugin-glsl'

const particleVertexShader = `
uniform float uTime;
varying vec3 vPosition;
varying float vGlitch;

void main() {
  vPosition = position;
  
  // Glitch effect on position
  float glitch = sin(uTime * 10.0 + position.y * 5.0) * 0.02;
  vGlitch = glitch;
  
  vec3 pos = position;
  pos.x += glitch;
  
  // Instance handling + standard view projection
  #include <begin_vertex>
  #include <project_vertex>
}
`

const particleFragmentShader = `
uniform float uTime;
varying vec3 vPosition;
varying float vGlitch;

void main() {
  // Matrix Green/Cyan Logic
  vec3 color = vec3(0.0, 1.0, 0.8); // Cyan
  
  // Pulse logic
  float pulse = (sin(uTime * 2.0) + 1.0) * 0.5;
  
  // Glitch flash
  if (abs(vGlitch) > 0.015) {
      color = vec3(1.0, 1.0, 1.0); // White flash
  }
  
  gl_FragColor = vec4(color, 0.8 * pulse + 0.2);
}
`

export function ParticleSystem({ count = 2000 }) { // Increased count for "Universe" feel
    const mesh = useRef()
    const { mouse, viewport } = useThree()
    const dummy = useMemo(() => new THREE.Object3D(), [])

    // Shader Uniforms
    const uniforms = useMemo(() => ({
        uTime: { value: 0 }
    }), [])

    // Generate random initial positions and speeds
    const particles = useMemo(() => {
        const temp = []
        for (let i = 0; i < count; i++) {
            const t = Math.random() * 100
            const factor = 20 + Math.random() * 100
            const speed = 0.01 + Math.random() / 200
            const xFactor = -50 + Math.random() * 100
            const yFactor = -50 + Math.random() * 100
            const zFactor = -50 + Math.random() * 100
            temp.push({ t, factor, speed, xFactor, yFactor, zFactor, mx: 0, my: 0 })
        }
        return temp
    }, [count])

    useFrame((state) => {
        if (!mesh.current) return

        // Update Shader Time
        uniforms.uTime.value = state.clock.elapsedTime

        // Map mouse x/y (-1 to 1) to a broad target area
        const targetX = (mouse.x * viewport.width) / 2
        const targetY = (mouse.y * viewport.height) / 2

        particles.forEach((particle, i) => {
            let { t, factor, speed, xFactor, yFactor, zFactor } = particle

            // Update time
            t = particle.t += speed / 2

            // Calculate basic floating movement
            const a = Math.cos(t) + Math.sin(t * 1) / 10
            const b = Math.sin(t) + Math.cos(t * 2) / 10

            // SWARM PHYSICS: Smoothly interpolate particle's mouse-offset towards the target
            particle.mx += (targetX - particle.mx) * 0.02
            particle.my += (targetY - particle.my) * 0.02

            // Final position combines:
            // 1. Random noise (xFactor)
            // 2. Trigonometric drift (a, b)
            // 3. Mouse influence (particle.mx/my)
            dummy.position.set(
                (particle.mx / 10) * a + xFactor + Math.cos((t / 10) * factor) + (Math.sin(t * 1) * factor) / 10,
                (particle.my / 10) * b + yFactor + Math.sin((t / 10) * factor) + (Math.cos(t * 2) * factor) / 10,
                (particle.my / 10) * b + zFactor + Math.cos((t / 10) * factor) + (Math.sin(t * 3) * factor) / 10
            )

            // Rotation
            dummy.rotation.set(t, t, t)

            // Dynamic Scale (pulse)
            const s = Math.cos(t) * 0.5 + 1
            dummy.scale.set(s, s, s)

            dummy.updateMatrix()
            mesh.current.setMatrixAt(i, dummy.matrix)
        })
        mesh.current.instanceMatrix.needsUpdate = true
    })

    return (
        <>
            <instancedMesh ref={mesh} args={[null, null, count]}>
                <dodecahedronGeometry args={[0.2, 0]} />
                {/* Custom GLSL Shader Material */}
                <shaderMaterial
                    uniforms={uniforms}
                    vertexShader={particleVertexShader}
                    fragmentShader={particleFragmentShader}
                    transparent={true}
                />
            </instancedMesh>

            {/* Floating 3D Symbols (Parallax Layer) */}
            <Float speed={1.5} rotationIntensity={1.5} floatIntensity={2}>
                {/* Abstract "Planet" Sphere */}
                <mesh position={[-15, 5, -20]}>
                    <sphereGeometry args={[2, 32, 32]} />
                    <meshStandardMaterial color="#2d2d2d" wireframe />
                </mesh>
                {/* Floating Ring/Reel Abstract */}
                <mesh position={[15, -5, -25]} rotation={[Math.PI / 4, 0, 0]}>
                    <torusGeometry args={[3, 0.2, 16, 100]} />
                    <meshStandardMaterial color="#00ffcc" transparent opacity={0.3} />
                </mesh>
            </Float>
        </>
    )
}
