import json
import glob
import os

def main():
    # Create output directory if it doesn't exist
    os.makedirs('wf', exist_ok=True)
    
    # Read and merge all input files
    merged_data = []
    input_files = sorted(glob.glob("../src/data/WordFlash/word_flash_level_?.json"))
    
    for file_path in input_files:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            merged_data.extend(data)
    
    # Repartition into chunks of 40
    chunk_size = 100
    chunks = [merged_data[i:i + chunk_size] for i in range(0, len(merged_data), chunk_size)]
    
    # Write output files
    for i, chunk in enumerate(chunks, 1):
        output_file = f'wf/wf_level_{i:03d}.json'
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(chunk, f, ensure_ascii=False, indent=2)
            
    print(f"Processing complete. Created {len(chunks)} files.")

if __name__ == "__main__":
    main()
