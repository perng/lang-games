from gtts import gTTS
import os
import argparse
import json
import base64
import time

def generate_english_audio(word, output_dir):
    # Generate audio for the word using gTTS
    tts = gTTS(text=word, lang='en')
    audio_file = os.path.join(output_dir, f"{word}.mp3")
    tts.save(audio_file)
    print(f"English audio saved: {word} -> {audio_file}")

def generate_chinese_audio(text, output_dir):
    # Encode the Chinese text to create a safe filename
    safe_filename = base64.b64encode(text.encode('utf-8')).decode('utf-8')
    safe_filename = safe_filename.replace('/', '_').replace('+', '-').replace('=', '')
    
    # Generate audio with path joined to output directory
    tts = gTTS(text=text, lang='zh-TW')
    audio_file = os.path.join(output_dir, f"{safe_filename}.mp3")
    tts.save(audio_file)
    print(f"Chinese audio saved: {text} -> {audio_file}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Generate voice files for English words and Chinese translations')
    parser.add_argument('json_file', help='Path to JSON file containing words and translations')
    parser.add_argument('output_dir', help='Output directory for audio files')
    args = parser.parse_args()
    
    # Create output directories
    os.makedirs(args.output_dir, exist_ok=True)
    chinese_output_dir = os.path.join(args.output_dir, 'chinese')
    os.makedirs(chinese_output_dir, exist_ok=True)
    
    try:
        with open(args.json_file, 'r', encoding='utf-8') as f:
            word_data = json.load(f)
    except FileNotFoundError:
        print(f"Error: JSON file {args.json_file} not found")
        exit(1)
    except json.JSONDecodeError:
        print(f"Error: Invalid JSON file {args.json_file}")
        exit(1)
    
    # Process each word in the JSON file
    for word_entry in word_data:
        # Generate English audio for the word
        word = word_entry['word']
        generate_english_audio(word, args.output_dir)
        
        # Generate Chinese audio for each meaning
        for meaning in word_entry['meanings']:
            chinese_text = meaning['meaning_zh_TW']
            generate_chinese_audio(chinese_text, chinese_output_dir) 
        time.sleep(1)