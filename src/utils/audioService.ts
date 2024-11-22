export class AudioService {
    private audioRef: React.RefObject<HTMLAudioElement>;
    private utterance: SpeechSynthesisUtterance;

    constructor(audioRef: React.RefObject<HTMLAudioElement>) {
        this.audioRef = audioRef;
        this.utterance = new SpeechSynthesisUtterance();
        this.utterance.lang = 'zh-TW';
    }

    playAudio(audioPath: string): Promise<void> {
        console.log('Attempting to play audio:', audioPath);
        return new Promise((resolve) => {
            if (!this.audioRef.current) {
                console.error('No audio ref available');
                resolve();
                return;
            }

            const audio = this.audioRef.current;
            audio.src = audioPath;
            
            const onEnded = () => {
                console.log('Audio ended:', audioPath);
                cleanup();
                resolve();
            };

            const onError = (e: Event) => {
                console.error('Audio error:', audioPath, e);
                cleanup();
                resolve();
            };

            const cleanup = () => {
                audio.removeEventListener('ended', onEnded);
                audio.removeEventListener('error', onError);
            };

            audio.addEventListener('ended', onEnded);
            audio.addEventListener('error', onError);

            audio.play()
                .then(() => {
                    console.log('Audio started playing:', audioPath);
                })
                .catch((error) => {
                    console.error('Play error:', error);
                    onError(error as Event);
                });
        });
    }

    speakText(text: string): Promise<void> {
        return new Promise((resolve) => {
            // Cancel any ongoing speech
            window.speechSynthesis.cancel();

            this.utterance.text = text;
            
            const onEnd = () => {
                console.log('Speech ended:', text);
                cleanup();
                resolve();
            };

            const onError = () => {
                console.error('Speech error:', text);
                cleanup();
                resolve();
            };

            const cleanup = () => {
                this.utterance.removeEventListener('end', onEnd);
                this.utterance.removeEventListener('error', onError);
            };

            this.utterance.addEventListener('end', onEnd);
            this.utterance.addEventListener('error', onError);

            window.speechSynthesis.speak(this.utterance);
            console.log('Started speaking:', text);
        });
    }

    stop() {
        if (this.audioRef.current) {
            this.audioRef.current.pause();
            this.audioRef.current.currentTime = 0;
        }
        window.speechSynthesis.cancel();
    }
}