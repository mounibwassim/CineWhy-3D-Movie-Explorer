import React, { useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Float, MeshDistortMaterial, Sphere, PerspectiveCamera } from '@react-three/drei'
import * as THREE from 'three'

export function FloatingIcon() {
    const meshRef = useRef()
    const [hovered, setHovered] = useState(false)
    const { mouse, viewport } = useThree()

    useFrame((state) => {
        if (!meshRef.current) return

        // Matrix-style floating rhythm
        const time = state.clock.getElapsedTime()
        meshRef.current.position.y = Math.sin(time) * 0.2

        // Mouse follow logic (Raycasting-like movement)
        if (hovered) {
            const x = (mouse.x * viewport.width) / 2.5
            const y = (mouse.y * viewport.height) / 2.5
            meshRef.current.position.x = THREE.MathUtils.lerp(meshRef.current.position.x, x, 0.1)
            meshRef.current.position.y = THREE.MathUtils.lerp(meshRef.current.position.y, y, 0.1)
            meshRef.current.rotation.x = THREE.MathUtils.lerp(meshRef.current.rotation.x, y * 0.5, 0.1)
            meshRef.current.rotation.y = THREE.MathUtils.lerp(meshRef.current.rotation.y, x * 0.5, 0.1)
        } else {
            // Spring back to original position
            meshRef.current.position.x = THREE.MathUtils.lerp(meshRef.current.position.x, 0, 0.05)
            meshRef.current.rotation.x = THREE.MathUtils.lerp(meshRef.current.rotation.x, 0, 0.05)
            meshRef.current.rotation.y = THREE.MathUtils.lerp(meshRef.current.rotation.y, time * 0.5, 0.05)
        }
    })

    return (
        <group>
            <PerspectiveCamera makeDefault position={[0, 0, 5]} />
            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} color="#00ffcc" intensity={2} />

            <Float speed={2} rotationIntensity={1} floatIntensity={1}>
                <mesh
                    ref={meshRef}
                    onPointerOver={() => setHovered(true)}
                    onPointerOut={() => setHovered(false)}
                    scale={1.5}
                >
                    {/* Creating a 3D "Reel" using an octahedron for a crystalline cinematic look */}
                    <octahedronGeometry args={[1, 0]} />
                    <MeshDistortMaterial
                        color={hovered ? "#00ffcc" : "#00aa88"}
                        speed={3}
                        distort={0.4}
                        radius={1}
                        emissive="#00ffcc"
                        emissiveIntensity={hovered ? 2 : 0.5}
                        metalness={0.9}
                        roughness={0.1}
                    />
                </mesh>
            </Float>

            {/* Glow Rings for "Matrix" effect */}
            <mesh rotation={[Math.PI / 2, 0, 0]} scale={[1.8, 1.8, 1.8]}>
                <ringGeometry args={[0.95, 1, 64]} />
                <meshBasicMaterial color="#00ffcc" transparent opacity={0.2} side={THREE.DoubleSide} />
            </mesh>
        </group>
    )
}
