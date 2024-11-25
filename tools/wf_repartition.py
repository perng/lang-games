import json
import glob
import os
import random

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
    
    
    # Repartition into chunks
    chunk_size = 20
    chunks = [merged_data[i:i + chunk_size] for i in range(0, len(merged_data), chunk_size)]
    
    # Write output files
    for i, chunk in enumerate(chunks, 1):
        output_file = f'wf/wf_level_{i:03d}.json'
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(chunk, f, ensure_ascii=False, indent=2)
            
    print(f"Processing complete. Created {len(chunks)} files with {len(merged_data)} total words.")
    print(f"Each level contains {chunk_size} words (except possibly the last level).")

if __name__ == "__main__":
    main()
