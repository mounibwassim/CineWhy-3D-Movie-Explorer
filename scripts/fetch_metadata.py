import os
import csv
import json
import requests
from dotenv import load_dotenv
from typing import Optional, Dict

load_dotenv()

TMDB_API_KEY = os.getenv("TMDB_API_KEY")
BASE_URL = "https://api.themoviedb.org/3"
POSTER_BASE = "https://image.tmdb.org/t/p/w500"
BACKDROP_BASE = "https://image.tmdb.org/t/p/original"

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

def update_modern_dataset(file_path):
    print(f"Processing Modern Dataset: {file_path}...")
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
            
            # Skip if already has image_url to save time/API calls
            if row.get("image_url"):
                writer.writerow(row)
                continue

            print(f"[Modern] {count}: Searching {clean_title} ({year})...")
            meta = fetch_movie_metadata(clean_title, year)
            
            if meta:
                row["image_url"] = meta["image_url"] or row.get("image_url", "")
                row["backdrop_url"] = meta["backdrop_url"] or row.get("backdrop_url", "")
                row["overview"] = meta["overview"] or row.get("overview", "")
            
            writer.writerow(row)
            count += 1
            
    os.replace(temp_file, file_path)
    print(f"Completed Modern Dataset: {file_path}")

def update_classic_dataset(u_item_path, metadata_json_path):
    print(f"Processing Classic Dataset: {u_item_path}...")
    
    # Load existing metadata to avoid refetching
    metadata = {}
    if os.path.exists(metadata_json_path):
        with open(metadata_json_path, "r", encoding="utf-8") as f:
            metadata = json.load(f)

    with open(u_item_path, "r", encoding="latin-1") as f:
        lines = f.readlines()

    count = 0
    for line in lines:
        parts = line.split("|")
        if len(parts) < 2:
            continue
            
        movie_id = parts[0]
        title_raw = parts[1]
        
        # Check if we already have metadata
        if movie_id in metadata and metadata[movie_id].get("image_url"):
            continue

        # Extract title and year: "Toy Story (1995)" -> "Toy Story", 1995
        title = title_raw.split("(")[0].strip()
        year = None
        try:
            year_part = title_raw.split("(")[-1].replace(")", "")
            year = int(year_part)
        except:
            pass

        print(f"[Classic] {count}: Searching {title} ({year})...")
        meta = fetch_movie_metadata(title, year)
        
        if meta:
            metadata[movie_id] = meta
        
        count += 1
        # Save periodically
        if count % 10 == 0:
             with open(metadata_json_path, "w", encoding="utf-8") as f:
                json.dump(metadata, f, indent=2)

    # Final Save
    with open(metadata_json_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)
    print(f"Completed Classic Dataset. Metadata saved to {metadata_json_path}")

if __name__ == "__main__":
    if not TMDB_API_KEY or TMDB_API_KEY == "your_api_key_here":
        print("!!! Error: Valid TMDB_API_KEY required in .env !!!")
    else:
        # 1. Update Modern Movies (CSV)
        modern_path = os.path.join("data", "modern_movies.csv")
        if os.path.exists(modern_path):
            update_modern_dataset(modern_path)
        
        # 2. Update Classic Movies (u.item -> movie_metadata.json)
        u_item_path = os.path.join("data", "u.item")
        metadata_json_path = os.path.join("data", "movie_metadata.json")
        if os.path.exists(u_item_path):
            update_classic_dataset(u_item_path, metadata_json_path)
