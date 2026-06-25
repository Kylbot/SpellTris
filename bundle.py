import re
import os

def bundle_game():
    print("Bundling SpellTris Game into a single self-contained HTML file...")
    try:
        with open("index.html", "r", encoding="utf-8") as f:
            html = f.read()
        with open("style.css", "r", encoding="utf-8") as f:
            css = f.read()
        with open("vocab.js", "r", encoding="utf-8") as f:
            vocab = f.read()
        with open("game.js", "r", encoding="utf-8") as f:
            game = f.read()
    except Exception as e:
        print(f"Error reading game files: {e}")
        return

    # Replace CSS
    html = re.sub(r'<link rel="stylesheet" href="style.css">', lambda m: f'<style>\n{css}\n</style>', html)
    # Replace JS
    html = re.sub(r'<script src="vocab.js"></script>\s*<script src="game.js"></script>', lambda m: f'<script>\n{vocab}\n\n{game}\n</script>', html)

    output_file = "spelltris.html"
    try:
        with open(output_file, "w", encoding="utf-8") as f:
            f.write(html)
        print(f"Successfully created: {os.path.abspath(output_file)}")
    except Exception as e:
        print(f"Error writing game bundle: {e}")

def bundle_simulator():
    print("Bundling SpellTris Simulator into a single self-contained HTML file...")
    try:
        with open("test_player.html", "r", encoding="utf-8") as f:
            html = f.read()
        with open("style.css", "r", encoding="utf-8") as f:
            css = f.read()
        with open("words.js", "r", encoding="utf-8") as f:
            words = f.read()
        with open("test_player.js", "r", encoding="utf-8") as f:
            sim = f.read()
    except Exception as e:
        print(f"Error reading simulator files: {e}")
        return

    # Replace CSS
    html = re.sub(r'<link rel="stylesheet" href="style.css">', lambda m: f'<style>\n{css}\n</style>', html)
    # Replace JS
    html = re.sub(r'<script src="words.js"></script>\s*<script src="test_player.js"></script>', lambda m: f'<script>\n{words}\n\n{sim}\n</script>', html)

    output_file = "test_player_standalone.html"
    try:
        with open(output_file, "w", encoding="utf-8") as f:
            f.write(html)
        print(f"Successfully created: {os.path.abspath(output_file)}")
    except Exception as e:
        print(f"Error writing simulator bundle: {e}")

if __name__ == "__main__":
    bundle_game()
    bundle_simulator()
