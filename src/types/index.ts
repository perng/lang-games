export interface Article {
    id: string;
    title: string;
    content: string;
    'explanation-zh-TW'?: string;
    'explanation-en-US'?: string;
}

export interface WordInfo {
    text: string;
    index: number;
    isSentenceStart: boolean;
    isFirstNonArticleWord: boolean;
}

export interface GameResults {
    correct: number[];
    errors: number[];
    missed: number[];
    score?: {
        correct: number;
        errors: number;
        missed: number;
    }
}
