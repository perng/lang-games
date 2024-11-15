#!/usr/bin/env python3

import sys

def read_words_from_file(file_path):
    """Read words from a file and return as a list."""
    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            return [line.strip().lower() for line in file if line.strip()]
    except FileNotFoundError:
        print(f"Error: File '{file_path}' not found.")
        return []

def create_frequency_dict(frequency_file):
    """Create a dictionary with words and their frequency rank."""
    frequency_dict = {}
    words = read_words_from_file(frequency_file)
    for index, word in enumerate(words):
        frequency_dict[word.lower()] = index
    return frequency_dict

def sort_words_by_frequency(words_to_sort, frequency_dict):
    """Sort words based on their frequency ranking."""
    # Create a list of tuples (word, rank)
    # Words not in frequency_dict get a rank higher than the maximum possible rank
    max_rank = len(frequency_dict)
    word_ranks = [(word, frequency_dict.get(word.lower(), max_rank + 1)) 
                  for word in words_to_sort]
    
    # Sort based on rank
    sorted_words = [word for word, _ in sorted(word_ranks, key=lambda x: x[1])]
    return sorted_words

def main():
    # Check command line arguments
    if len(sys.argv) != 3:
        print("Usage: tools/sort_words.py <file_to_sort> <word_frequency>")
        return
    
    input_file = sys.argv[1]
    frequency_file = sys.argv[2]
    
    # Read words to sort
    words_to_sort = read_words_from_file(input_file)
    if not words_to_sort:
        return
    
    # Create frequency dictionary
    frequency_dict = create_frequency_dict(frequency_file)
    if not frequency_dict:
        return
    
    # Sort words
    sorted_words = sort_words_by_frequency(words_to_sort, frequency_dict)
    
    # Write sorted words to output file
    output_file = input_file.rsplit('.', 1)[0] + '_sorted.txt'
    try:
        with open(output_file, 'w', encoding='utf-8') as file:
            for word in sorted_words:
                file.write(word + '\n')
        print(f"Sorted words have been written to: {output_file}")
    except IOError:
        print(f"Error: Unable to write to file '{output_file}'")

if __name__ == "__main__":
    main()
