declare module '*/levels.json' {
    interface Level {
        id: string;
        title: string;
        description: string;
        imageId: string;
        wordFile: string;
    }

    interface LevelsData {
        levels: Level[];
    }

    const value: LevelsData;
    export default value;
} 