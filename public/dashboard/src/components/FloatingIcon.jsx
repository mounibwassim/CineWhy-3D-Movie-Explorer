import React, { useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Float, Cylinder } from '@react-three/drei'
import * as THREE from 'three'

export function FloatingIcon() {
    const meshRef = useRef()
    const groupRef = useRef()
    const [hovered, setHovered] = useState(false)
    const { mouse, viewport } = useThree()

    useFrame((state) => {
        if (!groupRef.current) return

        // Matrix-style floating rhythm (Sine wave)
        const time = state.clock.getElapsedTime()
        groupRef.current.position.y = Math.sin(time) * 0.2

        // Smooth Mouse Follow (Raycaster-like feel)
        // Map mouse x/y (-1 to 1) to viewport units
        const x = (mouse.x * viewport.width) / 4
        const y = (mouse.y * viewport.height) / 4

        // Lerp for smooth transition ("spring-back" effect)
        groupRef.current.lookAt(x, y, 5) // Make it "look" at the mouse? Or just tilt.
        // Let's rotate gently towards mouse instead of lookAt for a subtle effect
        groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, y * 0.5, 0.1)
        groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, x * 0.5, 0.1)
    })

    return (
        <group ref={groupRef}>
            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} color="#00ffcc" intensity={2} />

            {/* Film Reel Shape - A simplified cylinder with gaps? Or a Torus? 
          Let's make a "Futuristic Reel" using a Torus and a Cylinder. */}
            <group
                onPointerOver={() => setHovered(true)}
                onPointerOut={() => setHovered(false)}
                scale={hovered ? 1.2 : 1}
            >
                {/* Main Reel Ring */}
                <mesh>
                    <torusGeometry args={[1, 0.3, 16, 100]} />
                    <meshStandardMaterial
                        color="#000000"
                        emissive="#00ffcc"
                        emissiveIntensity={hovered ? 2 : 0.5}
                        wireframe={true} // Matrix style!
                    />
                </mesh>

                {/* Inner Hub */}
                <mesh rotation={[Math.PI / 2, 0, 0]}>
                    <cylinderGeometry args={[0.3, 0.3, 0.2, 32]} />
                    <meshStandardMaterial color="#00aa88" metalness={0.8} roughness={0.2} />
                </mesh>

                {/* Spokes */}
                {[0, 1, 2, 3].map((i) => (
                    <mesh key={i} rotation={[0, 0, (Math.PI / 2) * i]}>
                        <boxGeometry args={[1.8, 0.1, 0.1]} />
                        <meshStandardMaterial color="#00ffcc" emissive="#00ffcc" emissiveIntensity={1} />
                    </mesh>
                ))}
            </group>
        </group>
    )
}
