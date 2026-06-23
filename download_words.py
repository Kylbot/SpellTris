import urllib.request
import os
import sys

def main():
    urls = [
        "https://raw.githubusercontent.com/rressler/data_raw_courses/main/enable1_words.txt",
        "https://raw.githubusercontent.com/redbo/scrabble/master/dictionary.txt",
        "https://raw.githubusercontent.com/raun/Scrabble/master/words.txt"
    ]
    
    words = set()
    downloaded = False
    
    print("Attempting to download English word list...")
    for url in urls:
        try:
            print(f"Trying {url}...")
            with urllib.request.urlopen(url, timeout=10) as response:
                content = response.read().decode('utf-8')
                # Split by lines
                lines = content.splitlines()
                for line in lines:
                    word = line.strip().upper()
                    # Filter 4 to 6 letter alphabetical words
                    if 4 <= len(word) <= 6 and word.isalpha():
                        words.add(word)
                if len(words) > 5000:
                    downloaded = True
                    print(f"Successfully downloaded and parsed {len(words)} words from {url}.")
                    break
        except Exception as e:
            print(f"Failed to download from {url}: {e}")
            
    if not downloaded:
        print("Could not download any dictionary. Using fallback basic word list.")
        # Fallback list of common words in case the script is run offline
        fallback = [
            "WORD", "GAME", "PLAY", "TEST", "EATS", "STOP", "POST", "STAR", "TIME", "LINE",
            "WAVE", "GLOW", "NEON", "GRID", "FALL", "DROP", "TURN", "LOCK", "MOVE", "TEAM",
            "WORK", "CODE", "BLUE", "REDY", "GOLD", "FIRE", "WIND", "RAIN", "SAND", "LAND",
            "WATER", "EARTH", "SPACE", "PLANET", "STARL", "SHINE", "LIGHT", "DARKN", "CRAFT",
            "BLOCK", "PIECE", "BOARD", "SCORE", "LEVEL", "SPEED", "SOUND", "MUSIC", "SOUNDS",
            "WORDS", "GAMES", "PLAYS", "TESTS", "STOPS", "POSTS", "STARS", "TIMES", "LINES",
            "WAVES", "GLOWS", "NEONS", "GRIDS", "FALLS", "DROPS", "TURNS", "LOCKS", "MOVES",
            "TEAMS", "WORKS", "CODES", "BLUES", "GOLDS", "FIRES", "WINDS", "RAINS", "SANDS",
            "LANDS", "LETTER", "LETTERS", "SYSTEM", "ENGINE", "ACTIVE", "PLAYER", "SCREEN",
            "PULSE", "NEONS", "CYBER", "RETRO"
        ]
        for w in fallback:
            words.add(w.upper())
            
    # Sort words for consistency
    sorted_words = sorted(list(words))
    
    # Write to words.js in the workspace directory
    output_path = os.path.join(os.getcwd(), "words.js")
    
    js_content = f"""// Auto-generated dictionary of 4-6 letter words.
// Total words: {len(sorted_words)}
const WORDS_DATA = "{','.join(sorted_words)}";
const DICTIONARY = new Set(WORDS_DATA.split(','));
"""
    
    try:
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(js_content)
        print(f"Successfully wrote {len(sorted_words)} words to {output_path}")
    except Exception as e:
        print(f"Error writing to words.js: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
