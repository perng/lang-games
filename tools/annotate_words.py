import os
from openai import OpenAI
import argparse
from itertools import islice

sys_prompt = '''
Given a list of words, generate a JSON file, and no other text in the following format

[{"word": "arm",
  "meanings": [
            {"type": "名詞",
            "meaning_en_US": "The part of the human body extending from the shoulder to the wrist.",             
             "meaning_zh_TW": "手臂",
             "wrong_meaning_zh_TW": ["火腿","零件","鬧鈴"],
             "examples": [{"sentence": "She lifted her [arm] to wave.",
                          "translation_zh_TW": "她舉起手揮揮"},...],
             "synonyms": ["limb", "upper limb"]
            },
            {"type": "名詞",
              "meaning_en_US": "An extension or branch of something, often describing a division or part of an organization.",
             "meaning_zh_TW": "分支、部門",
             "wrong_meaning_zh_TW": ["主管、經理”,“運動、練習”, “手杖、拐杖"],
             "examples": [{"sentence": "The organization has an educational [arm].",
                          "translation_zh_TW": "該機構有個教育部門"},...],
              "synonyms": ["branch", “wing”]
              },
{"type": "名詞",
              "meaning_en_US": "An extension or branch of something, often describing a division or part of an organization.",
             "meaning_zh_TW": "分支、部門",
             "wrong_meaning_zh_TW": ["主管、經理”,“運動、練習”, “手杖、拐杖"],
             "examples": [{"sentence": "The organization has an educational [arm].",
                          "translation_zh_TW": "該機構有個教育部門"},...],
              "synonyms": ["branch", “wing”]
              } 
            }],
“confusion”: [“army”, “armory”, “armchair”]

}, ]            

"type" can be "名詞", "動詞", "形容詞", etc.  
“Meanings” are the definitions of the word, one entry each. In each entry, "meaning_en_US" is its meaning in English, "meaning_zh_TW" is that Traditional Chinese, this field should include the wording used in the example sentences in the “examples” field. "wrong_meaning_zh_TW" should contain 3 Chinese phrases that are NOT the meaning of the word and should be very different from each other, they should be about the same length as the correct meaning in Chinese.  
The “examples” field contains 3 entries. The "sentence" would be a sample sentence with the word. The word in the sentence should be surrounded with square brackets. "translation_zh_TW" is the translation of the sentence to traditional Chinese. 
“confusion” should contain at least 4 words that are words with a similar spelling, or non-words that are similar but with spelling errors that would easily confuse people. 


Generate as much as possible till you hit the character limit.
The list of words to generate the JSON are:  
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
BATCH_SIZE = 6
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
