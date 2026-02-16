import React, { useRef, useMemo, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { Float, Stars } from '@react-three/drei'

export function ParticleSystem({ count = 3000 }) {
    const points = useRef()
    const { mouse, viewport } = useThree()

    // Generate particles
    const particlesPosition = useMemo(() => {
        const positions = new Float32Array(count * 3)
        for (let i = 0; i < count; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 100
            positions[i * 3 + 1] = (Math.random() - 0.5) * 100
            positions[i * 3 + 2] = (Math.random() - 0.5) * 100
        }
        return positions
    }, [count])

    useFrame((state) => {
        if (!points.current) return

        const time = state.clock.getElapsedTime()

        // --- 1. MOUSE SWERVE FORMULA ---
        // Calculate target based on mouse position
        const targetX = (mouse.x * viewport.width) / 2
        const targetY = (mouse.y * viewport.height) / 2

        // Rotate the entire points system slightly towards the mouse
        // giving the "swerve" effect across the screen.
        points.current.rotation.x = THREE.MathUtils.lerp(points.current.rotation.x, -targetY * 0.02, 0.05)
        points.current.rotation.y = THREE.MathUtils.lerp(points.current.rotation.y, targetX * 0.02, 0.05)

        // Internal wave motion
        const positions = points.current.geometry.attributes.position.array
        for (let i = 0; i < count; i++) {
            // Slight wave modification
            // We generally keep positions static in buffer but move the container
            // To make them "breathing", we could use a shader, but doing CPU lerp for 3000 points is cheap enough here if needed.
            // For "Swerve", rotating the container (lines 28-29) is the most performant and "feeling" correct way.
        }
    })

    return (
        <>
            {/* 1. MATRIX STARS (POINTS) */}
            <points ref={points}>
                <bufferGeometry>
                    <bufferAttribute
                        attach="attributes-position"
                        count={particlesPosition.length / 3}
                        array={particlesPosition}
                        itemSize={3}
                    />
                </bufferGeometry>
                <pointsMaterial
                    size={0.15}
                    color="#00ffcc"
                    transparent
                    opacity={0.8}
                    sizeAttenuation={true}
                    depthWrite={false}
                    blending={THREE.AdditiveBlending}
                />
            </points>

            {/* 2. THE SUN & EARTH (High Quality) */}
            <Float speed={1.5} rotationIntensity={0.5} floatIntensity={1}>

                {/* SUN */}
                <mesh position={[25, 12, -40]}>
                    <sphereGeometry args={[8, 64, 64]} />
                    <meshBasicMaterial color="#ffaa00" toneMapped={false} />
                    <pointLight intensity={3} distance={100} color="#ffaa00" />
                    {/* Sun Glow/Halo - Simple cheap trick with a larger inverted sphere or sprite? 
                        Let's just use a pointLight for now and maybe a larger transparent sphere for glow */}
                    <mesh scale={[1.2, 1.2, 1.2]}>
                        <sphereGeometry args={[8, 32, 32]} />
                        <meshBasicMaterial color="#ff4400" transparent opacity={0.3} side={THREE.BackSide} />
                    </mesh>
                </mesh>

                {/* EARTH */}
                <group position={[-20, -10, -30]} rotation={[0, 0, 0.4]}>
                    <mesh>
                        <sphereGeometry args={[5, 64, 64]} />
                        <meshStandardMaterial
                            color="#2244ff"
                            roughness={0.8}
                            metalness={0.1}
                            emissive="#001133"
                        />
                    </mesh>
                    {/* Atmosphere Glow */}
                    <mesh scale={[1.1, 1.1, 1.1]}>
                        <sphereGeometry args={[5, 32, 32]} />
                        <meshBasicMaterial color="#4488ff" transparent opacity={0.15} side={THREE.BackSide} />
                    </mesh>
                </group>

                {/* 3. FLOATING CINEMA SYMBOLS */}

                {/* Movie Reel (Torus + Cylinders) */}
                <group position={[15, -15, -25]} rotation={[Math.PI / 3, 0, 0]}>
                    <mesh>
                        <torusGeometry args={[3, 0.2, 16, 100]} />
                        <meshStandardMaterial color="#888" metalness={0.8} roughness={0.2} />
                    </mesh>
                    <mesh rotation={[0, 0, Math.PI / 2]}>
                        <cylinderGeometry args={[0.1, 0.1, 6, 8]} />
                        <meshStandardMaterial color="#888" />
                    </mesh>
                    <mesh>
                        <cylinderGeometry args={[0.1, 0.1, 6, 8]} />
                        <meshStandardMaterial color="#888" />
                    </mesh>
                </group>

                {/* Popcorn Bucket (Cylinder) */}
                <group position={[-15, 10, -25]} rotation={[0.2, 0.2, 0]}>
                    <mesh>
                        <cylinderGeometry args={[1.5, 1, 3, 32]} />
                        <meshStandardMaterial color="#dddddd" />
                    </mesh>
                    {/* Red Stripes */}
                    <mesh position={[0, 0, 0.05]} scale={[1.01, 1, 1.01]}>
                        {/* Simplified stripe effect using a wireframe helper or just texture? 
                            Let's keep it simple geometry for now to avoid texture loading issues */}
                        <cylinderGeometry args={[1.5, 1, 3, 8]} />
                        <meshStandardMaterial color="#ff0000" wireframe />
                    </mesh>
                    {/* "Popcorn" particles on top */}
                    <mesh position={[0, 1.6, 0]}>
                        <dodecahedronGeometry args={[1.5, 0]} />
                        <meshStandardMaterial color="#ffeeaa" roughness={0.5} />
                    </mesh>
                </group>

                {/* Vintage Movie Camera */}
                <group position={[0, -20, -15]} rotation={[0, -0.5, 0.2]}>
                    {/* Body */}
                    <mesh>
                        <boxGeometry args={[1.5, 2, 3]} />
                        <meshStandardMaterial color="#333" roughness={0.5} />
                    </mesh>
                    {/* Lens */}
                    <mesh position={[0, 0, 1.8]} rotation={[Math.PI / 2, 0, 0]}>
                        <cylinderGeometry args={[0.8, 0.8, 1, 16]} />
                        <meshStandardMaterial color="#111" />
                    </mesh>
                    {/* Reels on top */}
                    <mesh position={[0, 1.5, 0.5]} rotation={[0, 0, Math.PI / 2]}>
                        <cylinderGeometry args={[0.8, 0.8, 0.5, 16]} />
                        <meshStandardMaterial color="#444" />
                    </mesh>
                    <mesh position={[0, 1.5, -0.5]} rotation={[0, 0, Math.PI / 2]}>
                        <cylinderGeometry args={[0.8, 0.8, 0.5, 16]} />
                        <meshStandardMaterial color="#444" />
                    </mesh>
                </group>
            </Float>
        </>
    )
}
