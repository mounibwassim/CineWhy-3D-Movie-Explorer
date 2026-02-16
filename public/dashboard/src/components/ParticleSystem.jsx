import React, { useRef, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

export function ParticleSystem({ count = 200 }) {
    const mesh = useRef()
    const light = useRef()
    const { mouse, viewport } = useThree()

    const dummy = useMemo(() => new THREE.Object3D(), [])

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

        // Interactive Mouse Follow
        // Map mouse x/y (-1 to 1) to a target offset
        const targetX = (mouse.x * viewport.width) / 10
        const targetY = (mouse.y * viewport.height) / 10

        particles.forEach((particle, i) => {
            let { t, factor, speed, xFactor, yFactor, zFactor } = particle

            // Update time
            t = particle.t += speed / 2

            // Calculate basic floating movement ("Matrix" drift)
            const a = Math.cos(t) + Math.sin(t * 1) / 10
            const b = Math.sin(t) + Math.cos(t * 2) / 10

            // Apply mouse interaction (lerping for smooth follow)
            particle.mx += (targetX - particle.mx) * 0.02
            particle.my += (targetY - particle.my) * 0.02

            dummy.position.set(
                (particle.mx / 10) * a + xFactor + Math.cos((t / 10) * factor) + (Math.sin(t * 1) * factor) / 10,
                (particle.my / 10) * b + yFactor + Math.sin((t / 10) * factor) + (Math.cos(t * 2) * factor) / 10,
                (particle.my / 10) * b + zFactor + Math.cos((t / 10) * factor) + (Math.sin(t * 3) * factor) / 10
            )

            // "Matrix" Digital Rain Rotation effect
            dummy.rotation.set(t, t, t)

            // Scale based on mouse proximity? Or just pulsing
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
                {/* Crystalline / tetradecahedron shape for a "tech" feel */}
                <dodecahedronGeometry args={[0.2, 0]} />
                <meshPhongMaterial
                    color="#00ffcc"
                    emissive="#00ffcc"
                    emissiveIntensity={0.5}
                    transparent
                    opacity={0.8}
                />
            </instancedMesh>
        </>
    )
}
