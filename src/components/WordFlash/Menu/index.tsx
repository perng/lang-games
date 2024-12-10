import { Link } from 'react-router-dom';
import { FaCheckCircle } from 'react-icons/fa';
import { useEffect, useState, useRef } from 'react';
import { getStorage, setStorage } from '../../../utils/storage';

interface WordFlashMenuProps {
    gameType: string;
    progressFlag?: string;  // Optional, defaults to game-specific flag
}

interface Level {
    id: string;
    title: string;
    description: string;
    game_type: string;
    wordFile: string;
    progress?: number; // Optional since it comes from progress tracking
}

const getBackgroundColors = (progress: number) => {
    if (progress === 0) {
        return {
            light: '#f5f5f5',
            lighter: '#ffffff'
        };
    }

    if (progress === 100) {
        return {
            light: '#e8f5e9',
            lighter: '#f1f8f2'
        };
    }

    // Create a color spectrum for backgrounds (using very light colors)
    const colors = [
        { percent: 0, light: '#ffebee', lighter: '#fff1f2' },    // Very light red
        { percent: 25, light: '#fff3e0', lighter: '#fff8e7' },   // Very light orange
        { percent: 50, light: '#fffde7', lighter: '#fffef2' },   // Very light yellow
        { percent: 75, light: '#f1f8e9', lighter: '#f6faf0' },   // Very light green
        { percent: 100, light: '#e8f5e9', lighter: '#f1f8f2' }   // Light green
    ];

    // Find the two colors to interpolate between
    let startColor, endColor;
    for (let i = 0; i < colors.length - 1; i++) {
        if (progress >= colors[i].percent && progress <= colors[i + 1].percent) {
            startColor = colors[i];
            endColor = colors[i + 1];
            break;
        }
    }

    if (!startColor || !endColor) {
        startColor = colors[0];
        endColor = colors[1];
    }

    // Calculate the percentage between the two colors
    const range = endColor.percent - startColor.percent;
    const adjustedProgress = (progress - startColor.percent) / range;

    return {
        light: interpolateColor(startColor.light, endColor.light, adjustedProgress),
        lighter: interpolateColor(startColor.lighter, endColor.lighter, adjustedProgress)
    };
};

// Helper function to interpolate between two colors
const interpolateColor = (color1: string, color2: string, factor: number) => {
    const c1 = hexToRgb(color1);
    const c2 = hexToRgb(color2);

    const r = Math.round(c1.r + (c2.r - c1.r) * factor);
    const g = Math.round(c1.g + (c2.g - c1.g) * factor);
    const b = Math.round(c1.b + (c2.b - c1.b) * factor);

    return rgbToHex(r, g, b);
};

// Helper functions for color conversion
const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
};

const rgbToHex = (r: number, g: number, b: number) => {
    return '#' + [r, g, b].map(x => {
        const hex = x.toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    }).join('');
};

const formatTitle = (title: string) => {
    // Split the title into parts based on square brackets
    const parts = title.split(/\[|\]/);
    return parts.map((part, index) => {
        // Even indices are normal text, odd indices are bold
        return index % 2 === 0 ? (
            <span key={index}>{part}</span>
        ) : (
            <strong key={index}>{part}</strong>
        );
    });
};

