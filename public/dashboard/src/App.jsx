import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Info, Play, Filter, X, ChevronLeft, ChevronRight } from 'lucide-react'
import VanillaTilt from 'vanilla-tilt'
import { Swiper, SwiperSlide } from 'swiper/react'
import { EffectCoverflow, Navigation, Pagination } from 'swiper/modules'
import { Canvas } from '@react-three/fiber'
import { FloatingIcon } from './components/FloatingIcon'
import { ParticleSystem } from './components/ParticleSystem'
import { EffectComposer, Bloom } from '@react-three/postprocessing'

// Import Swiper styles
import 'swiper/css'
import 'swiper/css/effect-coverflow'
import 'swiper/css/navigation'
import 'swiper/css/pagination'

const TiltCard = ({ movie, onClick }) => {
    const tiltRef = useRef(null)

    useEffect(() => {
        if (tiltRef.current) {
            VanillaTilt.init(tiltRef.current, {
                max: 15,
                speed: 400,
                glare: true,
                'max-glare': 0.3,
            })
        }
    }, [])

    return (
        <div
            ref={tiltRef}
            onClick={() => onClick(movie)}
            className="relative group cursor-pointer aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl bg-secondary border border-white/10"
        >
            <img
                src={movie.image_url || `https://image.tmdb.org/t/p/w500${movie.poster_path}`}
                alt={movie.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                    e.target.src = 'https://via.placeholder.com/500x750?text=' + encodeURIComponent(movie.title)
                }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="absolute bottom-0 p-6 w-full">
                    <h3 className="text-white font-bold text-xl leading-tight drop-shadow-lg">{movie.title}</h3>
                    <p className="text-primary font-medium text-sm mt-1">{movie.genres.join(', ')}</p>
                </div>
            </div>
        </div>
    )
}

