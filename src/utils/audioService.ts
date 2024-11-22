export class AudioService {
    private audioRef: React.RefObject<HTMLAudioElement>;

    constructor(audioRef: React.RefObject<HTMLAudioElement>) {
        this.audioRef = audioRef;
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

    stop() {
        if (this.audioRef.current) {
            this.audioRef.current.pause();
            this.audioRef.current.currentTime = 0;
        }
    }
}