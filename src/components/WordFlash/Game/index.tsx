import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { setCookie, getCookie } from '../../../utils/cookies';
import { WordWithScore } from '../types';
import './styles.css';
import { FaPlay } from 'react-icons/fa';
import levelsData from '../../../data/WordFlash/levels.json';
import { IoArrowBack } from 'react-icons/io5';

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
    switch (wordFile) {
        case 'word_flash_level_1.json':
            return import('../../../data/WordFlash/word_flash_level_1.json') as Promise<WordFileData>;
        case 'word_flash_level_2.json':
            return import('../../../data/WordFlash/word_flash_level_2.json') as Promise<WordFileData>;
        case 'word_flash_level_3.json':
            return import('../../../data/WordFlash/word_flash_level_3.json') as Promise<WordFileData>;
        case 'word_flash_level_4.json':
            return import('../../../data/WordFlash/word_flash_level_4.json') as Promise<WordFileData>;
        case 'word_flash_level_5.json':
            return import('../../../data/WordFlash/word_flash_level_5.json') as Promise<WordFileData>;
        case 'word_flash_level_6.json':
            return import('../../../data/WordFlash/word_flash_level_6.json') as Promise<WordFileData>;
        default:
            throw new Error(`Unknown word file: ${wordFile}`);
    }
};

// Update the constant to handle both modes
const FAST_MODE_SLOGAN_INTERVAL = 25;  // Show slogan every 25 words in fast mode
const NORMAL_MODE_SLOGAN_INTERVAL = 5;  // Show slogan every 5 words in normal mode

