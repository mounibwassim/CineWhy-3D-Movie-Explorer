# How to Implement and Run

This guide provides step-by-step instructions to set up the environment, prepare the data, and run the Movie Expert System.

## 1. Prerequisites
-   **OS**: Windows, macOS, or Linux.
-   **Python**: Version 3.8 or higher.
-   **Pip**: Python package installer (usually comes with Python).

## 2. Installation

1.  **Clone/Download the Code**: Ensure you have the project files in a folder (e.g., `TSE/code`).
2.  **Open Terminal**: Navigate to the project root directory.
    ```bash
    cd path/to/TSE/code
    ```
3.  **Create a Virtual Environment** (Recommended):
    -   *Windows*:
        ```bash
        python -m venv .venv
        .venv\Scripts\activate
        ```
    -   *Mac/Linux*:
        ```bash
        python3 -m venv .venv
        source .venv/bin/activate
        ```
4.  **Install Dependencies**:
    ```bash
    pip install -r requirements.txt
    ```

## 3. Data Setup

The system requires dataset files. You must place them in the `data/` directory.

### Option A: MovieLens 100K (Recommended for testing)
1.  Download the "MovieLens 100K Dataset" (approx 5MB).
2.  Extract the files.
3.  Copy the following files into your `data/` directory:
    -   `u.data`
    -   `u.item`
    -   `u.genre`

### Option B: TMDB 5000 (Richer metadata)
1.  Download the "TMDB 5000 Movie Dataset" from Kaggle or similar sources.
2.  Copy `tmdb_5000_movies.csv` into your `data/` directory.
    -   (Optional) `tmdb_5000_credits.csv` is not strictly required for the current version but good to have.

*Note: If both datasets are present, you can choose which one to use at runtime.*

## 4. Running the Application

### Method 1: Command Line Interface (CLI)
Best for quick tests and seeing the text-based output.

```bash
python app/cli.py
```
-   **Usage**: Follow the interactive prompts.
-   **Example Flow**:
    1.  Select Dataset: `movielens_100k`
    2.  Preferred Genres: `Action, Sci-Fi`
    3.  Excluded Genres: `Romance`
    4.  Year Range: `1980` to `2020`
    5.  Min Rating: `3.5`
-   **Output**: Returns top 10 ranked movies with "Why" explanations.

### Method 2: Web Interface (Streamlit)
Best for a visual, interactive experience.

1.  Run the following command in your terminal:
    ```bash
    streamlit run app/streamlit_app.py
    ```
2.  **Click here to open the dashboard:**
    [http://localhost:8501](http://localhost:8501)

    *(Note: You must keep the terminal open and the command running for the dashboard to work)*

## 5. Running Tests

To ensure everything is working correctly, you can run the test suite.

```bash
pytest
```
-   This checks if the data loader parses CSVs correctly.
-   Verifies that the rule engine calculates scores as expected.

## 6. Project Customization (Implementation Details)

If you want to modify the logic:

-   **Add New Rules**: Edit `app/rules.py`.
    -   Add a new `Rule(...)` object to the list.
    -   Example: Add a rule to boost "Short movies" (< 90 mins).
-   **Change Data Logic**: Edit `app/data_loader.py`.
    -   Modify how CSV columns are mapped to the `Movie` object.
-   **Tweak Constraints**: Edit `app/rule_engine.py`.
    -   Adjust hard filters (e.g., change how strict the year filtering is).
