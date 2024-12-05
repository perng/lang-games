import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { setStorage, getStorage } from '../../../utils/storage';
import { IoArrowBack } from 'react-icons/io5';
import { Fireworks } from '@fireworks-js/react';
import { useReward } from 'react-rewards';
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
  const [showFireworks, setShowFireworks] = useState(false);

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

    // Store current score before updating
    const currentScore = currentQuestion.score;

    if (isAnswerCorrect) {
      // 1/5 probability to show effect, randomly choose between confetti and balloons
      if (Math.random() < 0.5) {
        rewardConfetti();
      } else {
        rewardBalloons();
      }
      
      // Update score
      const cookieKey = `vocabHero-${currentQuestion.id}`;
      const newScore = Math.max(-1, currentScore + 1);
      setStorage(cookieKey, newScore.toString());

      // Update questions list with new score
      const newQuestions = questions.map(q => 
        q.id === currentQuestion.id ? { ...q, score: newScore } : q
      );
      setQuestions(newQuestions);

      // Save progress
      const stats = calculateStats();
      setStorage(`vocabHero-progress-${levelId}`, stats.progress.toString());
    }

    // Play audio and wait
    await new Promise(resolve => setTimeout(resolve, 500));
    const audioPath = `/voices/english/${currentQuestion.answer.replace(/ /g, '_')}.mp3`;
    await playAudioWithDelay(audioPath);

    // Update questions answered count
    const newQuestionsAnswered = questionsAnswered + 1;
    setQuestionsAnswered(newQuestionsAnswered);

    setIsProcessing(false);
    setShowContinue(true);
    
    // Clear any existing timer
    if (continueTimerRef.current) {
      window.clearTimeout(continueTimerRef.current);
    }

    continueTimerRef.current = window.setTimeout(() => {
      // Calculate next index
      const nextIndex = (currentIndex + 1) % questions.length;
      const nextQuestion = questions[nextIndex];

      // If current score was low and next question has high score, resort
      if (currentScore < 1 && nextQuestion.score >= 1) {
        console.log('Resorting questions due to score transition');
        const sortedQuestions = [...questions];
        sortQuestions(sortedQuestions);
        setQuestions(sortedQuestions);
        setCurrentIndex(0);  // Start from beginning after sort
      } else {
        setCurrentIndex(nextIndex);
      }

      // Reset states
      setSelectedOption(null);
      setIsAnswering(false);
      setShowContinue(false);
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

  const getLevelNumber = (levelId: string) => {
    return levelId?.split('_').pop() || '';
  };

  // Memoize stats calculation
  const stats = useMemo(() => {
    const totalQuestions = questions.length;
    const masteredQuestions = questions.filter(q => q.score > 0).length;
    const progress = totalQuestions > 0 ? ((masteredQuestions / totalQuestions) * 100).toFixed(2) : "0.00";

    return {
      progress,
      totalQuestions,
      masteredQuestions
    };
  }, [questions]);

  // Check if fireworks were already shown for this level
  useEffect(() => {
    if (levelId) {
      const fireworkShown = getStorage(`vocabHero-firework-${levelId}`);
      if (stats.progress === "100.00" && !fireworkShown) {
        setShowFireworks(true);
        setStorage(`vocabHero-firework-${levelId}`, 'true');
        
        // Auto-close after 5 seconds
        setTimeout(() => {
          setShowFireworks(false);
          navigate('/vocab-hero');
        }, 5000);
      }
    }
  }, [stats.progress, levelId, navigate]);

  const handleFireworksClick = () => {
    setShowFireworks(false);
    navigate('/vocab-hero');
  };

  if (questions.length === 0) return <div>Loading...</div>;

  const currentQuestion = questions[currentIndex];
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
          {/* <button 
            className="previous-word-button"
            onClick={handlePreviousWord}
          >
            <IoArrowUpOutline size={20} />
          </button> */}
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
                  {option === currentQuestion.answer && (
                    <>
                      <span id="rewardConfetti" />
                      <span id="rewardBalloons" />
                    </>
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

      </div>

      <div className="progress-bar">
        <div 
          className="progress-fill" 
          style={{ width: `${stats.progress}%` }}
        />
      </div>

      <audio ref={audioRef} />

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
            <h2>恭喜!</h2>
            <p>你已完成本關卡!</p>
            <p>點擊任意處繼續</p>
          </div>
        </div>
      )}
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