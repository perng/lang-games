import json
import glob
import os

def split_phrases():
    input_file = "../src/data/phraseboss/phrases.json"
    
    # Read all files and sort according to word frequency
    with open(input_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # Split the JSON into 20 phrases each, output to phrase_boss_level_?.json where ? is the level number should be 3 digits
    for i in range(0, len(data), 20):
        chunk = data[i:i+20]
        output_file = f"../src/data/phraseboss/phrase_boss_level_{i//20+1:03d}.json"
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(chunk, f, ensure_ascii=False, indent=2)

def generate_levels():
    # Read all phrase boss files
    phrase_files = sorted(glob.glob("../src/data/phraseboss/phrase_boss_level_*.json"))

    levels = []
    for i, phrase_file in enumerate(phrase_files, 1):
        # Read the first phrase from each file
        with open(phrase_file, 'r', encoding='utf-8') as f:
            phrases = json.load(f)
            print(phrases[0]['word'])
            first_phrase = phrases[0]['meanings'][0]['examples'][0]['sentence']
        
        # Create level entry
        level = {
            "id": f"phrase_boss_level_{i:03d}",
            "game_type": "phraseboss",
            "title": first_phrase,
            "description": f"Level {i}",
            "wordFile": f"phrase_boss_level_{i:03d}.json"
        }
        levels.append(level)
    
    print(len(levels))

    # Ensure the output directory exists
    os.makedirs('../public/data/phraseboss', exist_ok=True)

    # Write the levels file
    with open('../public/data/phraseboss/levels.json', 'w', encoding='utf-8') as f:
        json.dump(levels, f, ensure_ascii=False, indent=2)

def main():
    split_phrases()
    generate_levels()

if __name__ == "__main__":
    main()
