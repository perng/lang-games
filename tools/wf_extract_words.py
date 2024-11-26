import json
import glob
import os

def main():
    # Get all word flash level files
    input_files = sorted(glob.glob("../src/data/WordFlash/wf_level_*.json"))
    
    # Write to output file
    with open('wordflash_words.txt', 'w', encoding='utf-8') as outfile:
        for file_path in input_files:
            with open(file_path, 'r', encoding='utf-8') as infile:
                data = json.load(infile)
                outfile.write(f"{file_path}\n")
                for entry in data:
                    outfile.write(f"{entry['word']}\n")
                outfile.write("\n")  # Add blank line between levels
    
    print(f"Extracted words from {len(input_files)} files to wordflash_words.txt")

if __name__ == "__main__":
    main()