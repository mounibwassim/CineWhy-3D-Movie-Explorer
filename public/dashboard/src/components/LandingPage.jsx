import React from 'react';
import { motion } from 'framer-motion';
import { Canvas } from '@react-three/fiber';
import { FloatingIcon } from './FloatingIcon';
import { Sparkles } from 'lucide-react';

export function LandingPage({ onStart }) {
    return (
        <div className="flex flex-col items-center justify-center h-screen w-full relative z-10">
            {/* 3D Centerpiece */}
            <div className="w-64 h-64 md:w-96 md:h-96 relative mb-8">
                <Canvas>
                    <ambientLight intensity={0.5} />
                    <pointLight position={[10, 10, 10]} />
                    <FloatingIcon scale={2.5} />
                </Canvas>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.8 }}
                className="text-center space-y-6 max-w-2xl px-4"
            >
                <h1 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary drop-shadow-[0_0_15px_rgba(0,255,204,0.5)]">
                    CINE<span className="italic text-white">WHY</span>
                </h1>

                <p className="text-xl md:text-2xl text-gray-300 font-light leading-relaxed">
                    Your Personal AI Film Connoisseur. <br />
                    <span className="text-sm md:text-base text-gray-500 mt-2 block">
                        We don't just guess; we use transparent logic to find the movies that actually match your soul.
                    </span>
                </p>

                <motion.button
                    whileHover={{ scale: 1.05, boxShadow: "0 0 20px rgba(0, 255, 204, 0.4)" }}
                    whileTap={{ scale: 0.95 }}
                    onClick={onStart}
                    className="group relative px-8 py-4 bg-transparent overflow-hidden rounded-full border border-primary/50 text-white font-bold text-lg tracking-widest uppercase transition-all duration-300 hover:bg-primary/10 hover:border-primary"
                >
                    <span className="relative z-10 flex items-center gap-2">
                        Start Exploration <Sparkles className="w-5 h-5 group-hover:animate-spin" />
                    </span>
                    <div className="absolute inset-0 bg-primary/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </motion.button>
            </motion.div>
        </div>
    );
}
