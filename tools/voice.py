from gtts import gTTS
import os
import argparse

def generate_audio(word, text):
    # Generate audio for the word using gTTS
    tts = gTTS(text=word, lang='en')
    audio_file = f"{word}.mp3"
    tts.save(audio_file)
    print(f"Audio saved as {audio_file}")

if __name__ == "__main__":
    
    parser = argparse.ArgumentParser(description='Process words for annotation')
    parser.add_argument('word_file', help='Path to file containing words, one per line')
    args = parser.parse_args()
    try:
        with open(args.word_file, 'r') as f:
            all_words = [line.strip() for line in f if line.strip()]
    except FileNotFoundError:
        print(f"Error: Word file {args.word_file} not found")
        exit(1)
    for word in all_words:
        generate_audio(word, word)
