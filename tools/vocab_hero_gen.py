import os
from openai import OpenAI
import argparse
from itertools import islice

sys_prompt = '''
Given a list of words, generate vocabulary questions, two questions for each word. 
Generate only the questions with no other text. Outputin the following format

[{"sentence": "Basic ______ skills, like addition and subtraction, are taught in elementary school.",
  "answer" : "arithmetic",
  "others" : ["grammar","geography","physics"]
},
  ...
]            

Generate as much as possible till you hit the character limit.
The list of words are:  
'''
# read api key from file
with open('api_key.txt', 'r') as file:
    api_key = file.read().strip()

# Define the query for the GPT-4 model

# Add argument parser
parser = argparse.ArgumentParser(description='Process words for annotation')
parser.add_argument('word_file', help='Path to file containing words, one per line')
parser.add_argument('output_file', help='Path to output file for JSON responses')
args = parser.parse_args()

# Read words from file
try:
    with open(args.word_file, 'r') as f:
        all_words = [line.strip() for line in f if line.strip()]
except FileNotFoundError:
    print(f"Error: Word file {args.word_file} not found")
    exit(1)

# Process words in batches
BATCH_SIZE = 200
client = OpenAI(api_key=api_key)

def process_batch(word_batch):
    words_str = '\n'.join(word_batch)
    try:
        response = client.chat.completions.create(
            messages=[{
                "role": "user",
                "content": sys_prompt + words_str,
            }],
            model="gpt-4o-mini",
        )
        return response.choices[0].message.content
    except Exception as e:
        print(f"Error processing batch {word_batch}: {e}")
        return None

# Process all words in batches
for i in range(0, len(all_words), BATCH_SIZE):
    batch = all_words[i:i + BATCH_SIZE]
    print(f"Processing batch {i//BATCH_SIZE + 1}: {batch}")
    
    response = process_batch(batch)
    if response:
        with open(args.output_file, "a") as file:
            file.write(response + "\n")
        print(f"Batch {i//BATCH_SIZE + 1} saved to {args.output_file}")
    break
