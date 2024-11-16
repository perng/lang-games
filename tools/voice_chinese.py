from gtts import gTTS
import os
import argparse
import base64
import urllib.parse

def generate_audio(phrase, text):
    # Encode the Chinese text to create a safe filename
    safe_filename = base64.b64encode(text.encode('utf-8')).decode('utf-8')
    # Remove any special characters that might cause issues in filenames
    safe_filename = safe_filename.replace('/', '_').replace('+', '-').replace('=', '')
    
    # Generate audio
    tts = gTTS(text=text, lang='zh-TW')
    audio_file = f"{safe_filename}.mp3"
    tts.save(audio_file)
    print(f"Original text: {text}")
    print(f"Audio saved as {audio_file}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Process Chinese phrases for audio generation')
    parser.add_argument('phrase_file', help='Path to file containing Chinese phrases, one per line')
    args = parser.parse_args()
    
    try:
        with open(args.phrase_file, 'r', encoding='utf-8') as f:
            all_phrases = [line.strip() for line in f if line.strip()]
    except FileNotFoundError:
        print(f"Error: Phrase file {args.phrase_file} not found")
        exit(1)
        
    for phrase in all_phrases:
        generate_audio(phrase, phrase)
