import json
import sys

def simplify_json(input_file, output_file):
    # Read the JSON file
    with open(input_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # Process each word entry
    for word_entry in data:
        # Process each meaning
        for meaning in word_entry['meanings']:
            # Remove specified fields
            fields_to_remove = ['type', 'meaning_en_US', 'examples', 'synonyms', 'confusion']
            for field in fields_to_remove:
                meaning.pop(field, None)
    
        # Remove the confusion field from the main word entry
        word_entry.pop('confusion', None)
    
    # Write the simplified JSON to output file
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write('[\n')
        for i, entry in enumerate(data):
            # Convert each entry to JSON string without whitespace
            json_line = json.dumps(entry, ensure_ascii=False, separators=(',', ':'))
            # Add comma for all entries except the last one
            f.write(json_line + (',' if i < len(data) - 1 else '') + '\n')
        f.write(']')

# Check if correct number of arguments is provided
if len(sys.argv) != 3:
    print("Usage: python reduce_word_flash.py <input_file> <output_file>")
    sys.exit(1)

# Get input and output files from command line arguments
input_file = sys.argv[1]
output_file = sys.argv[2]
simplify_json(input_file, output_file)