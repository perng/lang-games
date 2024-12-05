import json
import os

# Read the source file
with open('src/data/VocabHero/vocab_hero_all.json', 'r', encoding='utf-8') as f:
    all_words = json.load(f)

# Create output directory if it doesn't exist
os.makedirs('src/data/VocabHero', exist_ok=True)

# Partition into chunks of 20
chunk_size = 20
word_chunks = [all_words[i:i + chunk_size] for i in range(0, len(all_words), chunk_size)]

# Create level metadata array
levels = []

# Process each chunk
for i, chunk in enumerate(word_chunks, 1):
    # Create level number with leading zeros
    level_num = str(i).zfill(3)
    
    # Save chunk to individual level file
    level_id = f'vocab_hero_level_{level_num}'

    with open(f'src/data/VocabHero/{level_id}.json', 'w', encoding='utf-8') as f:
        json.dump(chunk, f, indent=2, ensure_ascii=False)
    
    # Create level metadata
    # Get first 5 answers or all if less than 5
    title_words = [word['answer'] for word in chunk[:5]]
    title = f"[{'], ['.join(title_words)}]"
    
    level_info = {
        "id": f"vocab_hero_level_{level_num}",
        "game_type": "vocab_hero",
        "title": title,
        "description": f"Level {i}"
    }
    levels.append(level_info)

# Save levels metadata file
with open('public/data/VocabHero/vh_levels.json', 'w', encoding='utf-8') as f:
    json.dump(levels, f, indent=2, ensure_ascii=False)
