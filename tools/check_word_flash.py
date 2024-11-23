import json
import argparse
import csv

def flatten_meanings(entry):
    """Extract and flatten meanings from an entry."""
    word = entry.get('word', '')
    meanings_list = entry.get('meanings', [])
    
    # Collect all meaning_zh_TW and wrong_meaning_zh_TW
    meanings_zh = []
    wrong_meanings = []
    
    for meaning in meanings_list:
        if 'meaning_zh_TW' in meaning:
            meanings_zh.append(f"'{meaning['meaning_zh_TW']}'")
        if 'wrong_meaning_zh_TW' in meaning:
            wrong_meanings.extend([f"'{w}'" for w in meaning['wrong_meaning_zh_TW']])
    
    return {
        'word': f"'{word}'",
        'meanings_zh': meanings_zh,
        'wrong_meanings': wrong_meanings
    }

def main():
    parser = argparse.ArgumentParser(description='Export word flash entries to CSV')
    parser.add_argument('input_file', help='Path to input JSON file')
    parser.add_argument('output_file', help='Path to output CSV file')
    args = parser.parse_args()

    # Read input file
    try:
        with open(args.input_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except FileNotFoundError:
        print(f"Error: Input file {args.input_file} not found")
        exit(1)
    except json.JSONDecodeError:
        print(f"Error: Invalid JSON in {args.input_file}")
        exit(1)

    # Process entries
    flattened_entries = [flatten_meanings(entry) for entry in data]
    
    # Write to CSV
    with open(args.output_file, 'w', encoding='utf-8', newline='') as csvfile:
        fieldnames = ['word', 'translations', 'delim', 'wrong_translations']
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        
        writer.writeheader()
        for entry in flattened_entries:
            writer.writerow({
                'word': entry['word'],
                'translations': ', '.join(entry['meanings_zh']),
                'delim': ' --- ',
                'wrong_translations': ', '.join(entry['wrong_meanings'])
            })
            
    print(f"CSV file created: {args.output_file}")

if __name__ == "__main__":
    main() 