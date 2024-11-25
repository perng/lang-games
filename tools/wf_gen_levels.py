import json
import glob

def main():
    # Read all word files
    word_files = sorted(glob.glob("../src/data/WordFlash/wf_level_*.json"))

    levels = []
    for i, word_file in enumerate(word_files, 1):
        # Read the first word from each file
        with open(word_file, 'r', encoding='utf-8') as f:
            words = json.load(f)
            first_word = words[0]['word'].capitalize()
        
        # Create level entry
        level = {
            "id": f"word_flash_level_{i:03d}",
            "game_type": "word_flash",
            "title": first_word ,
            "description": f"Level {i}",
            "wordFile": f"wf_level_{i:03d}.json"
        }
        levels.append(level)
    
    # Write the levels file
    with open('../public/data/WordFlash/levels.json', 'w', encoding='utf-8') as f:
        json.dump(levels, f, ensure_ascii=False, indent=2)

if __name__ == "__main__":
    main()