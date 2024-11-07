export class TheGame {
  private words: { 
    text: string;
    isThe: boolean;
    isSentenceStart: boolean;
    index: number;
  }[];
  private playerSelections: Set<number> = new Set();

  constructor(content: string) {
    const rawWords = content.split(/\s+/);
    this.words = [];
    
    // Process each word
    rawWords.forEach((word, index) => {
      const isThe = word.toLowerCase() === 'the';
      const isSentenceStart = index === 0 || 
                             (index > 0 && rawWords[index - 1].endsWith('.'));
      
      this.words.push({
        text: word,
        isThe: isThe,
        isSentenceStart: isSentenceStart,
        index: index
      });
    });

    console.log('Processed words:', this.words);
  }

  getDisplayWords() {
    return this.words.filter(word => !word.isThe);
  }

  isCorrectThe(index: number): boolean {
    return this.words[index].isThe;
  }

  public toggleThe(index: number): void {
    if (this.playerSelections.has(index)) {
      this.playerSelections.delete(index);
    } else {
      this.playerSelections.add(index);
    }
  }

  public checkResults() {
    const correct: number[] = [];
    const errors: number[] = [];
    const missed: number[] = [];

    this.words.forEach((word, index) => {
      if (word.isThe) {
        // Should have "the" before the next word
        const nextIndex = index + 1;
        if (this.playerSelections.has(nextIndex)) {
          correct.push(nextIndex);
        } else {
          missed.push(nextIndex);
        }
      } else if (this.playerSelections.has(index) && !this.isCorrectThe(index - 1)) {
        errors.push(index);
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