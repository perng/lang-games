import { Link, useNavigate } from 'react-router-dom';
import { IoArrowBack } from 'react-icons/io5';
import { useEffect, useState } from 'react';

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

    useEffect(() => {
        fetch('/data/WordFlash/levels.json')
            .then(response => response.json())
            .then(data => {
                setLevels(data);
                setIsLoading(false);
            })
            .catch(error => {
                console.error('Error loading levels:', error);
                setIsLoading(false);
            });
    }, []);

    useEffect(() => {
        const recalculateProgress = async () => {
            // Only proceed if levels are loaded and recalculation hasn't been done
            if (levels.length > 0 && !localStorage.getItem('wf-62')) {
                console.log('Recalculating progress for all levels...');
                console.log('levels', levels);
                
                // Clear all existing progress
                for (const key of Object.keys(localStorage)) {
                    if (key.startsWith('wordFlash-progress-') || 
                        key.startsWith('wordFlash-mastered-') || 
                        key.startsWith('wordFlash-total-')) {
                        localStorage.removeItem(key);
                    }
                }

                // Create new array to store updated levels
                const updatedLevels = [...levels];

                // Load and process each level's words
                for (let i = 0; i < levels.length; i++) {
                    const level = levels[i];
                    console.log(`Processing level ${level.id}...`);
                    try {
                        // Extract level number and pad to 3 digits
                        const levelNumber = level.id.split('_').pop()?.padStart(3, '0');
                        
                        // Use dynamic import instead of fetch
                        const { default: words } = await import(
                            `../../../data/WordFlash/wf_level_${levelNumber}.json`
                        );
                        
                        // Calculate progress based on stored scores
                        let masteredCount = 0;
                        const totalMeanings = words.length;

                        words.forEach((word: any) => {
                            const cookieKey = `${word.word}-0`; // Assuming single meaning per word
                            const score = parseFloat(localStorage.getItem(cookieKey) || '0.0');
                            if (score >= 1) masteredCount++;
                        });
                        console.log(`masteredCount for level ${level.id}: ${masteredCount}`);

                        // Store new progress
                        const progress = (masteredCount / totalMeanings) * 100;
                        localStorage.setItem(`wordFlash-progress-${level.id}`, progress.toString());
                        console.log(`wordFlash-progress-${level.id}`, progress.toString());
                        localStorage.setItem(`wordFlash-mastered-${level.id}`, masteredCount.toString());
                        localStorage.setItem(`wordFlash-total-${level.id}`, totalMeanings.toString());

                        // Update the level object with progress
                        updatedLevels[i] = {
                            ...level,
                            progress: progress
                        };
                    } catch (error) {
                        console.error(`Error processing level ${level.id}:`, error);
                    }
                }

                // Set flag to prevent future recalculations
                localStorage.setItem('wf-62', 'true');
                console.log('Progress recalculation complete');
                
                // Update state with new levels that include progress
                setLevels(updatedLevels);
            }
        };

        // Call recalculateProgress when levels are loaded
        recalculateProgress();
    }, [levels]); // Add levels as dependency

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