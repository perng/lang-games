export interface WordMeaning {
    index: number;
    type: string;
    meaning_en_US: string;
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
    score: number;
} 