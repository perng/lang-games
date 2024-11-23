import json
import sys

def merge_json_files(main_file, fix_file, output_file):
    # Read the main JSON file
    with open(main_file, 'r', encoding='utf-8') as f:
        main_data = json.load(f)
    
    # Read the fix JSON file and filter out invalid entries
    with open(fix_file, 'r', encoding='utf-8') as f:
        fix_data = json.load(f)
        # Only keep entries where all meanings have at least 3 wrong meanings
        fix_data = [
            item for item in fix_data 
            if all(len(meaning.get('wrong_meaning_zh_TW', [])) >= 3 
                  for meaning in item['meanings'])
        ]
    
    # Create a dictionary from fix_data for easier lookup
    fix_dict = {item['word']: item for item in fix_data}
    
    # Update main_data with fix_data, but only for specific fields
    for item in main_data:
        if item['word'] in fix_dict:
            fix_item = fix_dict[item['word']]
            
            # Handle meanings array specially
            if 'meanings' in fix_item:
                for fix_meaning in fix_item['meanings']:
                    # For each meaning in the fix file, update only the specified fields
                    # while preserving other fields in the original meanings
                    for main_meaning in item['meanings']:
                        for key, value in fix_meaning.items():
                            main_meaning[key] = value
                            
            # Handle any other top-level fields (if they exist in the future)
            for key, value in fix_item.items():
                if key not in ['word', 'meanings']:  # Skip word and meanings as they're handled specially
                    item[key] = value
    
    # Write the merged data to output file
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(main_data, f, ensure_ascii=False, indent=2)

# Check if correct number of arguments is provided
if len(sys.argv) != 4:
    print("Usage: python fix_word_flash.py <main_json> <fix_json> <output_file>")
    sys.exit(1)

# Get input and output files from command line arguments
main_file = sys.argv[1]
fix_file = sys.argv[2]
output_file = sys.argv[3]

merge_json_files(main_file, fix_file, output_file)