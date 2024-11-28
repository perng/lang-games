export interface WordMeaning {
    type: string;
    meaningIndex: number;
    meaning_zh_TW: string;
    wrong_meaning_zh_TW: string[];
    examples: {
        sentence: string;
        translation_zh_TW: string;
    }[];
    synonyms: string[];
}

export interface WordData {
    word: string;
    meanings: WordMeaning[];
    confusion: string[];
}

export interface WordWithScore {
    word: string;
    meaning: WordMeaning;
    meaningIndex: number;
    score: number;
} 