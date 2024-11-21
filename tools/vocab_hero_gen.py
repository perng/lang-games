import os, time
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
  "others_zh_TW" : ["文法","地理","物理"],
  "id": "d90733c3c3c07c45e0c87bb06d1f2e8f"   
},
  ...
]
"answer" is the right answer to fill the blank. 
"sentence_zh_TW" is the whole sentence with the answer translated, make sure the wording conform to Chinese grammar.
"word_translation_zh_TW" is the translation of "answer"to traditional Chinese taking from "sentence_zh_TW". 
"id" is the md5 hash of the sentence.
Make sure there are 3 words in "others", and they are of the same type (verb, adj., etc.) as the answer but it should 
be obviously doesn't make sense in the sentence. Make the sentence longer to provide more context and make the answer more obvious. “others_zh_TW” contains the short Traditional Chinese translation of the 3 words in the “others with the same order. 
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

# Read input words from JSON file
try:
    with open(args.json_file, 'r', encoding='utf-8') as f:
        word_data = json.load(f)
        input_words = set(item["word"] for item in word_data)
except FileNotFoundError:
    print(f"Error: JSON file {args.json_file} not found")
    exit(1)
except json.JSONDecodeError:
    print(f"Error: Invalid JSON format in {args.json_file}")
    exit(1)

# Read existing output file or create empty array
main_json = []
if os.path.exists(args.output_file) and os.path.getsize(args.output_file) > 0:
    try:
        with open(args.output_file, 'r', encoding='utf-8') as f:
            main_json = json.load(f)
    except json.JSONDecodeError:
        print(f"Warning: Invalid JSON in {args.output_file}, starting with empty array")
        main_json = []

# Get words that already have questions
existing_words = {q["answer"] for q in main_json}

# Get initial words that need questions
words_needed = list(input_words - existing_words)
print(f"Found {len(words_needed)} words that need questions out of {len(input_words)} total words")

# Process words in batches
BATCH_SIZE = 50
client = OpenAI(api_key=api_key)

def save_snapshot():
    """Save the main JSON array to snapshot file"""
    with open('snapshot.json', 'w', encoding='utf-8') as f:
        json.dump(main_json, f, ensure_ascii=False, indent=2)

def save_final_output():
    """Save the main JSON array to the output file"""
    with open(args.output_file, 'w', encoding='utf-8') as f:
        json.dump(main_json, f, ensure_ascii=False, indent=2)

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
        # Get content and filter out empty lines and ``` lines
        content = response.choices[0].message.content
        cleaned_lines = [line.strip() for line in content.split('\n') 
                        if line.strip() and '```' not in line]
        cleaned_content = '\n'.join(cleaned_lines)
        
        # Fix double colons
        cleaned_content = cleaned_content.replace(": :", ":").replace("::", ":")
        
        # Try to parse as JSON
        try:
            new_questions = json.loads(cleaned_content)
            return new_questions
        except json.JSONDecodeError as e:
            # Save error content and current state
            with open('error.txt', 'w', encoding='utf-8') as f:
                f.write(cleaned_content)
            save_snapshot()
            print(f"Error parsing JSON response: {e}")
            print(f"Response content saved to error.txt")
            print(f"Current progress saved to snapshot.json. Remaining words: {len(words_needed)}")
            exit(1)
            
    except Exception as e:
        print(f"Error processing batch {word_batch}: {e}")
        return None

# Process words until none are left
while words_needed:
    # Take the first BATCH_SIZE words
    batch = words_needed[:BATCH_SIZE]
    print(f"Processing batch of {len(batch)} words: {batch}")
    
    new_questions = process_batch(batch)
    if new_questions:
        # Extend main JSON array with new questions
        main_json.extend(new_questions)
        print(f"Added {len(new_questions)} new questions")
        
        # Update words_needed by removing words that got questions
        new_answers = {q["answer"] for q in new_questions}
        words_needed = [w for w in words_needed if w not in new_answers]
        print(f"Remaining words to process: {len(words_needed)}")
        
        # Save snapshot after each successful batch
        save_snapshot()
        print(f"Progress saved to snapshot.json. Remaining words: {len(words_needed)}")
        time.sleep(5) # sleep 5 seconds to avoid rate limit

# Final save to output file
if len(words_needed) == 0:
    save_final_output()
    print(f"Processing complete. Total questions: {len(main_json)}")
    print(f"Final output saved to {args.output_file}")
else:
    print(f"Warning: {len(words_needed)} words still need questions")
    print("Remaining words:", words_needed)
    
     