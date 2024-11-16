import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { setCookie, getCookie } from '../../../utils/cookies';
import { WordData, WordWithScore } from '../types';
import './styles.css';

export default function WordFlashGame() {
    const navigate = useNavigate();
    const { levelId } = useParams<{ levelId: string }>();
    const [wordList, setWordList] = useState<WordWithScore[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [choices, setChoices] = useState<string[]>([]);
    const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
    const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    // Load and prepare word list
    useEffect(() => {
        const loadWords = async () => {
            if (!levelId) {
                console.error('No level ID provided');
                return;
            }

            try {
                // Remove 'level' from the levelId since it's already in the filename
                const dataId = levelId.replace('level', '');
                const levelData = (await import(`../../../data/WordFlash/word_flash_level_${dataId}.json`)).default;
                const preparedList: WordWithScore[] = [];
                
                // Flatten words and their meanings into a single list
                levelData.words.forEach((word: WordData) => {
                    word.meanings.forEach((meaning, index) => {
                        // Add index to the meaning
                        const meaningWithIndex = {
                            ...meaning,
                            index  // Add index to track which meaning this is
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

    // Sort function
    const sortWordList = (list: WordWithScore[]) => {
        list.sort((a, b) => {
            if (a.word === b.word) return Math.random() - 0.5;
            return a.score - b.score;
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

    // Handle choice selection
    const handleChoice = async (choice: string) => {
        if (isProcessing) return;
        setIsProcessing(true);
        
        const currentWord = wordList[currentIndex];
        const isAnswerCorrect = choice === currentWord.meaning.meaning_zh_TW;
        setSelectedChoice(choice);
        setIsCorrect(isAnswerCorrect);

        // Update cookie and word list
        const cookieKey = `${currentWord.word}-${currentWord.meaning.index}`;
        const currentScore = parseInt(getCookie(cookieKey) || '0');
        const newScore = Math.max(0, currentScore + (isAnswerCorrect ? 1 : -1));
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
            // log all stats
            console.log(`Progress: ${progress}%`);
            console.log(`Mastered Meanings: ${masteredMeanings}`);
            console.log(`Total Meanings: ${totalMeanings}`);

            setCookie(`wordFlash-progress-${levelId}`, progress);
            setCookie(`wordFlash-mastered-${levelId}`, masteredMeanings.toString());
            setCookie(`wordFlash-total-${levelId}`, totalMeanings.toString());
        }

        // Wait and show next word
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Resort every 20 words
        if ((currentIndex + 1) % 20 === 0) {
            const newList = [...newWordList];
            sortWordList(newList);
            setWordList(newList);
        }

        setCurrentIndex((prev) => (prev + 1) % wordList.length);
        setSelectedChoice(null);
        setIsCorrect(null);
        setIsProcessing(false);
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

    if (wordList.length === 0) return <div>Loading...</div>;

    const currentWord = wordList[currentIndex];
    const stats = calculateStats();

    return (
        <div className="word-flash-game">
            <button 
                className="back-button"
                onClick={() => navigate('/word-flash')}
            >
                Back to Word Flash Home
            </button>
            <h1 className="word">{currentWord.word}</h1>
            <div className="choices">
                {choices.map((choice, index) => (
                    <button
                        key={index}
                        onClick={() => handleChoice(choice)}
                        className={`
                            choice-button
                            ${selectedChoice === choice ? 
                                (choice === currentWord.meaning.meaning_zh_TW ? 'correct' : 'wrong') 
                                : ''}
                            ${selectedChoice && choice === currentWord.meaning.meaning_zh_TW ? 'correct' : ''}
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
                    <span className="stat-label">Progress:</span>
                    <span className="stat-value">{stats.progress}%</span>
                </div>
                <div className="stat-item">
                    <span className="stat-label">Total Word Definitions:</span>
                    <span className="stat-value">{stats.totalMeanings}</span>
                </div>
                <div className="stat-item">
                    <span className="stat-label">Words to Practice:</span>
                    <span className="stat-value">{stats.wordsToReview}</span>
                </div>
            </div>
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