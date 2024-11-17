import azure.cognitiveservices.speech as speechsdk
import os
import argparse
import json
import base64
import time
import random
from datetime import datetime

def get_speech_config():
    speech_key = os.environ.get('AZURE_SPEECH_KEY')
    service_region = os.environ.get('AZURE_SPEECH_REGION')
    
    if not speech_key or not service_region:
        raise ValueError("Please set AZURE_SPEECH_KEY and AZURE_SPEECH_REGION environment variables")
    
    return speechsdk.SpeechConfig(subscription=speech_key, region=service_region)

def get_available_voices():
    speech_config = get_speech_config()
    synthesizer = speechsdk.SpeechSynthesizer(speech_config=speech_config)
    
    # Get the list of voices
    result = synthesizer.get_voices_async().get()
    
    if result.reason == speechsdk.ResultReason.VoicesListRetrieved:
        en_voices = []
        zh_voices = []
        for voice in result.voices:
            if voice.locale.startswith('en-') and 'Neural' in voice.short_name:
                en_voices.append(voice.short_name)
            elif voice.locale == 'zh-TW' and 'Neural' in voice.short_name:
                zh_voices.append(voice.short_name)
        return en_voices, zh_voices
    else:
        print(f"Error getting voices: {result.reason}")
        return [], []

def generate_english_audio(word, output_dir, en_voices):
    audio_file = os.path.join(output_dir, f"{word}.mp3")
    
    # Skip if file already exists
    if os.path.exists(audio_file):
        print(f"Skipping existing English audio: {word} -> {audio_file}")
        return
    
    speech_config = get_speech_config()
    # Randomly select an English voice
    voice_name = random.choice(en_voices)
    speech_config.speech_synthesis_voice_name = voice_name
    
    audio_config = speechsdk.audio.AudioOutputConfig(filename=audio_file)
    synthesizer = speechsdk.SpeechSynthesizer(speech_config=speech_config, audio_config=audio_config)
    
    max_retries = 3
    for attempt in range(max_retries):
        try:
            result = synthesizer.speak_text_async(word).get()
            
            if result.reason == speechsdk.ResultReason.SynthesizingAudioCompleted:
                print(f"English audio saved: {word} -> {audio_file} (Voice: {voice_name})")
                return
            else:
                print(f"Error generating English audio for {word}: {result.reason}")
                if result.reason == speechsdk.ResultReason.Canceled:
                    try:
                        cancellation_details = speechsdk.CancellationDetails(result)
                        print(f"Error details: {cancellation_details.reason}")
                        print(f"Error details: {cancellation_details.error_details}")
                    except Exception as e:
                        print(f"Failed to get cancellation details: {e}")
                
                if attempt < max_retries - 1:
                    print(f"Retrying in 10 seconds... (Attempt {attempt + 1}/{max_retries})")
                    time.sleep(10)
                
        except Exception as e:
            print(f"Unexpected error generating audio for {word}: {e}")
            if attempt < max_retries - 1:
                print(f"Retrying in 10 seconds... (Attempt {attempt + 1}/{max_retries})")
                time.sleep(10)

def generate_chinese_audio(text, output_dir, zh_voices):
    safe_filename = base64.b64encode(text.encode('utf-8')).decode('utf-8')
    safe_filename = safe_filename.replace('/', '_').replace('+', '-').replace('=', '')
    audio_file = os.path.join(output_dir, f"{safe_filename}.mp3")
    
    # Skip if file already exists
    if os.path.exists(audio_file):
        print(f"Skipping existing Chinese audio: {text} -> {audio_file}")
        return
    
    speech_config = get_speech_config()
    voice_name = random.choice(zh_voices)
    speech_config.speech_synthesis_voice_name = voice_name
    
    audio_config = speechsdk.audio.AudioOutputConfig(filename=audio_file)
    synthesizer = speechsdk.SpeechSynthesizer(speech_config=speech_config, audio_config=audio_config)
    
    max_retries = 3
    for attempt in range(max_retries):
        try:
            result = synthesizer.speak_text_async(text).get()
            
            if result.reason == speechsdk.ResultReason.SynthesizingAudioCompleted:
                print(f"Chinese audio saved: {text} -> {audio_file} (Voice: {voice_name})")
                return
            else:
                print(f"Error generating Chinese audio for {text}: {result.reason}")
                if result.reason == speechsdk.ResultReason.Canceled:
                    try:
                        cancellation_details = speechsdk.CancellationDetails(result)
                        print(f"Error details: {cancellation_details.reason}")
                        print(f"Error details: {cancellation_details.error_details}")
                    except Exception as e:
                        print(f"Failed to get cancellation details: {e}")
                
                if attempt < max_retries - 1:
                    print(f"Retrying in 10 seconds... (Attempt {attempt + 1}/{max_retries})")
                    time.sleep(10)
                
        except Exception as e:
            print(f"Unexpected error generating audio for {text}: {e}")
            if attempt < max_retries - 1:
                print(f"Retrying in 10 seconds... (Attempt {attempt + 1}/{max_retries})")
                time.sleep(10)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Generate voice files using Azure Speech Service')
    parser.add_argument('json_file', help='Path to JSON file containing words and translations')
    parser.add_argument('output_dir', help='Output directory for audio files')
    parser.add_argument('--start', help='Start processing from this word (skip all words before it)', default=None)
    args = parser.parse_args()
    
    # Get available voices
    print("Fetching available voices...")
    en_voices, zh_voices = get_available_voices()
    
    if not en_voices or not zh_voices:
        print("Error: Could not retrieve voices list")
        exit(1)
    
    print(f"Found {len(en_voices)} English voices and {len(zh_voices)} Chinese voices")
    print("English voices:", en_voices)
    print("Chinese voices:", zh_voices)
    
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
    
    # Find start index if start_word is provided
    start_index = 0
    if args.start:
        for i, word_entry in enumerate(word_data):
            if word_entry['word'] == args.start:
                start_index = i
                print(f"Starting from word: {args.start} (index: {start_index})")
                break
        else:
            print(f"Warning: Start word '{args.start}' not found in word list")
    
    # Process each word in the JSON file, starting from start_index
    for word_entry in word_data[start_index:]:
        word = word_entry['word']
        generate_english_audio(word, args.output_dir, en_voices)
        
        for meaning in word_entry['meanings']:
            chinese_text = meaning['meaning_zh_TW']
            generate_chinese_audio(chinese_text, chinese_output_dir, zh_voices)
            time.sleep(0.5)  # Rate limiting