export default function WordFlashMenu({ 
    gameType, 
    progressFlag = 'wf-2024-12-02-18' 
}: WordFlashMenuProps) {
    const [levels, setLevels] = useState<Level[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const firstIncompleteLevelRef = useRef<HTMLAnchorElement | null>(null);

    // First useEffect: Initial load of levels and their progress
    useEffect(() => {
        const loadLevelsWithProgress = async () => {
            try {
                // Load the levels.json file from public folder
                console.log('Loading levels.json...', `/data/${gameType}/levels.json`);
                const response = await fetch(`/data/${gameType}/levels.json`);
                const levelsData = await response.json();

                // Add stored progress to each level from localStorage/cookies
                const levelsWithProgress = levelsData.map((level: Level) => ({
                    ...level,
                    progress: parseFloat(getStorage(`${gameType}-progress-${level.id}`) || '0')
                }));

                setLevels(levelsWithProgress);
                setIsLoading(false);
            } catch (error) {
                console.error('Error loading levels:', error);
                setIsLoading(false);
            }
        };

        loadLevelsWithProgress();
    }, [gameType]);

    // Second useEffect: One-time progress recalculation after redistribution
    useEffect(() => {
        const recalculateProgress = async () => {
            if (levels.length > 0 && !getStorage(progressFlag)) {
                console.log('Recalculating progress for all levels...');

                // Clear all existing progress data
                for (const key of Object.keys(localStorage)) {
                    if (key.startsWith(`${gameType}-progress-`) ||
                        key.startsWith(`${gameType}-mastered-`) ||
                        key.startsWith(`${gameType}-total-`)) {
                        localStorage.removeItem(key);
                    }
                }

                // Create new array to store levels with updated progress
                const updatedLevels = [...levels];

                // Process each level
                for (let i = 0; i < levels.length; i++) {
                    const level = levels[i];
                    try {
                        // Get the level number and pad it to 3 digits (e.g., "1" -> "001")
                        // const levelNumber = level.id.split('_').pop()?.padStart(3, '0');

                        // Load the word list for this level
                        const { default: words } = await import(
                            `../../../data/${gameType}/${level.id}.json`
                        );

                        let masteredCount = 0;
                        let totalMeanings = 0;

                        words.forEach((word: any) => {
                            console.log(`Processing level ${word}...`);

                            word.meanings.forEach((_meaning: string, index: number) => {
                                const newKey = `${gameType}-${word.word}-${index}`;
                                const score = parseInt(getStorage(newKey) || '0');
                                
                                totalMeanings++;
                                if (score > 0) masteredCount++;
                            });
                        });

                        const progress = (masteredCount / totalMeanings) * 100;
                        setStorage(`${gameType}-progress-${level.id}`, progress.toString());
                        setStorage(`${gameType}-mastered-${level.id}`, masteredCount.toString());
                        setStorage(`${gameType}-total-${level.id}`, totalMeanings.toString());

                        if (progress >= 100) {
                            localStorage.setItem(`${gameType}-firework-${level.id}`, 'true');
                        }

                        // Update the level object in our array
                        updatedLevels[i] = {
                            ...level,
                            progress: progress
                        };
                    } catch (error) {
                        console.error(`Error processing level ${level.id}:`, error);
                    }
                }

                setStorage(progressFlag, 'true');
                setLevels(updatedLevels);
            }
        };

        recalculateProgress();
    }, [levels]); // Depends on levels array, but will only recalculate once due to flag

    // Add a new useEffect for scrolling
    useEffect(() => {
        if (!isLoading && levels.length > 0) {
            // Find the first incomplete level
            const firstIncompleteIndex = levels.findIndex(level => (level.progress ?? 0) < 100);

            if (firstIncompleteIndex !== -1 && firstIncompleteLevelRef.current) {
                // Scroll with a slight delay to ensure DOM is ready
                setTimeout(() => {
                    firstIncompleteLevelRef.current?.scrollIntoView({
                        behavior: 'smooth',
                        block: 'center'
                    });
                }, 100);
            }
        }
    }, [isLoading, levels]);

    return (
        <div className="word-flash-menu">
            <main className="levels-container">
                {isLoading ? (
                    <div className="loading">Loading levels...</div>
                ) : (
                    levels.map((level, index) => {
                        const isFirstIncomplete =
                            index === levels.findIndex(l => (l.progress ?? 0) < 100);

                        return (
                            <Link
                                key={level.id}
                                ref={isFirstIncomplete ? firstIncompleteLevelRef : null}
                                to={`/${gameType}/${level.id}`}
                                className="level-item"
                                style={{
                                    '--bg-light': getBackgroundColors(level.progress ?? 0).light,
                                    '--bg-lighter': getBackgroundColors(level.progress ?? 0).lighter,
                                    '--progress-color': level.progress === 100 ? '#4CAF50' : '#2196f3',
                                } as React.CSSProperties}
                            >
                                <div className="level-number">
                                    {level.id.split('_').pop()}
                                    {level.progress === 100 && (
                                        <FaCheckCircle className="complete-check" />
                                    )}
                                </div>
                                <div className="level-info">
                                    <p className="level-title">{formatTitle(level.title)}</p>
                                    <div className="progress-bar">
                                        <div
                                            className="progress-fill"
                                            style={{ width: `${level.progress ?? 0}%` }}
                                        />
                                    </div>
                                </div>
                            </Link>
                        );
                    })
                )}
            </main>
        </div>
    );
} 