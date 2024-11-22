import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { setCookie, getCookie } from '../../../utils/cookies';
import { WordWithScore } from '../types';
import './styles.css';
import { FaPlay } from 'react-icons/fa';
import levelsData from '../../../data/WordFlash/levels.json';
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

export default function WordFlashGame() {
    console.log('Initializing WordFlashGame');

    const navigate = useNavigate();
    const { levelId } = useParams<{ levelId: string }>();
    const [wordList, setWordList] = useState<WordWithScore[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [choices, setChoices] = useState<string[]>([]);
    const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
    const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const audioRef = useRef<HTMLAudioElement>(null);
    const [hasUserInteracted, setHasUserInteracted] = useState(false);
    const [showWelcome, setShowWelcome] = useState(true);
    const [slogans, setSlogans] = useState<string[]>([]);
    const [showSlogan, setShowSlogan] = useState(false);
    const [currentSlogan, setCurrentSlogan] = useState('');
    const [readDefinition, setReadDefinition] = useState(true);
    const [fastMode, setFastMode] = useState(false);
    const continueTimerRef = useRef<number>();
    const audioService = useRef<AudioService>();
    const [eatenDots, setEatenDots] = useState(0);
    const [completedRounds, setCompletedRounds] = useState(0);
    const [isReturning, setIsReturning] = useState(false);
    const [wordsInRound, setWordsInRound] = useState(0);
    const [correctWordsInRound, setCorrectWordsInRound] = useState(0);

    // Initialize audio service
    useEffect(() => {
        audioService.current = new AudioService(audioRef);
    }, []);

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
            console.log('Next 2 words:');
            const nextWords = [];
            let index = currentIndex;
            for (let i = 0; i < 2 && i < wordList.length; i++) {
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

    // Play word when it changes
    useEffect(() => {
        if (hasUserInteracted && wordList.length > 0 && currentWord && levelId && !isProcessing) {
            const wordPath = `/voices/WordFlash/${levelId.replace('word_flash', 'vocab_hero')}/${currentWord.word}.mp3`;
            audioService.current?.playAudio(wordPath);
        }
    }, [currentIndex, hasUserInteracted, wordList.length, isProcessing]);

    const handlePlayButton = () => {
        if (currentWord && levelId && audioService.current) {
            console.log('Play button clicked for word:', currentWord.word);
            const wordPath = `/voices/WordFlash/${levelId.replace('word_flash', 'vocab_hero')}/${currentWord.word}.mp3`;
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
        const masteredMeanings = wordList.filter(item => item.score >= 1).length;
        const wordsToReview = wordList.filter(item => item.score < 1).length;
        
        return {
            progress: totalMeanings > 0 ? ((masteredMeanings / totalMeanings) * 100).toFixed(2) : "0.00",
            totalMeanings,
            wordsToReview
        };
    }, [wordList]);

    // Add useEffect to handle definition reading
    // Modify handleChoice to not automatically advance to next word when completing round
    const handleChoice = async (choice: string) => {
        if (isProcessing) return;
        setIsProcessing(true);
        
        const currentWord = wordList[currentIndex];
        const isAnswerCorrect = choice === currentWord.meaning.meaning_zh_TW;
        setSelectedChoice(choice);
        setIsCorrect(isAnswerCorrect);

        // Read definition, pause, then play word
        if (readDefinition && hasUserInteracted && audioService.current && levelId && !fastMode) {
            // Read definition
            await audioService.current.speakText(currentWord.meaning.meaning_zh_TW);
            
            // Pause for 0.7 seconds
            await new Promise(resolve => setTimeout(resolve, 700));
            
            // Play word pronunciation
            const wordPath = `/voices/WordFlash/${levelId.replace('word_flash', 'vocab_hero')}/${currentWord.word}.mp3`;
            await audioService.current.playAudio(wordPath);
        } else {    
            await new Promise(resolve => setTimeout(resolve, 700));
        }

        if (isAnswerCorrect) {
            // Update cookie score when answer is correct
            const cookieKey = `${currentWord.word}-${currentWord.meaning.index}`;
            const currentScore = parseInt(getCookie(cookieKey) || '0');
            setCookie(cookieKey, (currentScore + 1).toString());
            console.log(`Updated score for ${currentWord.word} to ${currentScore + 1}`);

            // Update wordList with new score
            setWordList(prevList => {
                return prevList.map(word => {
                    if (word.word === currentWord.word && 
                        word.meaning.index === currentWord.meaning.index) {
                        return { ...word, score: currentScore + 1 };
                    }
                    return word;
                });
            });

            const nextCorrectWords = correctWordsInRound + 1;
            setCorrectWordsInRound(nextCorrectWords);
            
            if (nextCorrectWords < 10) {
                setEatenDots(nextCorrectWords);
                await new Promise(resolve => setTimeout(resolve, 500));
                setSelectedChoice(null);
                setIsCorrect(null);
                setIsProcessing(false);
                setCurrentIndex((prev) => (prev + 1) % wordList.length);
            } else if (nextCorrectWords === 10) {
                await new Promise(resolve => setTimeout(resolve, 2000));
                const randomIndex = Math.floor(Math.random() * slogans.length);
                setCurrentSlogan(slogans[randomIndex]);
                setShowSlogan(true);
                setIsProcessing(false);
            }
        } else {
            await new Promise(resolve => setTimeout(resolve, 500));
            setSelectedChoice(null);
            setIsCorrect(null);
            setIsProcessing(false);
            setCurrentIndex((prev) => (prev + 1) % wordList.length);
        }
    };

    const startGame = () => {
        setHasUserInteracted(true);
        setShowWelcome(false);
        if (currentWord && levelId) {
            const wordPath = `/voices/WordFlash/${levelId.replace('word_flash', 'vocab_hero')}/${currentWord.word}.mp3`;
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
    const handleSloganClick = () => {
        setShowSlogan(false);
        setIsReturning(true);
        
        setTimeout(() => {
            setCompletedRounds(prev => prev + 1);
            setEatenDots(0);
            setCorrectWordsInRound(0);
            setIsReturning(false);
            setSelectedChoice(null);
            setIsCorrect(null);
            setIsProcessing(false);
            setCurrentIndex((prev) => (prev + 1) % wordList.length);
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
        setIsCorrect(null);
        setIsProcessing(false);
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
                    className={`pacman ${isReturning ? 'returning' : ''}`}
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
                        {[...Array(5)].map((_, index) => (
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
                        {[...Array(5)].map((_, index) => (
                            <div 
                                key={index}
                                className={`ghost ${index < Math.floor(completedRounds/2) ? 'visible' : ''}`}
                            />
                        ))}
                    </div>
                </div>
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
                        <p>點擊繼續</p>
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