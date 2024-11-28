import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { setStorage, getStorageWithCookie } from '../../../utils/storage';
import { WordWithScore } from '../types';
import './styles.css';
import { FaPlay } from 'react-icons/fa';
import { IoArrowBack, IoArrowUpOutline } from 'react-icons/io5';
import { AudioService } from '../../../utils/audioService';
import { Fireworks } from '@fireworks-js/react';

// Add these type definitions at the top of the file
interface WordMeaning {
    type: string;
    meaning_en_US: string;
    meaning_zh_TW: string;
    wrong_meaning_zh_TW: string[];
    meaningIndex: number;
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

// Add interface for Level type
interface Level {
    id: string;
    title: string;
    wordFile: string;
}

// Add this function at the top of the file
const getLevelData = async (levelId: string): Promise<Level | null> => {
    try {
        const response = await fetch('/data/WordFlash/levels.json');
        if (!response.ok) {
            console.error('Failed to fetch levels.json:', response.status);
            return null;
        }
        
        const levels: Level[] = await response.json();
        return levels.find(level => level.id === levelId) || null;
    } catch (error) {
        console.error('Error getting level data:', error);
        return null;
    }
};

export default function WordFlashGame() {
    const { levelId } = useParams<{ levelId: string }>();
    const navigate = useNavigate();
    const [wordList, setWordList] = useState<WordWithScore[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [choices, setChoices] = useState<string[]>([]);
    const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const audioRef = useRef<HTMLAudioElement>(null);
    const [hasUserInteracted, setHasUserInteracted] = useState(false);
    const [showWelcome, setShowWelcome] = useState(true);
    const [fastMode, setFastMode] = useState(() => {
        return localStorage.getItem('wordFlash_fastMode') === 'true'
    });
    const continueTimerRef = useRef<number>();
    const audioService = useRef<AudioService>();
    const [showStatsPopup, setShowStatsPopup] = useState(false);
    const [showExamples, setShowExamples] = useState(() => {
        return localStorage.getItem('wordFlash_showExamples') === 'true'
    });
    const [showExamplesPopup, setShowExamplesPopup] = useState(false);
    const [levelDescription, setLevelDescription] = useState('');
    const [welcomeSlogan, setWelcomeSlogan] = useState('');
    const [showFireworks, setShowFireworks] = useState(false);
    const [shouldUpdateChoices, setShouldUpdateChoices] = useState(true);

    // Initialize audio service
    useEffect(() => {
        audioService.current = new AudioService(audioRef);
    }, []);

    // Load word list
    useEffect(() => {
        const loadWords = async () => {
            if (!levelId) {
                console.error('No level ID provided');
                return;
            }

            try {
                const level = await getLevelData(levelId);
                if (!level) {
                    console.error('Level not found');
                    return;
                }

                const levelNumber = level.id.replace(/\D/g, '');
                setLevelDescription(`Level ${levelNumber}`);
                
                const { default: words } = await loadWordFile(level.wordFile);
                console.log('Loaded raw words:', words); // Debug log

                const preparedList = words.flatMap((word: WordData) => 
                    // Map over each meaning in the word's meanings array
                    word.meanings.map((meaning, index) => ({
                        word: word.word,
                        meaning: {
                            type: meaning.type,
                            meaningIndex: index,
                            meaning_zh_TW: meaning.meaning_zh_TW,
                            wrong_meaning_zh_TW: meaning.wrong_meaning_zh_TW || [],
                            examples: meaning.examples || [],
                            synonyms: meaning.synonyms || []
                        },
                        meaningIndex: index,
                        score: parseFloat(getStorageWithCookie(`${word.word}-${index}`) || '0.0')
                    }))
                );

                console.log('Prepared word list:', preparedList); // Debug log
                
                setWordList(preparedList);
                setCurrentIndex(0);
                setShouldUpdateChoices(true);
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
                    meaning_zh_TW: word.meaning.meaning_zh_TW,
                    meaningIndex: word.meaning.meaningIndex,
                    score: word.score
                });
                index = (index + 1) % wordList.length;
            }
            console.table(nextWords);
        }
    }, [currentIndex, wordList]);

