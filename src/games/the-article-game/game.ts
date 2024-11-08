import type { WordInfo } from '../../types/index';

export class TheGame {
    private words: WordInfo[];
    private correctThePositions: Set<number>;
    private playerSelections: Set<number>;
    private sentenceStarts: Set<number>;

    constructor(content: string) {
        this.words = [];
        this.correctThePositions = new Set();
        this.playerSelections = new Set();
        this.sentenceStarts = new Set();

        const rawWords = content.split(/\s+/);
        let isFirstWord = true;  // Track the first word specifically
        
        rawWords.forEach((word, index) => {
            const isThe = word.toLowerCase() === 'the';
            // A word starts a sentence if:
            // 1. It's the very first word of the text
            // 2. Previous word ends with ., !, or ?
            const isSentenceStart = isFirstWord || 
                                 (index > 0 && /[.!?]$/.test(rawWords[index - 1]));
            
            if (isThe) {
                this.correctThePositions.add(index);
                // If this "the" is at sentence start, mark the next word
                if (isSentenceStart && index + 1 < rawWords.length) {
                    this.sentenceStarts.add(index + 1);
                }
            } else {
                if (isSentenceStart) {
                    this.sentenceStarts.add(index);
                }
                this.words.push({
                    text: word,
                    isSentenceStart: isSentenceStart,
                    index: index
                });
            }
            
            isFirstWord = false;  // After first word is processed
        });

        console.log('Sentence starts:', Array.from(this.sentenceStarts));
        console.log('Words:', this.words);
    }

    public getWords(): WordInfo[] {
        return this.words.map(word => ({
            ...word,
            // If this word should be capitalized (it's at sentence start and no "the" before it)
            text: this.sentenceStarts.has(word.index) ? 
                 this.capitalizeFirstLetter(word.text) : 
                 word.text
        }));
    }

    private capitalizeFirstLetter(str: string): string {
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    }

    public isSentenceStart(index: number): boolean {
        return this.sentenceStarts.has(index);
    }

    public toggleThe(index: number): void {
        if (this.playerSelections.has(index)) {
            this.playerSelections.delete(index);
            console.log('Removed the at index:', index);
        } else {
            this.playerSelections.add(index);
            // Capitalize "the" if it's being added before a sentence start
            if (this.sentenceStarts.has(index)) {
                console.log('Added The at index:', index);
            } else {
                console.log('Added the at index:', index);
            }
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