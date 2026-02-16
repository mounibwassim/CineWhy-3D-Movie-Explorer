import React, { useEffect, useRef } from 'react';
import VanillaTilt from 'vanilla-tilt';
import { Play, Info, Star } from 'lucide-react';

export function TiltCard({ movie, onClick }) {
    const tiltRef = useRef(null);

    useEffect(() => {
        if (tiltRef.current) {
            VanillaTilt.init(tiltRef.current, {
                max: 15,
                speed: 400,
                glare: true,
                "max-glare": 0.5,
                scale: 1.05
            });
        }
    }, []);

    // WIREFRAME PLACEHOLDER LOGIC
    // If no image_url, show a glowing cyber-grid
    const hasImage = movie.image_url && movie.image_url !== 'null';

    return (
        <div
            ref={tiltRef}
            onClick={() => onClick(movie)}
            className="relative group cursor-pointer aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl bg-[#0a0a0a] border border-white/10"
        >
            {hasImage ? (
                <img
                    src={movie.image_url}
                    alt={movie.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    onError={(e) => {
                        // Fallback to wireframe if load fails
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                    }}
                />
            ) : (
                /* GLOWING WIREFRAME PLACEHOLDER */
                <div className="w-full h-full absolute inset-0 bg-[#000] flex flex-col items-center justify-center p-6 text-center border-4 border-[#00ffcc]/20">
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
                    {/* Horizontal Grid Lines */}
                    <div className="absolute inset-0 bg-[linear-gradient(to_bottom,#00ffcc10_1px,transparent_1px)] bg-[size:100%_40px]"></div>
                    {/* Vertical Grid Lines */}
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#00ffcc10_1px,transparent_1px)] bg-[size:40px_100%]"></div>

                    <div className="z-10 relative">
                        <div className="w-16 h-16 border-2 border-[#00ffcc] rounded-full flex items-center justify-center mb-4 mx-auto shadow-[0_0_30px_#00ffcc50]">
                            <span className="text-2xl font-mono text-[#00ffcc] font-bold">?</span>
                        </div>
                        <h3 className="text-white font-bold font-['Montserrat'] text-lg drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">{movie.title}</h3>
                        <p className="text-[#00ffcc] text-xs font-mono mt-2 tracking-widest uppercase">Visual Data Missing</p>
                    </div>
                </div>
            )}

            {/* Fallback container for onError (hidden by default) */}
            <div className="hidden w-full h-full absolute inset-0 bg-[#000] flex-col items-center justify-center p-6 text-center border-4 border-[#ff0055]/20">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#ff005510_1px,transparent_1px)] bg-[size:40px_100%]"></div>
                <div className="z-10 relative">
                    <h3 className="text-white font-bold font-['Montserrat'] text-lg">{movie.title}</h3>
                    <p className="text-[#ff0055] text-xs font-mono mt-2">Link Broken</p>
                </div>
            </div>

            {/* OVERLAY CONTENT */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6">

                {/* Ranking Badge */}
                <div className="absolute top-4 right-4 bg-primary text-black font-black text-xs px-2 py-1 rounded shadow-[0_0_20px_#00ffcc]">
                    #{movie.score ? Math.round(movie.score * 10) : 'Top'} Match
                </div>

                <h3 className="text-white font-bold text-xl leading-tight drop-shadow-lg font-['Montserrat'] translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                    {movie.title}
                </h3>
                <p className="text-primary font-medium text-xs mt-1 mb-3 uppercase tracking-widest">
                    {movie.genres ? movie.genres.join(' • ') : ''}
                </p>

                {/* THE "WHY" EXPLANATION */}
                {movie.why && movie.why.length > 0 && (
                    <div className="bg-white/10 backdrop-blur-md p-3 rounded-lg border border-white/10 mb-2 translate-y-4 group-hover:translate-y-0 transition-transform duration-500 delay-100">
                        <p className="text-[10px] text-white/80 leading-relaxed font-mono">
                            <span className="text-primary font-bold">MATCH PROTOCOL:</span> Because you like {movie.why[0].ruleName.split('_').join(' ')}
                        </p>
                    </div>
                )}

                <div className="flex gap-2 mt-2 translate-y-4 group-hover:translate-y-0 transition-transform duration-700 delay-200">
                    <button className="bg-white text-black p-2 rounded-full hover:bg-primary transition-colors">
                        <Play className="w-4 h-4 fill-current" />
                    </button>
                    <button className="glass text-white p-2 rounded-full hover:bg-white/20 transition-colors">
                        <Info className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}