    // Modify the useEffect for choices
    useEffect(() => {
        if (wordList.length > 0 && shouldUpdateChoices) {
            const currentWord = wordList[currentIndex];
            if (currentWord) {
                const allChoices = [
                    currentWord.meaning.meaning_zh_TW,
                    ...currentWord.meaning.wrong_meaning_zh_TW
                ];
                setChoices(shuffleArray([...allChoices]));
            }
            setShouldUpdateChoices(false);
        }
    }, [currentIndex, wordList, shouldUpdateChoices]);

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
        const wordsToReview = wordList.filter(item => item.score < 0.4).length;
        
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
        
        const totalMeanings = wordList.length;
        console.log('totalMeanings:', totalMeanings);
        const isAnswerCorrect = choice === currentWord.meaning.meaning_zh_TW;
        setSelectedChoice(choice);

        // Read definition, pause, then play word
        if (hasUserInteracted && audioService.current && levelId && !fastMode) {
            const encodedDefinition = btoa(unescape(encodeURIComponent(currentWord.meaning.meaning_zh_TW)));
            const definitionPath = `/voices/chinese/${encodedDefinition}.mp3`;
            await audioService.current.playAudio(definitionPath);
            
            console.log('Definition played, pause 0.7 second');
            await new Promise(resolve => setTimeout(resolve, 700));
            
            const wordPath = `/voices/english/${currentWord.word}.mp3`;
            await audioService.current.playAudio(wordPath);
        }

