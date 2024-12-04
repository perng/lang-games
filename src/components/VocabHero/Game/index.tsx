import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { setStorage, getStorage } from '../../../utils/storage';
import { IoArrowBack, IoArrowUpOutline } from 'react-icons/io5';
import './styles.css';

interface Question {
  id: string;
  sentence: string;
  sentence_zh_TW: string;
  word_translation_zh_TW: string;
  answer: string;
  others: string[];
  others_zh_TW: string[];
}

interface QuestionWithScore extends Question {
  score: number;
}

const BATCH = 5;  // Sort questions every 5 questions

export default function VocabHeroGame() {
  const { levelId } = useParams();
  // const level = levelId?.replace('level', '') || '';
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<QuestionWithScore[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [options, setOptions] = useState<string[]>([]);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [questionsAnswered, setQuestionsAnswered] = useState(0);
  const [isAnswering, setIsAnswering] = useState(false);
  const [showContinue, setShowContinue] = useState(false);
  const continueTimerRef = useRef<number>();

  const sortQuestions = (list: QuestionWithScore[]) => {
    // First shuffle the array
    list = shuffleArray(list);
    // Then sort by score
    list.sort((a, b) => {
      // If scores are equal, maintain random order from shuffle
      if (a.score === b.score) return 0;
      return a.score - b.score;  // Lower scores come first
    });
  };

  // Load questions
  useEffect(() => {
    const loadQuestions = async () => {
      try {
        console.log('Loading level:', levelId);
        const response = await import(`../../../data/VocabHero/${levelId}.json`);
        
        // Add scores to questions
        const questionsWithScores: QuestionWithScore[] = response.default.map((q: Question) => ({
          ...q,
          score: parseInt(getStorage(`vocabHero-${q.id}`) || '0')
        }));

        // Sort questions by score
        sortQuestions(questionsWithScores);
        setQuestions(questionsWithScores);
        
      } catch (error) {
        console.error('Error loading questions:', error);
      }
    };

    if (levelId) {
      loadQuestions();
    }
  }, [levelId]);

  // Set options when current question changes
  useEffect(() => {
    if (questions.length > 0 && !isAnswering) {
      const currentQuestion = questions[currentIndex];
      const shuffledOptions = shuffleArray([
        currentQuestion.answer,
        ...currentQuestion.others
      ]);
      setOptions(shuffledOptions);
    }
  }, [currentIndex, questions, isAnswering]);

  const playAudioWithDelay = (audioPath: string): Promise<void> => {
    return new Promise((resolve) => {
      if (audioRef.current) {
        audioRef.current.src = audioPath;
        
        audioRef.current.onended = () => {
          setTimeout(resolve, 500);
        };

        audioRef.current.onerror = () => {
          console.error('Error playing audio:', audioPath);
          resolve();
        };

        audioRef.current.play().catch(error => {
          console.error('Error playing audio:', error);
          resolve();
        });
      } else {
        resolve();
      }
    });
  };

  const handleChoice = async (choice: string) => {
    if (isProcessing) {
      console.log('Processing in progress, ignoring click');
      return;
    }
    setIsProcessing(true);
    setIsAnswering(true);

    const currentQuestion = questions[currentIndex];
    const isAnswerCorrect = choice === currentQuestion.answer;
    setSelectedOption(choice);
    setIsCorrect(isAnswerCorrect);

    // Update score
    const cookieKey = `vocabHero-${currentQuestion.id}`;
    const currentScore = currentQuestion.score;
    const newScore = Math.max(-1, currentScore + (isAnswerCorrect ? 1 : -1));
    console.log('Updating score for', currentQuestion.answer, 'from', currentScore, ' to', newScore);
    setStorage(cookieKey, newScore.toString());

    // Update questions list with new score
    const newQuestions = questions.map(q => 
      q.id === currentQuestion.id ? { ...q, score: newScore } : q
    );
    setQuestions(newQuestions);

    // Play audio and wait
    await new Promise(resolve => setTimeout(resolve, 500));
    const audioPath = `/voices/english/${currentQuestion.answer.replace(/ /g, '_')}.mp3`;
    await playAudioWithDelay(audioPath);

    // Update questions answered count
    const newQuestionsAnswered = questionsAnswered + 1;
    setQuestionsAnswered(newQuestionsAnswered);

    setIsProcessing(false);
    setShowContinue(true);  // Show continue button after processing
    
    // Start 5-second timer for auto-advance
    continueTimerRef.current = window.setTimeout(() => {
        handleContinue();
    }, 5000);
  };

  const handleContinue = () => {
    // Clear the timer if it exists
    if (continueTimerRef.current) {
        window.clearTimeout(continueTimerRef.current);
    }

    // Sort and reset if we've hit the batch size
    if (questionsAnswered % BATCH === 0) {
      console.log('Batch complete, resorting questions');
      const sortedQuestions = [...questions];
      sortQuestions(sortedQuestions);
      setQuestions(sortedQuestions);
      setCurrentIndex(0);  // Start from beginning of newly sorted list
    } else {
      // Otherwise just move to next question
      setCurrentIndex(prev => (prev + 1) % questions.length);
    }

    // Reset states
    setSelectedOption(null);
    setIsCorrect(null);
    setIsAnswering(false);
    setShowContinue(false);  // Hide continue button
  };

  const startGame = () => {
    setShowWelcome(false);
  };

  const calculateStats = () => {
    const totalQuestions = questions.length;
    const masteredQuestions = questions.filter(q => 
      parseInt(getStorage(`vocabHero-${q.id}`) || '0') > 0
    ).length;
    const questionsToReview = totalQuestions - masteredQuestions;

    return {
      progress: totalQuestions > 0 ? ((masteredQuestions / totalQuestions) * 100).toFixed(2) : "0.00",
      totalQuestions,
      questionsToReview
    };
  };

  useEffect(() => {
    console.log('State update:', { 
        selectedOption, 
        isCorrect, 
        currentIndex,
        isProcessing 
    });
  }, [selectedOption, isCorrect, currentIndex, isProcessing]);

  // Add debug logging whenever currentIndex changes
  useEffect(() => {
    if (questions.length > 0) {
      console.log('Next 3 questions:');
      const nextQuestions = [];
      let index = currentIndex;
      for (let i = 0; i < 3 && i < questions.length; i++) {
        const question = questions[index];
        nextQuestions.push({
          answer: question.answer,
          score: question.score,
          sentence: question.sentence.substring(0, 30) + '...' // Show first 30 chars of sentence
        });
        index = (index + 1) % questions.length;
      }
      console.table(nextQuestions);
    }
  }, [currentIndex, questions]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
        if (continueTimerRef.current) {
            window.clearTimeout(continueTimerRef.current);
        }
    };
  }, []);

  const handlePreviousWord = () => {
    if (continueTimerRef.current) {
      window.clearTimeout(continueTimerRef.current);
    }
    setCurrentIndex(prev => (prev - 1 + questions.length) % questions.length);
    setSelectedOption(null);
    setIsCorrect(null);
    setIsAnswering(false);
    setShowContinue(false);
  };

  const getLevelNumber = (levelId: string) => {
    return levelId?.split('_').pop() || '';
  };

  if (questions.length === 0) return <div>Loading...</div>;

  const currentQuestion = questions[currentIndex];
  const stats = calculateStats();
  console.log(stats);

  return (
    <div className="vocab-hero-game">
      <header className="menu-header">
        <div className="header-content">
          <button 
            className="back-button"
            onClick={() => navigate('/vocab-hero')}
          >
            <IoArrowBack size={20} />
          </button>
          <h1>單字練習 Level-{getLevelNumber(levelId || '')}</h1>
          <button 
            className="previous-word-button"
            onClick={handlePreviousWord}
          >
            <IoArrowUpOutline size={20} />
          </button>
        </div>
      </header>

      {showWelcome && (
        <div className="welcome-overlay">
          <div className="welcome-content">
            <h2>Ready to Begin?</h2>
            <p>Fill in the blanks with the correct word.</p>
            <button 
              className="start-button"
              onClick={startGame}
            >
              Start
            </button>
          </div>
        </div>
      )}

      <div className="game-content">
        <div className="sentence-section">
          <p className="sentence" 
             dangerouslySetInnerHTML={{
               __html: selectedOption 
                 ? currentQuestion.sentence.replace(
                     "______", 
                     `<u>${currentQuestion.answer} (${currentQuestion.word_translation_zh_TW})</u>`
                   )
                 : currentQuestion.sentence
             }}
          />
          {selectedOption && (
            <p className="sentence-translation">
              {currentQuestion.sentence_zh_TW}
            </p>
          )}
        </div>

        <div className="choices-container">
          <div className="choices">
            {options.map((option) => {
              // Find Chinese translation for the option
              let translation = '';
              if (selectedOption) {
                if (option === currentQuestion.answer) {
                  translation = currentQuestion.word_translation_zh_TW;
                } else {
                  const index = currentQuestion.others.indexOf(option);
                  if (index !== -1) {
                    translation = currentQuestion.others_zh_TW[index];
                  }
                }
              }

              return (
                <button
                  key={option}
                  onClick={() => handleChoice(option)}
                  className={`
                    choice-button
                    ${selectedOption === option && 
                        (option === currentQuestion.answer ? 'correct' : 'wrong')}
                    ${selectedOption && 
                        option === currentQuestion.answer ? 'correct' : ''}
                  `}
                  disabled={isProcessing || showContinue}
                >
                  {option}
                  {selectedOption && translation && (
                    <span className="translation">
                      ({translation})
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {showContinue && (
          <div className="continue-container">
            <button 
              className="continue-button"
              onClick={handleContinue}
            >
              Continue
            </button>
          </div>
        )}

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
            <span className="stat-label">Remaining:</span>
            <span className="stat-value">{stats.questionsToReview}/{stats.totalQuestions}</span>
          </div>
        </div>
      </div>

      <div className="progress-bar">
        <div 
          className="progress-fill" 
          style={{ width: `${stats.progress}%` }}
        />
      </div>

      <audio ref={audioRef} />
    </div>
  );
}

function shuffleArray<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
} 