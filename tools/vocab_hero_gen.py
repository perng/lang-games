import os
import json
from openai import OpenAI
import argparse
from itertools import islice

sys_prompt = '''
Given a list of words, for each word and each definition of the word, generate vocabulary questions.   
Generate only the questions with no other text. Output in the following format:

[{"answer" : "arithmetic",
  "word_translation_zh_TW": "算術",
  "sentence_zh_TW" : "基本的算術技能，​​如加法和減法，是在小學教授的。",
  "sentence": "Basic ______ skills, like addition and subtraction, are taught in elementary school.",
  "others" : ["grammar","geography","physics"],
  "id": "d90733c3c3c07c45e0c87bb06d1f2e8f"   
},
  ...
]
"answer" is the right answer to fill the blank. "word_translation_zh_TW" is the translation of "answer"to traditional Chinese. "sentence_zh_TW" is the whole sentence with the answer translated.
"id" is the md5 hash of the sentence.
Make sure there are 3 words in "others", and they are of the same type (verb, adj., etc.) as the answer but it should 
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
parser.add_argument('--previous', help='Path to previous questions JSON file', default=None)
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

# After parsing args, load previous answers if file provided
previous_answers = set()
if args.previous:
    try:
        with open(args.previous, 'r', encoding='utf-8') as f:
            previous_data = json.load(f)
            print("First few items from previous data:", previous_data[:2])
            
            previous_answers = {q["answer"] for q in previous_data}
            print("First few answers extracted:", list(previous_answers)[:5])
            print(f"Loaded {len(previous_answers)} previous answers")
    except Exception as e:
        print(f"Error loading previous questions file: {e}")
        exit(1)

# Filter words that haven't been used before
all_words = [item["word"] for item in word_data]
if previous_answers:
    new_words = [w for w in all_words if w not in previous_answers]
    print(f"Found {len(new_words)} new words out of {len(all_words)} total words")
    all_words = new_words

# Process words in batches
BATCH_SIZE = 100
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

