import fs from 'fs';
import path from 'path';

const dataDir = './data';
const modernFile = path.join(dataDir, 'modern_movies.csv');
const uItemFile = path.join(dataDir, 'u.item');

const moviesBefore2000 = [];
const moviesAfter2000 = [];

// Helper to parse MovieLens title and year
const parseML = (line) => {
    const parts = line.split('|');
    if (parts.length < 2) return null;
    const fullTitle = parts[1];
    const match = fullTitle.match(/\((\d{4})\)/);
    const year = match ? parseInt(match[1]) : null;
    return { title: fullTitle, year };
};

// Helper to parse Modern CSV
const parseModern = (content) => {
    const lines = content.split('\n').filter(l => l.trim());
    const headers = lines[0].split(',');
    return lines.slice(1).map(line => {
        const values = line.split(',');
        const obj = {};
        headers.forEach((h, i) => obj[h.trim()] = values[i]);
        const year = obj.release_date ? parseInt(obj.release_date.split('-')[0]) : null;
        return { title: obj.title, year };
    });
};

try {
    // Process Modern
    if (fs.existsSync(modernFile)) {
        const modernMovies = parseModern(fs.readFileSync(modernFile, 'utf-8'));
        modernMovies.forEach(m => {
            if (m.year >= 2000) moviesAfter2000.push(m);
            else if (m.year) moviesBefore2000.push(m);
        });
    }

    // Process MovieLens
    if (fs.existsSync(uItemFile)) {
        const lines = fs.readFileSync(uItemFile, 'utf-8').split('\n').filter(l => l.trim());
        lines.forEach(line => {
            const m = parseML(line);
            if (m) {
                if (m.year >= 2000) moviesAfter2000.push(m);
                else if (m.year) moviesBefore2000.push(m);
            }
        });
    }

    const sortFn = (a, b) => a.year !== b.year ? a.year - b.year : a.title.localeCompare(b.title);
    moviesBefore2000.sort(sortFn);
    moviesAfter2000.sort(sortFn);

    let output = "=== MOVIES BEFORE 2000 ===\n";
    moviesBefore2000.forEach(m => output += `[${m.year}] ${m.title}\n`);
    output += "\n=== MOVIES AFTER 2000 (MODERN) ===\n";
    moviesAfter2000.forEach(m => output += `[${m.year}] ${m.title}\n`);

    fs.writeFileSync('movie_list.txt', output);
    console.log("Generated movie_list.txt with " + (moviesBefore2000.length + moviesAfter2000.length) + " movies.");

} catch (err) {
    console.error("Error generating list:", err);
    process.exit(1);
}