export default function WordFlashGame() {
    const navigate = useNavigate();
    const { levelId } = useParams<{ levelId: string }>();
    const [wordList, setWordList] = useState<WordWithScore[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [choices, setChoices] = useState<string[]>([]);
    const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
    const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [hasUserInteracted, setHasUserInteracted] = useState(false);
    const [showWelcome, setShowWelcome] = useState(true);
    const [slogans, setSlogans] = useState<string[]>([]);
    const [showSlogan, setShowSlogan] = useState(false);
    const [currentSlogan, setCurrentSlogan] = useState('');
    const [readDefinition, setReadDefinition] = useState(true);
    const [fastMode, setFastMode] = useState(false);

    // Load and prepare word list
    useEffect(() => {
        const loadWords = async () => {
            if (!levelId) {
                console.error('No level ID provided');
                return;
            }

            try {
                const level = levelsData.levels.find(l => l.id === levelId);
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
                        const score = parseInt(getCookie(cookieKey) || '0');
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

    // Sort function to prioritize words with lower scores
    const sortWordList = (list: WordWithScore[]) => {
        list.sort((a, b) => {
            if (a.word === b.word) return Math.random() - 0.5;
            return a.score - b.score;  // Lower scores come first
        });
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
                    meaning: word.meaning.meaning_zh_TW,
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

    const playWordAudio = () => {
        if (wordList.length === 0) return;
        
        const currentWord = wordList[currentIndex];
        if (currentWord && levelId) {
            const audioPath = `/voices/WordFlash/${levelId.replace('word_flash', 'vocab_hero')}/${currentWord.word.replace(/ /g, '_')}.mp3`;            
            console.log('audioPath', audioPath);
            
            if (audioRef.current) {
                audioRef.current.src = audioPath;
                audioRef.current.play()
                    .then(() => {
                        // Audio played successfully
                    })
                    .catch(error => {
                        // Only log errors that aren't related to user interaction
                        if (error.name !== 'NotAllowedError') {
                            console.error('Error playing audio:', error.name);
                        }
                    });
            }
        }
    };

    // Play audio when word changes AND user has interacted
    useEffect(() => {
        if (hasUserInteracted && wordList.length > 0) {
            playWordAudio();
        }
    }, [currentIndex, hasUserInteracted]);

    // Add this helper function to play audio and wait for completion
    const playAudioWithDelay = (audioPath: string): Promise<void> => {
        return new Promise((resolve) => {
            if (audioRef.current) {
                audioRef.current.src = audioPath;
                
                // Handle audio completion
                audioRef.current.onended = () => {
                    // Add a fixed gap after audio completes
                    setTimeout(resolve, 500); // 500ms gap after audio
                };

                // Handle errors
                audioRef.current.onerror = () => {
                    console.error('Error playing audio:', audioPath);
                    resolve(); // Continue even if there's an error
                };

                audioRef.current.play().catch(error => {
                    if (error.name !== 'NotAllowedError') {
                        console.error('Error playing audio:', error);
                    }
                    resolve();
                });
            } else {
                resolve();
            }
        });
    };

    // Modify the handleChoice function
    const handleChoice = async (choice: string) => {
        setHasUserInteracted(true);
        if (isProcessing) return;
        setIsProcessing(true);
        
        const currentWord = wordList[currentIndex];
        const isAnswerCorrect = choice === currentWord.meaning.meaning_zh_TW;
        setSelectedChoice(choice);
        setIsCorrect(isAnswerCorrect);

        // Update cookie and word list with more punitive scoring for wrong answers
        const cookieKey = `${currentWord.word}-${currentWord.meaning.index}`;
        const currentScore = parseInt(getCookie(cookieKey) || '0');
        // set lower limit to -1 for score
        const newScore = Math.max(-1, currentScore + (isAnswerCorrect ? 1 : -1));  // -1 for wrong answers
        setCookie(cookieKey, newScore.toString());

        // Update wordList with new score
        const newWordList = wordList.map(word => {
            if (word.word === currentWord.word && word.meaning.index === currentWord.meaning.index) {
                return { ...word, score: newScore };
            }
            return word;
        });
        setWordList(newWordList);

        // Save progress after score update
        if (levelId) {
            const totalMeanings = newWordList.length;
            const masteredMeanings = newWordList.filter(item => item.score > 0).length;
            const progress = (masteredMeanings / totalMeanings * 100.0).toFixed(4);
            setCookie(`wordFlash-progress-${levelId}`, progress);
            setCookie(`wordFlash-mastered-${levelId}`, masteredMeanings.toString());
            setCookie(`wordFlash-total-${levelId}`, totalMeanings.toString());
        }

        try {
            if (fastMode) {
                // Fast mode: just wait 500ms and move to next word
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // Show slogan every 25 words in fast mode
                if ((currentIndex + 1) % FAST_MODE_SLOGAN_INTERVAL === 0) {
                    console.log('Showing slogan in fast mode');
                    const randomIndex = Math.floor(Math.random() * slogans.length);
                    setCurrentSlogan(slogans[randomIndex]);
                    setShowSlogan(true);
                    return; // Don't move to next word yet
                }
            } else {
                // Original behavior with all delays and audio
                await new Promise(resolve => setTimeout(resolve, 500));
                
                if (readDefinition) {
                    if (currentWord && levelId) {
                        const encodedDefinition = btoa(unescape(encodeURIComponent(currentWord.meaning.meaning_zh_TW)))
                            .replace(/\//g, '_')
                            .replace(/\+/g, '-')
                            .replace(/=/g, '');
                        const definitionPath = `/voices/WordFlash/${levelId.replace('word_flash', 'vocab_hero')}/chinese/${encodedDefinition}.mp3`;
                        
                        await playAudioWithDelay(definitionPath);
                    }
                }

                await new Promise(resolve => setTimeout(resolve, 700));
                
                if (currentWord && levelId) {
                    const dataId = levelId.replace('level', '');
                    const wordPath = `/voices/WordFlash/level${dataId}/${currentWord.word}.mp3`;
                    await playAudioWithDelay(wordPath);
                }

                await new Promise(resolve => setTimeout(resolve, 500));

                // Show slogan every 5 words in normal mode
                if ((currentIndex + 1) % NORMAL_MODE_SLOGAN_INTERVAL === 0) {
                    console.log('Showing slogan in normal mode');
                    const randomIndex = Math.floor(Math.random() * slogans.length);
                    setCurrentSlogan(slogans[randomIndex]);
                    setShowSlogan(true);
                    return; // Don't move to next word yet
                }
            }

            setSelectedChoice(null);
            setIsCorrect(null);
            
            setCurrentIndex((prev) => (prev + 1) % wordList.length);
            setIsProcessing(false);
        } catch (error) {
            console.error('Error handling choice:', error);
            setSelectedChoice(null);
            setIsCorrect(null);
            setIsProcessing(false);
        }
    };

    // Calculate stats
    const calculateStats = () => {
        const totalMeanings = wordList.length;
        const masteredMeanings = wordList.filter(item => item.score >= 1).length;
        const wordsToReview = wordList.filter(item => item.score < 1).length;
        
        return {
            progress: totalMeanings > 0 ? ((masteredMeanings / totalMeanings) * 100).toFixed(2) : "0.00",
            totalMeanings,
            wordsToReview
        };
    };

    const startGame = () => {
        setHasUserInteracted(true);
        setShowWelcome(false);
        playWordAudio(); // Play first word's audio immediately
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

    // Modify handleSloganClick to rebuild the word list
    const handleSloganClick = () => {
        setShowSlogan(false);
        
        // Create a new copy of the word list and sort it
        const newList = [...wordList];
        sortWordList(newList);
        setWordList(newList);
        
        // Reset states and move to next word
        setCurrentIndex(0);  // Start from beginning of newly sorted list
        setSelectedChoice(null);
        setIsCorrect(null);
        setIsProcessing(false);
    };

    if (wordList.length === 0) return <div>Loading...</div>;

    const currentWord = wordList[currentIndex];
    const stats = calculateStats();

    return (
        <div className="word-flash-game">
            <button 
                className="back-button"
                onClick={() => navigate('/word-flash')}
            >
                <IoArrowBack size={24} />
            </button>

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
                            playWordAudio();
                        }}
                        aria-label="Play pronunciation"
                    >
                        <FaPlay />
                    </button>
                </div>
            </div>
            <div className="choices" key={currentWord.word + currentIndex}>
                {choices.map((choice, index) => (
                    <button
                        key={index}
                        onClick={() => handleChoice(choice)}
                        className={`
                            choice-button
                            ${selectedChoice === choice && 
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
            {isCorrect !== null && (
                <div className={`feedback ${isCorrect ? 'correct' : 'wrong'}`}>
                    {isCorrect ? 'Correct!' : 'Wrong!'}
                </div>
            )}
            
            <div className="stats-section">
                <div className="stat-item">
                    <span className="stat-label">進度:</span>
                    <span className="stat-value">{stats.progress}%</span>
                </div>
                <div className="stat-item">
                    <span className="stat-label">尚餘:</span>
                    <span className="stat-value">{stats.wordsToReview}/{stats.totalMeanings}</span>                
                </div>
            </div>

            <div className="game-footer">
                <div className="toggle-container">
                    <label className="toggle-switch">
                        <input
                            type="checkbox"
                            checked={readDefinition}
                            onChange={(e) => setReadDefinition(e.target.checked)}
                        />
                        <span className="toggle-slider"></span>
                    </label>
                    <span className="toggle-label">讀中文定義</span>

                    <label className="toggle-switch">
                        <input
                            type="checkbox"
                            checked={fastMode}
                            onChange={(e) => setFastMode(e.target.checked)}
                        />
                        <span className="toggle-slider"></span>
                    </label>
                    <span className="toggle-label">快速模式</span>
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