export interface WordInfo {
    text: string;
    isSentenceStart: boolean;
    index: number;
}

export class TheGame {
    private words: WordInfo[];
    private correctThePositions: Set<number>;
    private playerSelections: Set<number>;

    constructor(content: string) {
        this.words = [];
        this.correctThePositions = new Set();
        this.playerSelections = new Set();

        const rawWords = content.split(/\s+/);
        
        rawWords.forEach((word, index) => {
            const isThe = word.toLowerCase() === 'the';
            const isSentenceStart = index === 0 || 
                                 (index > 0 && /[.!?]$/.test(rawWords[index - 1]));
            
            if (isThe) {
                this.correctThePositions.add(index);
            } else {
                this.words.push({
                    text: word,
                    isSentenceStart: isSentenceStart,
                    index: index
                });
            }
        });
    }

    public getWords(): WordInfo[] {
        return this.words;
    }

    public toggleThe(index: number): void {
        if (!this.playerSelections.has(index)) {
            this.playerSelections.add(index);
        }
    }

    public checkResults() {
        const correct: number[] = [];
        const errors: number[] = [];
        const missed: number[] = [];

        this.words.forEach(word => {
            if (this.correctThePositions.has(word.index - 1)) {
                if (this.playerSelections.has(word.index)) {
                    correct.push(word.index);
                } else {
                    missed.push(word.index);
                }
            } else if (this.playerSelections.has(word.index)) {
                errors.push(word.index);
            }
        });

        return {
            correct: correct.length,
            errors: errors.length,
            missed: missed.length,
            positions: { correct, errors, missed }
        };
    }
}