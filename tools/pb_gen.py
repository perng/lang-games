import os, time
import json
from openai import OpenAI
import argparse
from itertools import islice

BATCH_SIZE = 40

sys_prompt = '''
Given a list of phrases, generate a JSON file, and no other text in the following format
[
  {
    "word": "act out",
    "meanings": [
      {
        "type": "動詞片語",
        "meaning_en_US": "To express or perform something, typically an emotion or behavior, in an exaggerated way.",
        "meaning_zh_TW": "表現過度、誇張地表現情緒或行為",
        "wrong_meaning_zh_TW": ["安靜不動", "遵守規則", "做戲、扮演"],
        "examples": [
          {
            "sentence": "He tends to [act out] when he doesn't get his way.",
            "translation_zh_TW": "當他無法如願時，他會表現得過度",
            "others": ["keep out", "top off", "run across"]
          },
          {
            "sentence": "The children [acted out] during the long trip.",
            "translation_zh_TW": "在漫長的旅程中，孩子們表現得過度",
            "others": ["threw out", "finished off", "run across"]
          },
          {
            "sentence": "She [acted out] her frustration by yelling.",
            "translation_zh_TW": "她通過大喊來表現她的沮喪",
            "others": ["pinned down", "cleared up", "ran across"]
          }
        ],
        "synonyms": ["exaggerate", "overreact"]
      }
    ]
  },...]            

"type" can be "名詞片語", "動詞片語",, etc.  
“Meanings” are the definitions of the phrase, one entry each. In each entry, "meaning_en_US" is its meaning in English, 
"meaning_zh_TW" is the terse Traditional Chinese translation of the phrase, this field should include the wording used in the example sentences in the “examples” field. 
"wrong_meaning_zh_TW" should contain 3 Chinese phrases that are NOT the meaning of the word and should be very different from each other, 
they should be about the same length as the correct meaning in Chinese.  
The “examples” field contains 3 entries. The "sentence" would be a sample sentence with the phrase where the 
phrase can be adjusted for tense or singular/plural, or other necessary grammartical changes like put a noun or pronoun in the middle 
(e.g. "count out" -> "count someone out"). 
The phrse in the sentence should be surrounded with square brackets. "translation_zh_TW" is the translation of the sentence to traditional 
Chinese. "others" are 3 other phrases that are NOT gramatically nor semantically correct phrases, to be used as wrong answers for multiple choice questions.

Generate as much as possible till you hit the character limit.
The list of words to generate the JSON are:  

'''

# read api key from file
with open('api_key.txt', 'r') as file:
    api_key = file.read().strip()

# Add argument parser
parser = argparse.ArgumentParser(description='Process words from text file for annotation')
parser.add_argument('input_file', help='Path to text file containing words/phrases')
parser.add_argument('output_file', help='Path to output file for JSON responses')
args = parser.parse_args()

# Read input words from text file
try:
    with open(args.input_file, 'r', encoding='utf-8') as f:
        input_words = [line.strip() for line in f if line.strip()]
except FileNotFoundError:
    print(f"Error: Text file {args.input_file} not found")
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

# Get words that already have questions (keep as set for efficient lookup)
existing_words = {q["word"] for q in main_json}
print(f"Found {len(existing_words)} words that already have questions")

# Get initial words that need questions (maintain order from input_words)
words_needed = [w for w in input_words if w not in existing_words]
print(f"Found {len(words_needed)} words that need questions out of {len(input_words)} total words")

# Process words in batches

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
    word_batch = [f'"{word}"' for word in word_batch]   
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
            with open('error.json', 'w', encoding='utf-8') as f:
                f.write(cleaned_content)
            save_snapshot()
            print(f"Error parsing JSON response: {e}")
            print(f"Response content saved to error.json")
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
        new_answers = {q["word"] for q in new_questions}
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
    
     