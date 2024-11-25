import { Link, useNavigate } from 'react-router-dom';
import { IoArrowBack } from 'react-icons/io5';
import { useEffect, useState } from 'react';
import { getStorageWithCookie, setStorage } from '../../../utils/storage';

interface Level {
    id: string;
    title: string;
    description: string;
    game_type: string;
    wordFile: string;
    progress?: number; // Optional since it comes from progress tracking
}

export default function WordFlashMenu() {
    const navigate = useNavigate();
    const [levels, setLevels] = useState<Level[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // First useEffect: Initial load of levels and their progress
    useEffect(() => {
        const loadLevelsWithProgress = async () => {
            try {
                // Load the levels.json file from public folder
                const response = await fetch('/data/WordFlash/levels.json');
                const levelsData = await response.json();
                
                // Add stored progress to each level from localStorage/cookies
                const levelsWithProgress = levelsData.map((level: Level) => ({
                    ...level,
                    progress: parseFloat(getStorageWithCookie(`wordFlash-progress-${level.id}`) || '0')
                }));
                
                setLevels(levelsWithProgress);
                setIsLoading(false);
            } catch (error) {
                console.error('Error loading levels:', error);
                setIsLoading(false);
            }
        };

        loadLevelsWithProgress();
    }, []); // Empty dependency array means this runs once when component mounts

    // Second useEffect: One-time progress recalculation after redistribution
    useEffect(() => {
        const recalculateProgress = async () => {
            // Only proceed if:
            // 1. Levels are loaded (levels.length > 0)
            // 2. We haven't done this recalculation before (!getStorageWithCookie('wf-62'))
            if (levels.length > 0 && !getStorageWithCookie('wf-62')) {
                console.log('Recalculating progress for all levels...');
                console.log('levels', levels);
                
                // Clear all existing progress data
                for (const key of Object.keys(localStorage)) {
                    if (key.startsWith('wordFlash-progress-') || 
                        key.startsWith('wordFlash-mastered-') || 
                        key.startsWith('wordFlash-total-')) {
                        localStorage.removeItem(key);
                    }
                }

                // Create new array to store levels with updated progress
                const updatedLevels = [...levels];

                // Process each level
                for (let i = 0; i < levels.length; i++) {
                    const level = levels[i];
                    console.log(`Processing level ${level.id}...`);
                    try {
                        // Get the level number and pad it to 3 digits (e.g., "1" -> "001")
                        const levelNumber = level.id.split('_').pop()?.padStart(3, '0');
                        
                        // Load the word list for this level
                        const { default: words } = await import(
                            `../../../data/WordFlash/wf_level_${levelNumber}.json`
                        );
                        
                        // Calculate progress by checking each word's mastery status
                        let masteredCount = 0;
                        const totalMeanings = words.length;

                        words.forEach((word: any) => {
                            const cookieKey = `${word.word}-0`; // Key for word's score
                            const score = parseFloat(getStorageWithCookie(cookieKey) || '0.0');
                            if (score >= 1) masteredCount++; // Word is mastered if score >= 1
                        });
                        console.log(`masteredCount for level ${level.id}: ${masteredCount}`);

                        // Calculate and store progress percentage
                        const progress = (masteredCount / totalMeanings) * 100;
                        setStorage(`wordFlash-progress-${level.id}`, progress.toString());
                        setStorage(`wordFlash-mastered-${level.id}`, masteredCount.toString());
                        setStorage(`wordFlash-total-${level.id}`, totalMeanings.toString());

                        // Update the level object in our array
                        updatedLevels[i] = {
                            ...level,
                            progress: progress
                        };
                    } catch (error) {
                        console.error(`Error processing level ${level.id}:`, error);
                    }
                }

                // Set flag to prevent future recalculations
                setStorage('wf-62', 'true');
                console.log('Progress recalculation complete');
                
                // Update state with all the new progress values
                setLevels(updatedLevels);
            }
        };

        // Run the recalculation when levels are loaded
        recalculateProgress();
    }, [levels]); // Depends on levels array, but will only recalculate once due to 'wf-62' flag

    return (
        <div className="word-flash-menu">
            <header>
                <button 
                    className="back-button"
                    onClick={() => navigate('/')}
                >
                    <IoArrowBack size={24} />
                </button>
                <h1>Word Flash</h1>
            </header>

            <main className="levels-container">
                {isLoading ? (
                    <div className="loading">Loading levels...</div>
                ) : (
                    levels.map(level => (
                        <Link 
                            key={level.id} 
                            to={`/word-flash/${level.id}`} 
                            className="level-card"
                        >
                            <div className="level-shape" />
                            <div className="level-content">
                                <h2>{level.title}</h2>
                                <p>{level.description}</p>
                                <div className="progress-bar">
                                    <div 
                                        className="progress-fill" 
                                        style={{ width: `${level.progress ?? 0}%` }}
                                    />
                                </div>
                            </div>
                        </Link>
                    ))
                )}
            </main>
        </div>
    );
} 