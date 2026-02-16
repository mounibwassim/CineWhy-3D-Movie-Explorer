import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Film, Heart, Play } from 'lucide-react';

const GENRES = [
    "Action", "Adventure", "Animation", "Comedy", "Crime",
    "Documentary", "Drama", "Family", "Fantasy", "Horror",
    "Mystery", "Romance", "Sci-Fi", "Thriller", "War", "Western"
];

const ERAS = [
    { id: 'classic', label: 'Golden Age', range: [1940, 1979], desc: 'The Classics (1940-1979)' },
    { id: 'retro', label: 'Retro Era', range: [1980, 1999], desc: ' VHS Nostalgia (1980-1999)' },
    { id: 'modern', label: 'Modern Age', range: [2000, 2026], desc: 'Digital Revolution (2000-2026)' },
    { id: 'all', label: 'Surprise Me', range: [1900, 2026], desc: 'All Time Greats' }
];

const VIBES = [
    { id: 'popular', label: 'Blockbusters', desc: 'Crowd pleasers & Hits' },
    { id: 'hidden', label: 'Hidden Gems', desc: 'Highly rated, less known' },
    { id: 'any', label: 'Anything', desc: 'Balance of both' }
];

export function PreferenceMatrix({ onSearch }) {
    const [selectedGenres, setSelectedGenres] = useState([]);
    const [selectedEra, setSelectedEra] = useState(ERAS[2]); // Default Modern
    const [selectedVibe, setSelectedVibe] = useState(VIBES[0]); // Default Popular

    const toggleGenre = (genre) => {
        setSelectedGenres(prev =>
            prev.includes(genre) ? prev.filter(g => g !== genre) : [...prev, genre]
        );
    };

    const handleSearch = () => {
        onSearch({
            yearRange: selectedEra.range,
            preferredGenres: selectedGenres,
            popularityPref: selectedVibe.id
        });
    };

    return (
        <div className="min-h-screen pt-24 pb-12 px-4 md:px-12 flex flex-col items-center relative z-20">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-5xl glass p-8 md:p-12 rounded-3xl border border-white/10 shadow-2xl bg-black/40 backdrop-blur-xl"
            >
                <div className="text-center mb-12">
                    <h2 className="text-4xl md:text-5xl font-black text-white mb-4">Discovery Protocol</h2>
                    <p className="text-white/50 text-lg">Calibrate the Expert System to your current mood.</p>
                </div>

                {/* 1. ERA SELECTION */}
                <div className="mb-12">
                    <h3 className="flex items-center gap-3 text-primary font-bold uppercase tracking-widest mb-6 border-b border-white/10 pb-4">
                        <Calendar className="w-5 h-5" /> 1. Select Target Era
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {ERAS.map(era => (
                            <button
                                key={era.id}
                                onClick={() => setSelectedEra(era)}
                                className={`p-6 rounded-xl text-left transition-all border ${selectedEra.id === era.id
                                    ? 'bg-primary/20 border-primary shadow-[0_0_20px_rgba(0,255,204,0.2)]'
                                    : 'bg-white/5 border-white/5 hover:bg-white/10'
                                    }`}
                            >
                                <div className={`font-bold text-lg mb-1 ${selectedEra.id === era.id ? 'text-white' : 'text-white/70'}`}>
                                    {era.label}
                                </div>
                                <div className="text-xs text-white/40 font-mono">{era.desc}</div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* 2. VIBE SELECTION */}
                <div className="mb-12">
                    <h3 className="flex items-center gap-3 text-primary font-bold uppercase tracking-widest mb-6 border-b border-white/10 pb-4">
                        <Heart className="w-5 h-5" /> 2. Choose Vibe
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {VIBES.map(vibe => (
                            <button
                                key={vibe.id}
                                onClick={() => setSelectedVibe(vibe)}
                                className={`p-6 rounded-xl text-left transition-all border ${selectedVibe.id === vibe.id
                                    ? 'bg-secondary/40 border-secondary shadow-[0_0_20px_rgba(200,0,255,0.2)]'
                                    : 'bg-white/5 border-white/5 hover:bg-white/10'
                                    }`}
                            >
                                <div className={`font-bold text-lg mb-1 ${selectedVibe.id === vibe.id ? 'text-white' : 'text-white/70'}`}>
                                    {vibe.label}
                                </div>
                                <div className="text-xs text-white/40 font-mono">{vibe.desc}</div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* 3. GENRE SELECTION */}
                <div className="mb-16">
                    <h3 className="flex items-center gap-3 text-primary font-bold uppercase tracking-widest mb-6 border-b border-white/10 pb-4">
                        <Film className="w-5 h-5" /> 3. Preferred Genres (Optional)
                    </h3>
                    <div className="flex flex-wrap gap-3">
                        {GENRES.map(genre => (
                            <button
                                key={genre}
                                onClick={() => toggleGenre(genre)}
                                className={`px-5 py-2 rounded-full text-sm font-bold transition-all border ${selectedGenres.includes(genre)
                                    ? 'bg-white text-black border-white scale-105'
                                    : 'bg-transparent text-white/60 border-white/20 hover:border-white/50'
                                    }`}
                            >
                                {genre}
                            </button>
                        ))}
                    </div>
                </div>

                {/* SUBMIT */}
                <div className="flex justify-center">
                    <button
                        onClick={handleSearch}
                        className="group relative px-12 py-5 bg-gradient-to-r from-primary to-secondary text-black font-black text-xl rounded-2xl shadow-[0_0_40px_rgba(0,255,204,0.4)] hover:shadow-[0_0_60px_rgba(0,255,204,0.6)] hover:scale-105 transition-all duration-300"
                    >
                        <span className="flex items-center gap-3 relative z-10">
                            {/* Visual Feedback for Search */}
                            INITIATE SEARCH <Play className="fill-black" />
                        </span>
                    </button>
                </div>

            </motion.div>
        </div>
    );
}
