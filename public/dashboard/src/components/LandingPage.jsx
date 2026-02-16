import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';

export function LandingPage({ onStart }) {
    return (
        <div className="relative z-10 w-full h-screen flex flex-col justify-center items-center text-center p-8 overflow-hidden">

            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1.2, ease: "easeOut" }}
                className="mb-12"
            >
                <div className="inline-block mb-4 px-4 py-1 border border-white/20 rounded-full bg-white/5 backdrop-blur-sm text-[10px] tracking-[0.3em] uppercase text-white/60 font-mono">
                    System v4.0 Online
                </div>
                <h1 className="text-6xl md:text-9xl font-black tracking-tighter text-white mb-2 font-['Montserrat'] drop-shadow-[0_0_50px_rgba(255,255,255,0.2)]">
                    CINE<span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00ffcc] to-[#00aaff] italic">WHY</span>
                </h1>
                <p className="text-xl md:text-2xl text-white/50 font-light max-w-2xl mx-auto leading-relaxed">
                    The AI that understands your soul, not just your watch history.
                </p>
            </motion.div>

            {/* WHAT WE DO SECTION */}
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.8 }}
                className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto mb-16 text-left"
            >
                <div className="p-6 glass rounded-2xl border border-white/10 hover:bg-white/5 transition-colors">
                    <h3 className="text-white font-bold mb-2 flex items-center gap-2">
                        <span className="w-2 h-2 bg-[#00ffcc] rounded-full shadow-[0_0_10px_#00ffcc]"></span>
                        Deep Analysis
                    </h3>
                    <p className="text-sm text-white/40 leading-relaxed">We analyze plot structures, emotional arcs, and cinematic styles, not just genres.</p>
                </div>
                <div className="p-6 glass rounded-2xl border border-white/10 hover:bg-white/5 transition-colors">
                    <h3 className="text-white font-bold mb-2 flex items-center gap-2">
                        <span className="w-2 h-2 bg-[#00aaff] rounded-full shadow-[0_0_10px_#00aaff]"></span>
                        Classic & Modern
                    </h3>
                    <p className="text-sm text-white/40 leading-relaxed">From 1922 Silent Films to 2026 Blockbusters, our database is timeless.</p>
                </div>
                <div className="p-6 glass rounded-2xl border border-white/10 hover:bg-white/5 transition-colors">
                    <h3 className="text-white font-bold mb-2 flex items-center gap-2">
                        <span className="w-2 h-2 bg-[#ff0055] rounded-full shadow-[0_0_10px_#ff0055]"></span>
                        Transparent Logic
                    </h3>
                    <p className="text-sm text-white/40 leading-relaxed">We don't hide our reasoning. See exactly *why* a movie was chosen for you.</p>
                </div>
            </motion.div>

            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onStart}
                className="group relative px-10 py-5 bg-white text-black font-black text-lg tracking-widest uppercase rounded-full overflow-hidden transition-all shadow-[0_0_40px_rgba(255,255,255,0.3)] hover:shadow-[0_0_60px_rgba(0,255,204,0.5)]"
            >
                <div className="relative z-10 flex items-center gap-3">
                    Experience Now <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </div>
                <div className="absolute inset-0 bg-gradient-to-r from-[#00ffcc] to-[#00aaff] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </motion.button>

            <p className="absolute bottom-8 text-[10px] text-white/20 uppercase tracking-[0.2em] font-mono">
                Powered by Google Gemini + TMDB
            </p>
        </div>
    );
}