        if (isAnswerCorrect) {
            // Update score in cookie
            const cookieKey = `${currentWord.word}-${currentWord.meaning.meaningIndex}`;
            const currentScore = parseFloat(getStorageWithCookie(cookieKey) || '0.0');
            const newScore = currentScore + 1.0;
            setStorage(cookieKey, newScore.toString());

            // Update mastered words in localStorage
            if (newScore >= 1.0 && levelId) {  // Consider word mastered when score >= 1
                const storageKey = `wordFlash-mastered-word_flash_level_${levelId}`;
                const masteredWords = JSON.parse(localStorage.getItem(storageKey) || '[]');
                
                // Add the word-meaning pair if not already in the list
                const wordMeaningKey = `${currentWord.word}-${currentWord.meaning.meaningIndex}`;
                if (!masteredWords.includes(wordMeaningKey)) {
                    masteredWords.push(wordMeaningKey);
                    localStorage.setItem(storageKey, JSON.stringify(masteredWords));
                    console.log(`Added ${wordMeaningKey} to mastered words for level ${levelId}`);
                }
            }

            setWordList(prevList => {
                return prevList.map(word => {
                    if (word.word === currentWord.word && 
                        word.meaning.meaningIndex === currentWord.meaning.meaningIndex) {
                        return { ...word, score: newScore };
                    }
                    return word;
                });
            });
            
            console.log('Correct answer, pause 0.5 second');
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            if (showExamples) {
                setShowExamplesPopup(true);
            } else {
                await advanceToNextWord(); // Only advance if not showing examples
            }
        } else {
            console.log('Wrong answer, pause 1 second');
            await new Promise(resolve => setTimeout(resolve, 1000));
            await advanceToNextWord(); // Always advance on wrong answer
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
                const sloganList = text.split('\n').filter(line => line.trim());
                const randomSlogan = sloganList[Math.floor(Math.random() * sloganList.length)];
                setWelcomeSlogan(randomSlogan);
            } catch (error) {
                console.error('Error loading slogans:', error);
                setWelcomeSlogan('Welcome to Word Flash!');
            }
        };
        loadSlogans();
    }, []);

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
    const handleExamplesPopupClick = async () => {
        setShowExamplesPopup(false);
        await advanceToNextWord();
    };

    // Move findNextIncompleteLevel inside the component
    const findNextIncompleteLevel = async () => {
        if (!levelId) {
            console.log('No current levelId');
            return null;
        }
        
        try {
            // Get all level files
            const response = await fetch('/data/WordFlash/levels.json');
            if (!response.ok) {
                console.error('Failed to fetch levels.json:', response.status);
                return null;
            }
            
            const levels: Level[] = await response.json();
            console.log('All levels:', levels);
            
            // Find current level index
            const currentIndex = levels.findIndex(level => level.id === levelId);
            console.log('Current level index:', currentIndex);
            
            if (currentIndex === -1) {
                console.log('Current level not found in levels list');
                return null;
            }
            
            // Look for next incomplete level
            for (let i = currentIndex + 1; i < levels.length; i++) {
                const progress = Number(getStorageWithCookie(`${levels[i].id}_progress`) ?? 0);
                console.log(`Level ${levels[i].id} progress:`, progress);
                
                if (progress < 100) {
                    console.log('Found next incomplete level:', levels[i].id);
                    return levels[i].id;
                }
            }
            
            console.log('No incomplete levels found after current level');
            return null;
        } catch (error) {
            console.error('Error finding next level:', error);
            return null;
        }
    };

    // Add useEffect to check progress and trigger fireworks
    useEffect(() => {
        if (Number(stats.progress) >= 100 && !showFireworks) {
            setShowFireworks(true);
        }
    }, [stats.progress]);

    // Add handler to dismiss fireworks
    const handleFireworksClick = () => {
        setShowFireworks(false);
        navigate('/word-flash'); // Navigate back to menu page
    };

    // Modify advanceToNextWord to control when choices should update
    const advanceToNextWord = async () => {
        // Add 1 second pause
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Calculate next index
        const nextIndex = (currentIndex + 1) % wordList.length;
        const nextWord = wordList[nextIndex];
        
        // If next word has score > 0, resort the list
        if (nextWord.score > 0) {
            setWordList(prevList => sortWordList([...prevList]));
            // Reset to beginning after sorting
            setCurrentIndex(0);
        } else {
            setCurrentIndex(nextIndex);
        }
        
        // Reset states after the pause
        setSelectedChoice(null);
        setIsProcessing(false);
        setShouldUpdateChoices(true); // Allow choices to update
    };

    if (wordList.length === 0) return <div>Loading...</div>;

    const currentWord = wordList[currentIndex];

    return (
        <div className="word-flash-game">
            <div className="game-header">
                <button 
                    className="back-button"
                    onClick={() => navigate('/word-flash')}
                >
                    <IoArrowBack size={24} />
                </button>
                
                <h2 className="level-description">{levelDescription}</h2>

                <button 
                    className="previous-word-button"
                    onClick={handlePreviousWord}
                >
                    <IoArrowUpOutline size={24} />
                </button>
            </div>

            {showWelcome && (
                <div className="welcome-overlay">
                    <div className="welcome-content">
                        <h2></h2>
                        <p>{welcomeSlogan}</p>
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
            
            {Number(stats.progress) >= 100 && (
                <button 
                    className="next-level-button"
                    onClick={async () => {
                        try {
                            console.log('Finding next incomplete level...');
                            const nextLevelId = await findNextIncompleteLevel();
                            console.log('Next level ID:', nextLevelId);
                            
                            if (nextLevelId) {
                                console.log('Navigating to:', `/word-flash/${nextLevelId}`);
                                navigate(`/word-flash/${nextLevelId}`);
                            } else {
                                console.log('No next level found');
                                alert('You have completed all available levels!');
                            }
                        } catch (error) {
                            console.error('Error handling next level:', error);
                        }
                    }}
                >
                    Next Level →
                </button>
            )}

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
                                onChange={(e) => {
                                    setFastMode(e.target.checked);
                                    localStorage.setItem('wordFlash_fastMode', e.target.checked.toString());
                                }}
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
                                onChange={(e) => {
                                    setShowExamples(e.target.checked);
                                    localStorage.setItem('wordFlash_showExamples', e.target.checked.toString());
                                }}
                            />
                            <span className="toggle-slider"></span>
                        </label>
                    </div>
                </div>
            </div>

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

            {/* Add fireworks overlay */}
            {showFireworks && (
                <div 
                    className="fireworks-overlay"
                    onClick={handleFireworksClick}
                >
                    <Fireworks
                        options={{
                            opacity: 0.5,
                            explosion: 5,
                            intensity: 30,
                            traceLength: 3,
                            rocketsPoint: {
                                min: 0,
                                max: 100
                            }
                        }}
                        style={{
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            position: 'fixed',
                            background: 'rgba(0, 0, 0, 0.7)',
                            zIndex: 999
                        }}
                    />
                    <div className="completion-message">
                        <h2>Congratulations!</h2>
                        <p>You've completed this level!</p>
                        <p>Click anywhere to continue</p>
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