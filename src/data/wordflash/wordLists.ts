interface Word {
    word: string;
    meaning: string;
    // Add other properties as needed
}

export const getWordsForLevel = (levelNumber: number): Word[] => {
    // This could be replaced with actual word lists or API calls
    const wordsPerLevel = 20;
    const startIndex = (levelNumber - 1) * wordsPerLevel;
    
    // Example of generating dummy words
    return Array.from({ length: wordsPerLevel }, (_, index) => ({
        word: `Word ${startIndex + index + 1}`,
        meaning: `Meaning for word ${startIndex + index + 1}`,
    }));
};

// Optional: If you want to predefine specific words for specific levels
export const levelWordOverrides: Record<number, Word[]> = {
    1: [
        { word: "hello", meaning: "a greeting" },
        { word: "world", meaning: "the earth" },
        // ... more words
    ],
    // ... more levels
}; 