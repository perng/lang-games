import azure.cognitiveservices.speech as speechsdk
import os
import argparse
import time
import random

def get_speech_config():
    speech_key = os.environ.get('AZURE_SPEECH_KEY')
    service_region = os.environ.get('AZURE_SPEECH_REGION')
    
    if not speech_key or not service_region:
        raise ValueError("Please set AZURE_SPEECH_KEY and AZURE_SPEECH_REGION environment variables")
    
    return speechsdk.SpeechConfig(subscription=speech_key, region=service_region)

def get_english_voices():
    speech_config = get_speech_config()
    synthesizer = speechsdk.SpeechSynthesizer(speech_config=speech_config)
    
    result = synthesizer.get_voices_async().get()
    
    if result.reason == speechsdk.ResultReason.VoicesListRetrieved:
        en_voices = [voice.short_name for voice in result.voices 
                    if voice.locale.startswith('en-') and 'Neural' in voice.short_name]
        return en_voices
    else:
        print(f"Error getting voices: {result.reason}")
        return []

def generate_audio(text, output_file, voice_name):
    speech_config = get_speech_config()
    speech_config.speech_synthesis_voice_name = voice_name
    
    audio_config = speechsdk.audio.AudioOutputConfig(filename=output_file)
    synthesizer = speechsdk.SpeechSynthesizer(speech_config=speech_config, audio_config=audio_config)
    
    try:
        result = synthesizer.speak_text_async(text).get()
        
        if result.reason == speechsdk.ResultReason.SynthesizingAudioCompleted:
            print(f"Audio saved to: {output_file} (Voice: {voice_name})")
            return True
        else:
            print(f"Error generating audio: {result.reason}")
            if result.reason == speechsdk.ResultReason.Canceled:
                cancellation_details = speechsdk.CancellationDetails(result)
                print(f"Error details: {cancellation_details.reason}")
                print(f"Error details: {cancellation_details.error_details}")
            return False
                
    except Exception as e:
        print(f"Unexpected error generating audio: {e}")
        return False

def main():
    parser = argparse.ArgumentParser(description='Generate voice file using Azure Speech Service')
    parser.add_argument('text', help='Text to convert to speech')
    parser.add_argument('output_file', help='Output audio file path (.mp3)')
    args = parser.parse_args()
    
    # Get available voices
    print("Fetching available voices...")
    en_voices = get_english_voices()
    
    if not en_voices:
        print("Error: Could not retrieve voices list")
        exit(1)
    
    print(f"Found {len(en_voices)} English voices")
    
    # Randomly select a voice
    voice_name = random.choice(en_voices)
    
    # Generate audio
    success = generate_audio(args.text, args.output_file, voice_name)
    if not success:
        exit(1)

if __name__ == "__main__":
    main()
