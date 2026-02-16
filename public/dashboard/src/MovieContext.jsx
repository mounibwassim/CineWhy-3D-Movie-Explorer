import React, { createContext, useContext, useState } from 'react';

const MovieContext = createContext();

export const useMovieContext = () => useContext(MovieContext);

export const MovieProvider = ({ children }) => {
    const [view, setView] = useState('landing');
    const [movies, setMovies] = useState([]);
    const [heroMovie, setHeroMovie] = useState(null);
    const [lastCriteria, setLastCriteria] = useState(null);

    const value = {
        view,
        setView,
        movies,
        setMovies,
        heroMovie,
        setHeroMovie,
        lastCriteria,
        setLastCriteria
    };

    return (
        <MovieContext.Provider value={value}>
            {children}
        </MovieContext.Provider>
    );
};
