import os
import json
from openai import OpenAI
import argparse
from itertools import islice

sys_prompt = '''
Given a list of words, for each word and each of the word's defintion, generate vocabulary questions.   
Generate only the questions with no other text. Output in the following format:

[{"answer" : "arithmetic",
  "sentence": "Basic ______ skills, like addition and subtraction, are taught in elementary school.",
  "others" : ["grammar","geography","physics"],
  "id": "d90733c3c3c07c45e0c87bb06d1f2e8f"   
},
  ...
]
"id" is md5 hash of the sentence.
Masure sure there are 3 words in "others", and they are of the same type (verb, adj., etc.) as the answer but it should 
be obviously doesn't make sense in the sentence. Make the sentence longer to provide more context and make the answer more obvious.
Generate as much as possible till you hit the character limit.
The list of words are:  
'''

# read api key from file
with open('api_key.txt', 'r') as file:
    api_key = file.read().strip()

# Add argument parser
parser = argparse.ArgumentParser(description='Process words from JSON for annotation')
parser.add_argument('json_file', help='Path to JSON file containing word data')
parser.add_argument('output_file', help='Path to output file for JSON responses')
args = parser.parse_args()

# Read words from JSON file
try:
    with open(args.json_file, 'r', encoding='utf-8') as f:
        word_data = json.load(f)
        all_words = [item["word"] for item in word_data]
except FileNotFoundError:
    print(f"Error: JSON file {args.json_file} not found")
    exit(1)
except json.JSONDecodeError:
    print(f"Error: Invalid JSON format in {args.json_file}")
    exit(1)

# Process words in batches
BATCH_SIZE = 160
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
    # break