const DetailModal = ({ movie, onClose }) => {
    if (!movie) return null;
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-12 bg-black/90 backdrop-blur-xl"
            onClick={onClose}
        >
            <motion.div
                layoutId={`movie-${movie.id}`}
                onClick={(e) => e.stopPropagation()}
                className="glass max-w-6xl w-full h-[90vh] md:h-auto overflow-hidden rounded-[2.5rem] relative flex flex-col md:flex-row shadow-[0_0_100px_rgba(212,175,55,0.15)]"
            >
                <button onClick={onClose} className="absolute top-6 right-6 z-20 p-3 bg-black/40 hover:bg-black/80 rounded-full transition-all border border-white/10">
                    <X className="w-6 h-6" />
                </button>

                <div className="w-full md:w-5/12 relative group">
                    <img
                        src={movie.image_url || `https://image.tmdb.org/t/p/w500${movie.poster_path}`}
                        alt={movie.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                            e.target.src = 'https://via.placeholder.com/500x750?text=' + encodeURIComponent(movie.title)
                        }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/20" />
                </div>

                <div className="p-8 md:p-16 flex-1 flex flex-col justify-center overflow-y-auto bg-[#080808]/80">
                    <div className="mb-10">
                        <motion.h2
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            className="text-5xl md:text-7xl font-black mb-6 tracking-tighter"
                        >
                            {movie.title}
                        </motion.h2>
                        <div className="flex flex-wrap gap-4 text-base font-semibold text-white/60">
                            <span className="px-3 py-1 bg-primary/10 text-primary rounded-md border border-primary/20">{movie.year}</span>
                            <span className="px-3 py-1 bg-white/5 rounded-md border border-white/10">{movie.genres.join(' • ')}</span>
                            <span className="px-3 py-1 bg-white/5 rounded-md border border-white/10">⭐ {movie.rating} / 10</span>
                        </div>
                    </div>

                    <p className="text-xl text-white/80 mb-12 leading-relaxed font-light">
                        {movie.overview}
                    </p>

                    <div className="space-y-8">
                        <h3 className="text-primary font-bold uppercase tracking-[0.2em] text-xs">Explanatory Rules</h3>
                        <div className="grid grid-cols-1 gap-4">
                            {movie.why.map((rule, i) => (
                                <motion.div
                                    initial={{ y: 10, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: i * 0.1 }}
                                    key={i}
                                    className="flex items-center gap-6 p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors group"
                                >
                                    <div className="p-3 bg-primary/20 rounded-xl group-hover:scale-110 transition-transform">
                                        <Info className="w-6 h-6 text-primary" />
                                    </div>
                                    <div>
                                        <p className="text-lg font-bold text-white">{rule.explanation}</p>
                                        <p className="text-sm text-white/40 uppercase tracking-widest mt-1 font-mono">{rule.rule_id}</p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    )
}

export default function App() {
    const [movies, setMovies] = useState([])
    const [heroMovie, setHeroMovie] = useState(null)
    const [selectedMovie, setSelectedMovie] = useState(null)
    const [loading, setLoading] = useState(true)
    const [activeBackdrop, setActiveBackdrop] = useState('')

    useEffect(() => {
        fetchRecommendations()
    }, [])

    const fetchRecommendations = async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/recommend', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    preferredGenres: [],
                    excludedGenres: [],
                    yearRange: [2000, 2026],
                    minRating: 0,
                    topK: 20
                })
            })
            const data = await res.json()
            if (data.ok) {
                setMovies(data.results)
                setHeroMovie(data.results[0])
                setActiveBackdrop(data.results[0]?.backdrop_url || `https://image.tmdb.org/t/p/original${data.results[0]?.poster_path}`)
            }
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const handleSlideChange = (swiper) => {
        const movie = movies[swiper.activeIndex]
        if (movie) {
            setActiveBackdrop(movie.backdrop_url || `https://image.tmdb.org/t/p/original${movie.poster_path}`)
        }
    }

    return (
        <div className="min-h-screen bg-[#050505] text-white selection:bg-primary selection:text-black overflow-x-hidden">
            {/* Immersive Background with Particles */}
            <div className="fixed inset-0 z-0 transition-opacity duration-1000 pointer-events-none">
                <Canvas camera={{ position: [0, 0, 30], fov: 75 }}>
                    <color attach="background" args={['#050505']} />
                    <ambientLight intensity={0.5} />
                    <ParticleSystem count={300} />
                    <EffectComposer>
                        <Bloom luminanceThreshold={0.5} luminanceSmoothing={0.9} height={300} />
                    </EffectComposer>
                </Canvas>
            </div>

            <div className="fixed inset-0 z-0 transition-opacity duration-1000 opacity-40">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeBackdrop}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-cover bg-center transition-all duration-1000 blur-2xl scale-110"
                        style={{ backgroundImage: `url(${activeBackdrop})` }}
                    />
                </AnimatePresence>
                <div className="absolute inset-0 bg-gradient-to-b from-[#050505]/40 via-[#050505]/80 to-[#050505]" />
            </div>

            <nav className="fixed top-0 w-full z-40 p-8 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent backdrop-blur-sm">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 relative">
                        <Canvas>
                            <FloatingIcon />
                        </Canvas>
                    </div>
                    <h1 className="text-3xl font-black tracking-tighter text-white flex items-center gap-2">
                        CINE<span className="text-primary italic">WHY</span>
                        <span className="w-2 h-2 bg-primary rounded-full animate-pulse ml-1" />
                    </h1>
                </div>
                <div className="flex gap-8 text-sm font-bold uppercase tracking-widest text-white/60">
                    <a href="#" className="text-white border-b-2 border-primary pb-1">3D Explore</a>
                    <a href="#" className="hover:text-white transition-colors">Classic Lists</a>
                    <a href="#" className="hover:text-white transition-colors">Advanced Search</a>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative h-screen w-full items-center flex z-10 p-8 md:p-24">
                {heroMovie && (
                    <div className="max-w-5xl">
                        <motion.div
                            initial={{ y: 30, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ duration: 1 }}
                        >
                            <div className="flex items-center gap-3 mb-6 text-primary font-black uppercase tracking-[0.3em] text-xs">
                                <span className="w-12 h-px bg-primary" />
                                Expert's Choice #1
                            </div>
                            <h1 className="text-7xl md:text-[10rem] font-black mb-8 leading-[0.85] tracking-tighter drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
                                {heroMovie.title}
                            </h1>
                            <p className="text-xl md:text-3xl text-white/60 mb-12 line-clamp-3 font-light max-w-2xl leading-relaxed">
                                {heroMovie.overview}
                            </p>
                            <div className="flex gap-6">
                                <button onClick={() => setSelectedMovie(heroMovie)} className="px-10 py-5 bg-primary text-black font-black rounded-xl flex items-center gap-3 hover:scale-105 transition-all shadow-[0_10px_40px_rgba(212,175,55,0.3)]">
                                    <Play className="w-6 h-6 fill-current" />
                                    EXPERIENCE NOW
                                </button>
                                <button className="px-10 py-5 glass text-white font-bold rounded-xl flex items-center gap-3 hover:bg-white/10 transition-all border border-white/20">
                                    <Info className="w-6 h-6" />
                                    DETAILS
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </section>

            {/* The 3D Coverflow Grid */}
            <main className="pb-32 relative z-20">
                <div className="px-8 md:px-24 mb-16 flex items-end justify-between">
                    <div>
                        <h2 className="text-4xl md:text-6xl font-black tracking-tighter mb-4 italic">The Future Gallery</h2>
                        <p className="text-white/40 font-medium tracking-widest uppercase text-xs">Flick through your top 20 recommendations</p>
                    </div>
                    <div className="flex gap-4 mb-2">
                        <button className="p-4 glass rounded-full hover:bg-primary hover:text-black transition-all swiper-prev">
                            <ChevronLeft className="w-6 h-6" />
                        </button>
                        <button className="p-4 glass rounded-full hover:bg-primary hover:text-black transition-all swiper-next">
                            <ChevronRight className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center items-center h-96">
                        <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                    </div>
                ) : (
                    <Swiper
                        effect={'coverflow'}
                        grabCursor={true}
                        centeredSlides={true}
                        slidesPerView={'auto'}
                        loop={true}
                        onSlideChange={handleSlideChange}
                        coverflowEffect={{
                            rotate: 30,
                            stretch: 0,
                            depth: 100,
                            modifier: 2,
                            slideShadows: true,
                        }}
                        navigation={{
                            nextEl: '.swiper-next',
                            prevEl: '.swiper-prev',
                        }}
                        modules={[EffectCoverflow, Navigation, Pagination]}
                        className="w-full py-12"
                    >
                        {movies.map((movie) => (
                            <SwiperSlide key={movie.id} className="w-[300px] md:w-[450px]">
                                <TiltCard movie={movie} onClick={setSelectedMovie} />
                            </SwiperSlide>
                        ))}
                    </Swiper>
                )}
            </main>

            {/* Detail Modal */}
            <AnimatePresence>
                {selectedMovie && (
                    <DetailModal movie={selectedMovie} onClose={() => setSelectedMovie(null)} />
                )}
            </AnimatePresence>

            <footer className="p-12 text-center text-white/20 font-mono text-xs uppercase tracking-[0.5em] border-t border-white/5 bg-black/40 relative z-30">
                Engineered by CineWhy Expert Shell v2.5 // (c) 2026
            </footer>
        </div>
    )
}
