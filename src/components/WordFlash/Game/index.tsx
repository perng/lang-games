import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { setStorage, getStorage } from '../../../utils/storage';
import { WordWithScore } from '../types';
import './styles.css';
import { FaPlay } from 'react-icons/fa';
import { IoArrowBack, IoArrowUpOutline } from 'react-icons/io5';
import { AudioService } from '../../../utils/audioService';
import { Fireworks } from '@fireworks-js/react';
import { useReward } from 'react-rewards';
import Modal from '../../Modal'; // Import the Modal component

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

interface WordFlashGameProps {
    gameType: string;
}

// Add this helper function at the top level
const loadWordFile = async (gameType: string, levelId: string): Promise<WordFileData> => {
    // Extract the level number from the filename (e.g., "wf_level_001.json" -> "001")

    try {
        return import(`../../../data/${gameType}/${levelId}.json`) as Promise<WordFileData>;
    } catch (error) {
        console.error(`Failed to load word file: ${levelId}.json`, error);
        throw new Error(`Failed to load word file: ${levelId}.json`);
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
const getLevelData = async (gameType: string, levelId: string): Promise<Level | null> => {
    console.log('Getting level data for:', levelId);
    try {
        const response = await fetch(`/data/${gameType}/levels.json`);
        if (!response.ok) {
            console.error('Failed to fetch word_levels.json:', response.status);
            return null;
        }
        
        const levels: Level[] = await response.json();
        return levels.find(level => level.id === levelId) || null;
    } catch (error) {
        console.error('Error getting level data:', error);
        return null;
    }
};

// Add this new interface near the top with other interfaces
interface WordTableItem {
    word: string;
    type: string;
    meaning: string;
}

export default function WordFlashGame({ gameType }: WordFlashGameProps) {
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
        return localStorage.getItem(`${gameType}_fastMode`) === 'true'
    });
    const audioService = useRef<AudioService>();
    const [showStatsPopup, setShowStatsPopup] = useState(false);
    const [showExamples, setShowExamples] = useState(() => {
        return localStorage.getItem(`${gameType}_showExamples`) === 'true'
    });
    const [showExamplesPopup, setShowExamplesPopup] = useState(false);
    const [levelDescription, setLevelDescription] = useState('');
    const [welcomeSlogan, setWelcomeSlogan] = useState('');
    const [showFireworks, setShowFireworks] = useState(false);
    const [shouldUpdateChoices, setShouldUpdateChoices] = useState(true);
    const [blindMode, setBlindMode] = useState(() => {
        return localStorage.getItem(`${gameType}_blindMode`) === 'true'
    });
    const [modalContent, setModalContent] = useState<string | null>(null);
    const [showWordTable, setShowWordTable] = useState(false);

    // Add reward ref for each choice button
    const { reward: rewardConfetti } = useReward('rewardConfetti', 'confetti', {
        elementCount: 75,
        spread: 45,
        startVelocity: 20,
    });

    const { reward: rewardBalloons } = useReward('rewardBalloons', 'balloons', {
        elementCount: 18,
        spread: 120,
        startVelocity: 40,
        decay: 0.9,
        lifetime: 200
    });

    // Initialize audio service
    useEffect(() => {
        audioService.current = new AudioService(audioRef);
    }, []);

    // Load word list
    useEffect(() => {
        const loadWords = async () => {
            console.log('Loading words for level:', levelId);
            if (!levelId) return;

            try {
                const level = await getLevelData(gameType, levelId);
                if (!level) {
                    console.error('Level not found');
                    return;
                }

                const levelNumber = level.id.replace(/\D/g, '');
                setLevelDescription(`Level ${levelNumber}`);
                
                const { default: words } = await loadWordFile(gameType, levelId);
                console.log('Loaded raw words:', words); // Debug log

                let preparedList = words.flatMap((word: WordData) =>
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
                        score: parseInt(getStorage(`${gameType}-${word.word}-${index}`) || '0')
                    }))
                );
                preparedList = sortWordList(preparedList);
                setWordList(preparedList);
                setCurrentIndex(0);
                setShouldUpdateChoices(true);
            } catch (error) {
                console.error('Error loading word list:', error);
            }
        };

        loadWords();
    }, [levelId, gameType]);

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
        console.log('masteredMeanings:', masteredMeanings);

        const notMasteredMeanings = wordList.filter(item => item.score <= 0);
        console.log('notMasteredMeanings:', notMasteredMeanings);

        const progress = totalMeanings > 0 ? ((masteredMeanings / totalMeanings) * 100).toFixed(2) : "0.00";
        console.log('progress:', progress);

        const wordsToReview = notMasteredMeanings.length;
        
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
            setStorage(`${gameType}-progress-${levelId}`, progress.toString());
            setStorage(`${gameType}-mastered-${levelId}`, masteredMeanings.toString());
            setStorage(`${gameType}-total-${levelId}`, totalMeanings.toString());
            
            console.log('Updated progress stats:', {
                levelId,
                progress: progress.toFixed(2),
                masteredMeanings,
                totalMeanings
            });
        }
    }, [wordList, levelId, gameType]);

    // Add useEffect to handle definition reading
    // Modify handleChoice to not automatically advance to next word when completing round
    const handleChoice = async (choice: string) => {
        if (isProcessing) return;
        setIsProcessing(true);
        
        const totalMeanings = wordList.length;
        console.log('totalMeanings:', totalMeanings);
        const isAnswerCorrect = choice === currentWord.meaning.meaning_zh_TW;
        setSelectedChoice(choice);
        if (isAnswerCorrect) {
            // 1/5 probability to show effect, randomly choose between confetti and balloons
            if (Math.random() < 0.5) {
                rewardConfetti()
            } else { 
             rewardBalloons();
            }
        }
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
            const cookieKey = `${gameType}-${currentWord.word}-${currentWord.meaning.meaningIndex}`;
            const currentScore = parseInt(getStorage(cookieKey) || '0');
            const newScore = currentScore + 1.0;
            setStorage(cookieKey, newScore.toString());

            // Update mastered words in localStorage
            if (newScore >= 1.0 && levelId) {  // Consider word mastered when score >= 1
                const storageKey = `${gameType}-mastered-${levelId}`;
                console.log('storageKey:', storageKey, "value:", localStorage.getItem(storageKey));
                let masteredWords = parseInt(localStorage.getItem(storageKey) || '0');
                console.log('masteredWords:', masteredWords);
                
                // Add the word-meaning pair if not already in the list
                const wordMeaningKey = `${currentWord.word}-${currentWord.meaning.meaningIndex}`;
                if (currentScore<=0 && newScore>=0) {
                    masteredWords++;
                    localStorage.setItem(storageKey, masteredWords.toString());
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
            
            // Check if level is completed
            const newProgress = Number(stats.progress);
            if (newProgress >= 100) {
                // Check if firework has been shown for this level
                const fireworkKey = `${gameType}-firework-${levelId}`;
                const hasPlayedFirework = localStorage.getItem(fireworkKey);
                
                if (!hasPlayedFirework) {
                    localStorage.setItem(fireworkKey, 'true');
                    setShowFireworks(true);
                    setIsProcessing(false);
                    return;
                }
            }

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
                const response = await fetch('/data/wordflash/slogans.txt');
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
        // Calculate previous index with wrap-around
        const prevIndex = (currentIndex - 1 + wordList.length) % wordList.length;
        setCurrentIndex(prevIndex);
        setSelectedChoice(null);
        setIsProcessing(false);
        setShouldUpdateChoices(true);
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
            const response = await fetch('/data/${gameType}/levels.json');
            if (!response.ok) {
                console.error('Failed to fetch word_levels.json:', response.status);
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
                const progress = Number(getStorage(`${levels[i].id}_progress`) ?? 0);
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
        const fireworkKey = `${gameType}-firework-${levelId}`;
        const hasPlayedFirework = localStorage.getItem(fireworkKey);

        if (Number(stats.progress) >= 100 && !showFireworks && !hasPlayedFirework) {
            setShowFireworks(true);
            localStorage.setItem(fireworkKey, 'true');
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

    const handleSkipLevel = () => {
        // Set score of all words to 1
        wordList.forEach(word => {
            const cookieKey = `${gameType}-${word.word}-${word.meaning.meaningIndex}`;
            setStorage(cookieKey, '1');
        });

        // Update mastered count in localStorage
        if (levelId) {
            const storageKey = `${gameType}-mastered-${levelId}`;
            localStorage.setItem(storageKey, wordList.length.toString());
            
            // Set progress to 100%
            setStorage(`${gameType}-progress-${levelId}`, '100');
        }

        // Navigate back to menu
        navigate(`/${gameType}`);
    };

    if (wordList.length === 0) return <div>Loading...</div>;

    const currentWord = wordList[currentIndex];

    return (
        <div className="word-flash-game">
            <div className="game-header">
                <button 
                    className="back-button"
                    onClick={() => navigate(`/${gameType}`)}
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
                        <div className="welcome-buttons">
                            <button 
                                className="start-button"
                                onClick={startGame}
                            >
                                吸口氣，開始！
                            </button>
                            <button 
                                className="skip-level-button"
                                onClick={() => setShowWordTable(true)}
                            >
                                感覺我可以不用做這關了
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <audio ref={audioRef} />
            
            <div className="word-section">
                <h1 className="word">
                    {blindMode && !selectedChoice 
                        ? '?'.repeat(currentWord.word.length)
                        : currentWord.word
                    }
                </h1>
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
                        {/* Add both reward spans for the correct choice */}
                        {choice === currentWord.meaning.meaning_zh_TW && (
                            <>
                                <span id="rewardConfetti" />
                                <span id="rewardBalloons" />
                            </>
                        )}
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
                        <span 
                          className="toggle-label"
                          onClick={() => setModalContent("快速模式：跳過發音，直接進入下一題")}
                        >
                          ⚡
                        </span>
                        <label className="toggle-switch">
                          <input
                            type="checkbox"
                            checked={fastMode}
                            onChange={(e) => {
                              setFastMode(e.target.checked);
                              localStorage.setItem(`${gameType}_fastMode`, e.target.checked.toString());
                            }}
                          />
                          <span className="toggle-slider"></span>
                        </label>
                    </div>

                    <div className="toggle-group">
                        <span 
                          className="toggle-label"
                          onClick={() => setModalContent("例句模式：答對後顯示例句")}
                        >
                          📖
                        </span>
                        <label className="toggle-switch">
                          <input
                            type="checkbox"
                            checked={showExamples}
                            onChange={(e) => {
                              setShowExamples(e.target.checked);
                              localStorage.setItem(`${gameType}_showExamples`, e.target.checked.toString());
                            }}
                          />
                          <span className="toggle-slider"></span>
                        </label>
                    </div>

                    <div className="toggle-group">
                        <span 
                          className="toggle-label"
                          onClick={() => setModalContent("聽力模式：隱藏單字，專注聽力")}
                        >
                          👂
                        </span>
                        <label className="toggle-switch">
                          <input
                            type="checkbox"
                            checked={blindMode}
                            onChange={(e) => {
                              setBlindMode(e.target.checked);
                              localStorage.setItem(`${gameType}_blindMode`, e.target.checked.toString());
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

            {/* Modal for displaying help messages */}
            <Modal isOpen={!!modalContent} onClose={() => setModalContent(null)}>
                <p>{modalContent}</p>
            </Modal>

            {showWordTable && (
                <div className="word-table-overlay">
                    <div className="word-table-popup">
                        <h3>要是你已經熟悉這些字，那就跳過這關吧！</h3>
                        <div className="word-table-container">
                            <table className="word-table">
                                <thead>
                                    <tr>
                                        <th>Word</th>
                                        <th>Type</th>
                                        <th>Meaning</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {wordList.map((item, index) => (
                                        <tr key={index}>
                                            <td>{item.word}</td>
                                            <td>{item.meaning.type}</td>
                                            <td>{item.meaning.meaning_zh_TW}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="word-table-buttons">
                            <button 
                                className="skip-confirm-button"
                                onClick={handleSkipLevel}
                            >
                                真的跳過
                            </button>
                            <button 
                                className="cancel-button"
                                onClick={() => {
                                    setShowWordTable(false);
                                    startGame();
                                }}
                            >
                                我還是練練吧！
                            </button>
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
