import os
import csv
import requests
from dotenv import load_dotenv
from typing import Optional

load_dotenv()

TMDB_API_KEY = os.getenv("TMDB_API_KEY")
BASE_URL = "https://api.themoviedb.org/3"
POSTER_BASE = "https://image.tmdb.org/p/t/w500"
BACKDROP_BASE = "https://image.tmdb.org/p/t/original"

def fetch_movie_metadata(title: str, year: Optional[int] = None):
    if not TMDB_API_KEY:
        print("Error: TMDB_API_KEY not found in .env")
        return None

    params = {
        "api_key": TMDB_API_KEY,
        "query": title,
    }
    if year:
        params["year"] = year

    try:
        response = requests.get(f"{BASE_URL}/search/movie", params=params)
        response.raise_for_status()
        data = response.json()

        if data["results"]:
            # Pick the most popular result (first result is usually best match)
            movie = data["results"][0]
            poster_path = movie.get("poster_path")
            backdrop_path = movie.get("backdrop_path")
            
            return {
                "image_url": f"{POSTER_BASE}{poster_path}" if poster_path else None,
                "backdrop_url": f"{BACKDROP_BASE}{backdrop_path}" if backdrop_path else None,
                "overview": movie.get("overview", ""),
                "rating": movie.get("vote_average", 0)
            }
    except Exception as e:
        print(f"Error fetching metadata for {title}: {e}")
    
    return None

def update_dataset(file_path):
    print(f"Processing {file_path}...")
    temp_file = file_path + ".tmp"
    
    with open(file_path, "r", encoding="utf-8") as f, \
         open(temp_file, "w", encoding="utf-8", newline="") as out_f:
        
        reader = csv.DictReader(f)
        fields = reader.fieldnames
        
        # Ensure target columns exist
        new_fields = list(fields)
        for col in ["image_url", "backdrop_url", "overview"]:
            if col not in new_fields:
                new_fields.append(col)
        
        writer = csv.DictWriter(out_f, fieldnames=new_fields)
        writer.writeheader()
        
        count = 0
        for row in reader:
            title = row.get("title") or row.get("item_title")
            year = row.get("year") or row.get("release_year")
            
            # Remove year from title if present like "Toy Story (1995)"
            clean_title = title.split("(")[0].strip() if title else ""
            
            print(f"[{count}] Searching: {clean_title}...")
            meta = fetch_movie_metadata(clean_title, year)
            
            if meta:
                row["image_url"] = meta["image_url"] or row.get("image_url", "")
                row["backdrop_url"] = meta["backdrop_url"] or row.get("backdrop_url", "")
                row["overview"] = meta["overview"] or row.get("overview", "")
            
            writer.writerow(row)
            count += 1
            
    os.replace(temp_file, file_path)
    print(f"Completed {file_path}")

if __name__ == "__main__":
    if not TMDB_API_KEY:
        print("!!! Please add TMDB_API_KEY to your .env file !!!")
    else:
        # Update modern dataset first
        modern_path = os.path.join("data", "modern_movies.csv")
        if os.path.exists(modern_path):
            update_dataset(modern_path)
        
        # Optionally update classic list if needed
        # u_item_path = os.path.join("data", "u.item")
        # ... logic for u.item conversion if desired ...
