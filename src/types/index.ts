export interface Article {
    title: string;
    content: string;
}

export interface WordInfo {
    text: string;
    isSentenceStart: boolean;
    index: number;
}

export interface GameResults {
    correct: number;
    errors: number;
    missed: number;
    positions: {
        correct: number[];
        errors: number[];
        missed: number[];
    };
}
