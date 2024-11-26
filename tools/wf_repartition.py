import json
import glob
import os
import random

def find_single_meaning_word(words, start_index):
    """Find the next word with exactly one meaning after the given index"""
    for i in range(start_index, len(words)):
        if len(words[i]['meanings']) == 1:
            return i
    return None

def main():
    # Create output directory if it doesn't exist
    os.makedirs('wf', exist_ok=True)
    
    # Set a fixed random seed for reproducibility
    random.seed(63)  # You can change this seed value if needed
    
    # Read and merge all input files
    merged_data = []
    input_files = sorted(glob.glob("../src/data/WordFlash/word_flash_level_?.json"))
    
    # Read all files and shuffle each file's contents
    for file_path in input_files:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            # Shuffle each file's data independently
            random.shuffle(data)
            merged_data.extend(data)
    
    
    # Create chunks with exactly 20 meanings each
    target_meanings = 20
    chunks = []
    current_chunk = []
    current_meaning_count = 0
    i = 0
    
    while i < len(merged_data):
        word = merged_data[i]
        meanings_count = len(word['meanings'])
        
        # If adding this word would exceed target
        if current_meaning_count + meanings_count > target_meanings:
            # Try to find a single-meaning word to swap with
            single_meaning_index = find_single_meaning_word(merged_data, i)
            
            if single_meaning_index and current_meaning_count + 1 == target_meanings:
                # Swap the words
                merged_data[i], merged_data[single_meaning_index] = \
                    merged_data[single_meaning_index], merged_data[i]
                word = merged_data[i]
                meanings_count = 1
            else:
                # If we can't find a suitable word to swap, finish this chunk
                chunks.append(current_chunk)
                current_chunk = []
                current_meaning_count = 0
                i -= 1  # Retry this word in the next chunk
        
        # Add word to current chunk
        current_chunk.append(word)
        current_meaning_count += meanings_count
        
        # If we've hit exactly 20 meanings, start a new chunk
        if current_meaning_count == target_meanings:
            chunks.append(current_chunk)
            current_chunk = []
            current_meaning_count = 0
        
        i += 1
    
    # Add the last chunk if it's not empty
    if current_chunk:
        chunks.append(current_chunk)
    
    # Write output files
    total_meanings = sum(len(word['meanings']) for word in merged_data)
    
    for i, chunk in enumerate(chunks, 1):
        output_file = f'wf/wf_level_{i:03d}.json'
        chunk_meaning_count = sum(len(word['meanings']) for word in chunk)
        print(f"Level {i:03d}: {len(chunk)} words, {chunk_meaning_count} meanings")
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(chunk, f, ensure_ascii=False, indent=2)
            
    print(f"\nProcessing complete. Created {len(chunks)} files.")
    print(f"Total words: {len(merged_data)}")
    print(f"Total meanings: {total_meanings}")
    print(f"Average meanings per level: {total_meanings/len(chunks):.1f}")

if __name__ == "__main__":
    main()
