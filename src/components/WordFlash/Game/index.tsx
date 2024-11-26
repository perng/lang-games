import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { setStorage, getStorageWithCookie } from '../../../utils/storage';
import { WordWithScore } from '../types';
import './styles.css';
import { FaPlay } from 'react-icons/fa';
import { IoArrowBack, IoArrowUpOutline } from 'react-icons/io5';
import { AudioService } from '../../../utils/audioService';

// Add these type definitions at the top of the file
interface WordMeaning {
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

interface WordData {
    word: string;
    meanings: WordMeaning[];
    confusion: string[];
}

// Add a type for the JSON file structure
interface WordFileData {
    default: WordData[];
}

// Add this helper function at the top level
const loadWordFile = async (wordFile: string): Promise<WordFileData> => {
    // Extract the level number from the filename (e.g., "wf_level_001.json" -> "001")
    const match = wordFile.match(/wf_level_(\d+)\.json/);
    if (!match) {
        throw new Error(`Invalid word file format: ${wordFile}`);
    }

    try {
        // Pad the level number to 3 digits
        const levelNumber = match[1].padStart(3, '0');
        return import(`../../../data/WordFlash/wf_level_${levelNumber}.json`) as Promise<WordFileData>;
    } catch (error) {
        console.error(`Failed to load word file: ${wordFile}`, error);
        throw new Error(`Failed to load word file: ${wordFile}`);
    }
};

// Add this helper function
const formatExampleSentence = (sentence: string, word: string) => {
    // Replace [word] with <b>word</b>, case-insensitive
    const regex = new RegExp(`\\[${word}\\]`, 'gi');
    return sentence.replace(regex, `<b>${word}</b>`);
};

// Add this interface
interface Level {
    id: string;
    wordFile: string;
}

// Add this function to generate level data
const getLevelData = (levelId: string): Level | null => {
    // Extract level number from levelId (e.g., "word_flash_level_1" -> "1")
    const levelNumber = levelId.split('_').pop();
    
    if (!levelNumber) return null;
    
    return {
        id: levelId,
        wordFile: `wf_level_${levelNumber}.json`
    };
};

export default function WordFlashGame() {
    // All state declarations first
    const navigate = useNavigate();
    const { levelId } = useParams<{ levelId: string }>();
    const [wordList, setWordList] = useState<WordWithScore[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [choices, setChoices] = useState<string[]>([]);
    const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const audioRef = useRef<HTMLAudioElement>(null);
    const [hasUserInteracted, setHasUserInteracted] = useState(false);
    const [showWelcome, setShowWelcome] = useState(true);
    const [slogans, setSlogans] = useState<string[]>([]);
    const [showSlogan, setShowSlogan] = useState(false);
    const [currentSlogan, setCurrentSlogan] = useState('');
    const [fastMode, setFastMode] = useState(false);
    const continueTimerRef = useRef<number>();
    const audioService = useRef<AudioService>();
    const [eatenDots, setEatenDots] = useState(0);
    const [completedRounds, setCompletedRounds] = useState(0);
    const [isReturning, setIsReturning] = useState(false);
    const [correctWordsInRound, setCorrectWordsInRound] = useState(0);
    const [showStatsPopup, setShowStatsPopup] = useState(false);
    const [pacmanMode, setPacmanMode] = useState(false);
    const [isDying, setIsDying] = useState(false);
    const [showExamples, setShowExamples] = useState(false);
    const [showExamplesPopup, setShowExamplesPopup] = useState(false);

    // Initialize audio service
    useEffect(() => {
        audioService.current = new AudioService(audioRef);
    }, []);

    // Restore completed rounds from cookie
    useEffect(() => {
        if (levelId) {
            const savedRounds = parseInt(getStorageWithCookie(`${levelId}_completed_rounds`) || '0');
            console.log(`Restored ${savedRounds} completed rounds from cookie for level ${levelId}`);
            setCompletedRounds(savedRounds);
        }
    }, [levelId]);

    // Load word list
    useEffect(() => {
        const loadWords = async () => {
            if (!levelId) {
                console.error('No level ID provided');
                return;
            }

            try {
                const level = getLevelData(levelId);
                if (!level) {
                    console.error('Level not found');
                    return;
                }

                // Use the new helper function
                const { default: words } = await loadWordFile(level.wordFile);
                const preparedList: WordWithScore[] = [];
                
                // Flatten words and their meanings into a single list
                words.forEach((word: WordData) => {
                    word.meanings.forEach((meaning, index) => {
                        const meaningWithIndex = {
                            ...meaning,
                            index
                        };
                        
                        const cookieKey = `${word.word}-${index}`;
                        const score = parseFloat(getStorageWithCookie(cookieKey) || '0.0');
                        preparedList.push({
                            word: word.word,
                            meaning: meaningWithIndex,
                            score
                        });
                    });
                });

                // shuffle preparedList
                const shuffledList = shuffleArray(preparedList);
                // Sort by score and avoid same words being close                
                sortWordList(preparedList);
                setWordList(shuffledList);
            } catch (error) {
                console.error('Error loading word list:', error);
            }
        };

        loadWords();
    }, [levelId]);

    // Sort function to avoid same words being close together
    const sortWordList = (list: WordWithScore[]) => {
        list.sort((a, b) => {
            if (a.word === b.word) return Math.random() - 0.5;
            return a.score - b.score;  // Lower scores come first
        });
        return list;
    };

    // Add debug logging whenever currentIndex changes
    useEffect(() => {
        if (wordList.length > 0) {
            console.log('Next 10 words:');
            const nextWords = [];
            let index = currentIndex;
            for (let i = 0; i < 10 && i < wordList.length; i++) {
                const word = wordList[index];
                nextWords.push({
                    word: word.word,                    
                    meaningIndex: word.meaning.index,
                    score: word.score
                });
                index = (index + 1) % wordList.length;
            }
            console.table(nextWords);
        }
    }, [currentIndex, wordList]);

    // Prepare choices when moving to next word
    useEffect(() => {
        if (wordList.length > 0 && !isProcessing) {
            const currentWord = wordList[currentIndex];
            const newChoices = shuffleArray([
                currentWord.meaning.meaning_zh_TW,
                ...currentWord.meaning.wrong_meaning_zh_TW
            ]);
            setChoices(newChoices);
        }
    }, [currentIndex, wordList.length]); // Only shuffle when word changes

    // Play word when it changes
    useEffect(() => {
        if (hasUserInteracted && wordList.length > 0 && currentWord && levelId && !isProcessing) {
            const wordPath = `/voices/english/${currentWord.word}.mp3`;
            audioService.current?.playAudio(wordPath);
        }
    }, [currentIndex, hasUserInteracted, wordList.length, isProcessing]);

    const handlePlayButton = () => {
        if (currentWord && levelId && audioService.current) {
            console.log('Play button clicked for word:', currentWord.word);
            const wordPath = `/voices/english/${currentWord.word}.mp3`;
            audioService.current.playAudio(wordPath);
        }
    };

    // Add this useEffect to monitor isProcessing
    useEffect(() => {
        console.log('isProcessing:', isProcessing);
    }, [isProcessing]);

    // Move calculateStats to a memoized value
    const stats = useMemo(() => {
        const totalMeanings = wordList.length;
        console.log('totalMeanings:', totalMeanings);
        const masteredMeanings = wordList.filter(item => item.score > 0).length;
        console.log('masteredMeanings:', masteredMeanings);
        const wordsToReview = wordList.filter(item => item.score < 0.4).length;
        console.log('wordsToReview:', wordsToReview);
        
        return {
            progress: totalMeanings > 0 ? ((masteredMeanings / totalMeanings) * 100).toFixed(2) : "0.00",
            totalMeanings,
            wordsToReview
        };
    }, [wordList]);

    // Add this useEffect after the stats calculation
    useEffect(() => {
        if (levelId && wordList.length > 0) {
            const totalMeanings = wordList.length;
            const masteredMeanings = wordList.filter(item => item.score >= 1).length;
            const progress = totalMeanings > 0 ? ((masteredMeanings / totalMeanings) * 100) : 0;

            // Store progress stats
            setStorage(`wordFlash-progress-${levelId}`, progress.toString());
            setStorage(`wordFlash-mastered-${levelId}`, masteredMeanings.toString());
            setStorage(`wordFlash-total-${levelId}`, totalMeanings.toString());
            
            console.log('Updated progress stats:', {
                levelId,
                progress: progress.toFixed(2),
                masteredMeanings,
                totalMeanings
            });
        }
    }, [wordList, levelId]);

    // Add useEffect to handle definition reading
    // Modify handleChoice to not automatically advance to next word when completing round
    const handleChoice = async (choice: string) => {
        if (isProcessing) return;
        setIsProcessing(true);
        
        const currentWord = wordList[currentIndex];
        const isAnswerCorrect = choice === currentWord.meaning.meaning_zh_TW;
        setSelectedChoice(choice);

        // Read definition, pause, then play word
        if (hasUserInteracted && audioService.current && levelId && !fastMode) {
            // Play Chinese definition
            const encodedDefinition = btoa(unescape(encodeURIComponent(currentWord.meaning.meaning_zh_TW)));
            const definitionPath = `/voices/chinese/${encodedDefinition}.mp3`;
            await audioService.current.playAudio(definitionPath);
            
            // Pause for 0.7 seconds
            await new Promise(resolve => setTimeout(resolve, 700));
            
            // Play word pronunciation
            const wordPath = `/voices/english/${currentWord.word}.mp3`;
            await audioService.current.playAudio(wordPath);
        }
        const cookieKey = `${currentWord.word}-${currentWord.meaning.index}`;
        const currentScore = parseFloat(getStorageWithCookie(cookieKey) || '0.0');

        if (isAnswerCorrect) {
            // Update cookie score when answer is correct
            setStorage(cookieKey, (currentScore + 1.0).toString());
            console.log(`Updated score for ${currentWord.word} to ${getStorageWithCookie(cookieKey)}`);

            // Update wordList with new score
            setWordList(prevList => {
                return prevList.map(word => {
                    if (word.word === currentWord.word && 
                        word.meaning.index === currentWord.meaning.index) {
                        return { ...word, score: currentScore + 1.0 };
                    }
                    return word;
                });
            });

            const nextCorrectWords = correctWordsInRound + 1;
            setCorrectWordsInRound(nextCorrectWords);
            
            if (nextCorrectWords < 10) {
                // Only play chomping sound if pacmanMode is on
                if (pacmanMode && audioService.current) {
                    await audioService.current.playAudio('/voices/pacman_chomp.wav');
                }
                
                setEatenDots(nextCorrectWords);
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // Show examples popup if enabled
                if (showExamples) {
                    setShowExamplesPopup(true);
                } else {
                    setSelectedChoice(null);
                    setIsProcessing(false);
                    setCurrentIndex((prev) => (prev + 1) % wordList.length);
                }
            } else if (nextCorrectWords === 10) {
                // Play final chomp for power pellet
                
                await new Promise(resolve => setTimeout(resolve, 2000));
                const randomIndex = Math.floor(Math.random() * slogans.length);
                setCurrentSlogan(slogans[randomIndex]);
                setShowSlogan(true);
                setIsProcessing(false);
            }
        } else {
            // Only play death sound and animate if pacmanMode is on
            if (pacmanMode && audioService.current) {
                setIsDying(true);
                await audioService.current.playAudio('/voices/pacman_death.wav');
                // Wait for death animation to complete
                await new Promise(resolve => setTimeout(resolve, 1500));
                setIsDying(false);
            }

            console.log(`Updated score for ${currentWord.word} to ${getStorageWithCookie(cookieKey)}`);
            await new Promise(resolve => setTimeout(resolve, 500));
            setSelectedChoice(null);
            setIsProcessing(false);
            setCurrentIndex((prev) => (prev + 1) % wordList.length);
        }
    };

    const startGame = async () => {
        setHasUserInteracted(true);
        setShowWelcome(false);

        // Then play the current word
        if (currentWord && levelId) {
            const wordPath = `/voices/english/${currentWord.word}.mp3`;
            audioService.current?.playAudio(wordPath);
        }
    };

    // Add this function to load slogans
    useEffect(() => {
        const loadSlogans = async () => {
            try {
                const response = await fetch('/data/WordFlash/slogans.txt');
                const text = await response.text();
                setSlogans(text.split('\n').filter(line => line.trim()));
            } catch (error) {
                console.error('Error loading slogans:', error);
            }
        };
        loadSlogans();
    }, []);

    // Update handleSloganClick to handle the sequence
    const handleSloganClick = async () => {
        setShowSlogan(false);
        setIsReturning(true);
        
        // Play intermission sound and wait for Pacman's return animation
        if (audioService.current) {
            await audioService.current.playAudio('/voices/pacman_intermission.wav');
        }
        
        setTimeout(() => {
            const newCompletedRounds = completedRounds + 1;
            setCompletedRounds(newCompletedRounds);
            
            // Save to cookie whenever rounds are updated
            if (levelId) {
                setStorage(`${levelId}_completed_rounds`, newCompletedRounds.toString());
            }

            // Sort words using the same logic as initial load
            setWordList(prevList => sortWordList(prevList));

            setEatenDots(0);
            setCorrectWordsInRound(0);
            setIsReturning(false);
            setSelectedChoice(null);
            setIsProcessing(false);
            setCurrentIndex(0);  // Start from beginning of newly sorted list
        }, 3000);
    };

    // Add this new handler function
    const handlePreviousWord = () => {
        // Clear any existing timers
        if (continueTimerRef.current) {
            window.clearTimeout(continueTimerRef.current);
        }

        // Reset audio if it's playing
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }

        // Calculate previous index
        const newIndex = (currentIndex - 1 + wordList.length) % wordList.length;
        setCurrentIndex(newIndex);
        
        // Reset states
        setSelectedChoice(null);
        setIsProcessing(false);
    };

    // Add handler for closing examples popup
    const handleExamplesPopupClick = () => {
        setShowExamplesPopup(false);
        setSelectedChoice(null);
        setIsProcessing(false);
        setCurrentIndex((prev) => (prev + 1) % wordList.length);
    };

    if (wordList.length === 0) return <div>Loading...</div>;

    const currentWord = wordList[currentIndex];

    return (
        <div className="word-flash-game">
            <button 
                className="back-button"
                onClick={() => navigate('/word-flash')}
            >
                <IoArrowBack size={24} />
            </button>

            <button 
                className="previous-word-button"
                onClick={handlePreviousWord}
            >
                <IoArrowUpOutline size={24} />
            </button>

            <div className="pacman-container">
                <div 
                    className={`pacman ${isReturning ? 'returning' : ''} ${isDying ? 'dying' : ''}`}
                    style={{ 
                        '--current-x': `${eatenDots * 18}px`,
                        transform: !isReturning ? `translateX(${eatenDots * 18}px)` : undefined
                    } as React.CSSProperties}
                />
                {[...Array(9)].map((_, index) => (
                    <div
                        key={index}
                        className={`pac-dot ${index < eatenDots ? 'eaten' : ''}`}
                    />
                ))}
                <div className={`power-pellet ${correctWordsInRound === 10 ? 'eaten' : ''}`} />
            </div>

            {showWelcome && (
                <div className="welcome-overlay">
                    <div className="welcome-content">
                        <h2>Ready to Begin?</h2>
                        <p>Click Start to begin practicing words with audio.</p>
                        <button 
                            className="start-button"
                            onClick={startGame}
                        >
                            Start
                        </button>
                    </div>
                </div>
            )}

            <audio ref={audioRef} />
            
            <div className="word-section">
                <h1 className="word">{currentWord.word}</h1>
                <div className="type-container">
                    <p className="word-type">{currentWord.meaning.type}</p>
                    <button 
                        className="play-button"
                        onClick={() => {
                            setHasUserInteracted(true);
                            handlePlayButton();
                        }}
                        aria-label="Play pronunciation"
                    >
                        <FaPlay />
                    </button>
                </div>
            </div>
            <div className="content-with-ghosts">
                <div className="ghost-areas-container">
                    <div className="ghost-area left-ghosts">
                        {[...Array(15)].map((_, index) => (
                            <div 
                                key={index}
                                className={`ghost ${index < Math.ceil(completedRounds/2) ? 'visible' : ''}`}
                            />
                        ))}
                    </div>
                    
                    <div className="choices">
                        {choices.map((choice, index) => (
                            <button
                                key={index}
                                onClick={() => handleChoice(choice)}
                                className={`choice-button ${selectedChoice === choice && 
                                    (choice === currentWord.meaning.meaning_zh_TW ? 'correct' : 'wrong')}
                                    ${selectedChoice && 
                                        choice === currentWord.meaning.meaning_zh_TW ? 'correct' : ''}
                                `}
                                disabled={isProcessing}
                            >
                                {choice}
                            </button>
                        ))}
                    </div>
                    
                    <div className="ghost-area right-ghosts">
                        {[...Array(15)].map((_, index) => (
                            <div 
                                key={index}
                                className={`ghost ${index < Math.floor(completedRounds/2) ? 'visible' : ''}`}
                            />
                        ))}
                    </div>
                </div>
            </div>
            
            <div className="stats-section">
                <div 
                    className="progress-bar-container"
                    onClick={() => setShowStatsPopup(true)}
                    style={{ cursor: 'pointer' }}
                >
                    <div 
                        className="progress-bar-fill" 
                        style={{ width: `${stats.progress}%` }}
                    />
                    <span className="progress-text">{stats.progress}%</span>
                </div>

                {showStatsPopup && (
                    <div className="stats-popup-overlay" onClick={() => setShowStatsPopup(false)}>
                        <div className="stats-popup" onClick={e => e.stopPropagation()}>
                            <h3>學習進度</h3>
                            <div className="stats-content">
                                <div className="stat-item">
                                    <span className="stat-label">完成進度:</span>
                                    <span className="stat-value">{stats.progress}%</span>
                                </div>
                                <div className="stat-item">
                                    <span className="stat-label">尚餘單字:</span>
                                    <span className="stat-value">{stats.wordsToReview}/{stats.totalMeanings}</span>
                                </div>
                                <div className="stat-item">
                                    <span className="stat-label">完成回合:</span>
                                    <span className="stat-value">{completedRounds}</span>
                                </div>
                            </div>
                            <button 
                                className="close-button"
                                onClick={() => setShowStatsPopup(false)}
                            >
                                關閉
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <div className="game-footer">
                <div className="toggle-container">
                    <div className="toggle-group">
                        <span className="toggle-label">⚡</span>
                        <label className="toggle-switch">
                            <input
                                type="checkbox"
                                checked={fastMode}
                                onChange={(e) => setFastMode(e.target.checked)}
                            />
                            <span className="toggle-slider"></span>
                        </label>
                    </div>

                    <div className="toggle-group">
                        <span className="toggle-label">👾</span>
                        <label className="toggle-switch">
                            <input
                                type="checkbox"
                                checked={pacmanMode}
                                onChange={(e) => setPacmanMode(e.target.checked)}
                            />
                            <span className="toggle-slider"></span>
                        </label>
                    </div>

                    <div className="toggle-group">
                        <span className="toggle-label">📖</span>
                        <label className="toggle-switch">
                            <input
                                type="checkbox"
                                checked={showExamples}
                                onChange={(e) => setShowExamples(e.target.checked)}
                            />
                            <span className="toggle-slider"></span>
                        </label>
                    </div>
                </div>
            </div>

            {showSlogan && (
                <div 
                    className="slogan-overlay"
                    onClick={handleSloganClick}
                >
                    <div className="slogan-content">
                        <h2>{currentSlogan}</h2>                        
                    </div>
                </div>
            )}

            {showExamplesPopup && (
                <div 
                    className="examples-popup-overlay"
                    onClick={handleExamplesPopupClick}
                >
                    <div className="examples-popup">
                        <div className="popup-word">
                            <h2>{currentWord.word}</h2>
                            <p className="word-type">{currentWord.meaning.type}</p>
                        </div>
                        <h3>例句</h3>
                        {currentWord.meaning.examples.map((example, index) => (
                            <div key={index} className="example-item">
                                <p 
                                    className="example-sentence"
                                    dangerouslySetInnerHTML={{
                                        __html: formatExampleSentence(example.sentence, currentWord.word)
                                    }}
                                />
                                <p className="example-translation">{example.translation_zh_TW}</p>
                            </div>
                        ))}
                        <div className="synonyms-section">
                            <h3>同義詞</h3>
                            <p className="synonyms-list">
                                {currentWord.meaning.synonyms.join(', ')}
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Utility function to shuffle array
function shuffleArray<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
} 