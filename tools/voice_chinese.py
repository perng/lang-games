from gtts import gTTS
import os
import argparse

def generate_audio(phrase, text):
    # Generate audio for Chinese phrases using zh-TW (Traditional Chinese)
    tts = gTTS(text=text, lang='zh-TW')
    audio_file = f"{phrase}.mp3"
    tts.save(audio_file)
    print(f"Audio saved as {audio_file}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Process Chinese phrases for audio generation')
    parser.add_argument('phrase_file', help='Path to file containing Chinese phrases, one per line')
    args = parser.parse_args()
    
    try:
        with open(args.phrase_file, 'r', encoding='utf-8') as f:  # Added utf-8 encoding
            all_phrases = [line.strip() for line in f if line.strip()]
    except FileNotFoundError:
        print(f"Error: Phrase file {args.phrase_file} not found")
        exit(1)
        
    for phrase in all_phrases:
        generate_audio(phrase, phrase)
