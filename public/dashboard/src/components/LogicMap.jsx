import React from 'react';
import { motion } from 'framer-motion';
import { Activity, Brain, Database, GitBranch } from 'lucide-react';

export function LogicMap() {
    return (
        <div className="min-h-screen pt-24 px-4 md:px-12 relative z-20">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="max-w-6xl mx-auto"
            >
                <div className="text-center mb-16">
                    <h2 className="text-4xl md:text-5xl font-black mb-4">Neural Architecture</h2>
                    <p className="text-white/50 text-xl">Visualizing the Expert System's Decision Path</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Input Layer */}
                    <div className="glass p-8 rounded-3xl border border-primary/20">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="p-3 bg-primary/20 rounded-xl">
                                <Database className="w-6 h-6 text-primary" />
                            </div>
                            <h3 className="text-2xl font-bold">1. Data Ingestion</h3>
                        </div>
                        <ul className="space-y-4 text-white/70">
                            <li className="flex items-center gap-3">
                                <span className="w-2 h-2 bg-primary rounded-full" />
                                Analyzing 5,000+ Modern Data Points
                            </li>
                            <li className="flex items-center gap-3">
                                <span className="w-2 h-2 bg-primary rounded-full" />
                                Processing 100k Classic Ratings
                            </li>
                            <li className="flex items-center gap-3">
                                <span className="w-2 h-2 bg-primary rounded-full" />
                                Normalizing across 8 Decades
                            </li>
                        </ul>
                    </div>

                    {/* Processing Layer */}
                    <div className="glass p-8 rounded-3xl border border-secondary/20 relative overflow-hidden">
                        <div className="absolute inset-0 bg-secondary/5 animate-pulse" />
                        <div className="flex items-center gap-4 mb-6 relative z-10">
                            <div className="p-3 bg-secondary/20 rounded-xl">
                                <Brain className="w-6 h-6 text-secondary" />
                            </div>
                            <h3 className="text-2xl font-bold">2. Cognitive Engine</h3>
                        </div>
                        <ul className="space-y-4 text-white/70 relative z-10">
                            <li className="flex items-center gap-3">
                                <span className="w-2 h-2 bg-secondary rounded-full" />
                                Applying "CineWhy" Heuristics
                            </li>
                            <li className="flex items-center gap-3">
                                <span className="w-2 h-2 bg-secondary rounded-full" />
                                Scoring based on Genre Affinity
                            </li>
                            <li className="flex items-center gap-3">
                                <span className="w-2 h-2 bg-secondary rounded-full" />
                                Weighted Popularity Bias
                            </li>
                        </ul>
                    </div>

                    {/* Output Layer */}
                    <div className="glass p-8 rounded-3xl border border-white/10">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="p-3 bg-white/10 rounded-xl">
                                <Activity className="w-6 h-6 text-white" />
                            </div>
                            <h3 className="text-2xl font-bold">3. Recommendation</h3>
                        </div>
                        <ul className="space-y-4 text-white/70">
                            <li className="flex items-center gap-3">
                                <span className="w-2 h-2 bg-white rounded-full" />
                                Generating "Why" Explanations
                            </li>
                            <li className="flex items-center gap-3">
                                <span className="w-2 h-2 bg-white rounded-full" />
                                Ranking Top 20 Candidates
                            </li>
                            <li className="flex items-center gap-3">
                                <span className="w-2 h-2 bg-white rounded-full" />
                                3D Visualization Render
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Connection Lines (Visual only) */}
                <div className="hidden md:block absolute top-1/2 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent -z-10" />
            </motion.div>
        </div>
    );
}
