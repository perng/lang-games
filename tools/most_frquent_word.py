# Import necessary library
import os

# Define file paths
wordfreq_path = '../src/data/wordflash/wordfreq.txt'
vocab_sample_path = '../experimental/vocab_sample.txt'

# Read word frequency list
def load_word_frequency(filepath):
    word_freq = {}
    try:
        with open(filepath, 'r') as file:
            for rank, line in enumerate(file):
                word = line.strip()
                word_freq[word] = rank  # Store the rank (lower is more frequent)
    except FileNotFoundError:
        print(f"File not found: {filepath}")
    return word_freq

# Read vocab sample list
def load_vocab_sample(filepath):
    vocab_sample = []
    try:
        with open(filepath, 'r') as file:
            vocab_sample = [line.strip() for line in file]
    except FileNotFoundError:
        print(f"File not found: {filepath}")
    return vocab_sample

# Find the most frequent word in the sample based on frequency data
def find_most_frequent(word_freq, vocab_sample):
    most_frequent_word = None
    highest_rank = float('inf')  # Lower rank is better

    for word in vocab_sample:
        if word in word_freq and word_freq[word] < highest_rank:
            most_frequent_word = word
            highest_rank = word_freq[word]

    return most_frequent_word

# Main execution
if __name__ == "__main__":
    # Load data
    word_freq = load_word_frequency(wordfreq_path)
    vocab_sample = load_vocab_sample(vocab_sample_path)

    # Find and display the most frequent word
    most_frequent_word = find_most_frequent(word_freq, vocab_sample)

    if most_frequent_word:
        print(f"The most frequent word in the sample is: {most_frequent_word}")
    else:
        print("No frequent word found in the sample.")
