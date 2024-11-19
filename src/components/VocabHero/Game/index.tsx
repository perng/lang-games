import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { setCookie, getCookie } from '../../../utils/cookies';
import { IoArrowBack } from 'react-icons/io5';
import { FaPlay } from 'react-icons/fa';
import './styles.css';

interface Question {
  id: string;
  sentence: string;
  answer: string;
  others: string[];
}

export default function VocabHeroGame() {
  const { levelId } = useParams<{ levelId: string }>();
  const level = levelId?.replace('level', '') || '';
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [options, setOptions] = useState<string[]>([]);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Load questions
  useEffect(() => {
    const loadQuestions = async () => {
      try {
        console.log('Loading level:', level);
        const response = await import(`../../../data/VocabHero/vocab_hero_level_${level}.json`);
        console.log('Loaded questions:', response.default);
        setQuestions(response.default);
      } catch (error) {
        console.error('Error loading questions:', error);
      }
    };

    if (level) {
      loadQuestions();
    }
  }, [level]);

  // Set options when current question changes
  useEffect(() => {
    if (questions.length > 0) {
      const currentQuestion = questions[currentIndex];
      const shuffledOptions = shuffleArray([
        currentQuestion.answer,
        ...currentQuestion.others
      ]);
      setOptions(shuffledOptions);
    }
  }, [currentIndex, questions]);

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
    console.log('Starting handleChoice with:', { choice, currentIndex });
    setIsProcessing(true);
    setIsTransitioning(true);

    const currentQuestion = questions[currentIndex];
    const isAnswerCorrect = choice === currentQuestion.answer;
    console.log('Answer check:', { 
        choice, 
        correctAnswer: currentQuestion.answer, 
        isAnswerCorrect 
    });

    setSelectedOption(choice);
    setIsCorrect(isAnswerCorrect);

    // Update progress in cookie
    const cookieKey = `vocabHero-${currentQuestion.id}`;
    const newScore = isAnswerCorrect ? 1 : -1;
    setCookie(cookieKey, newScore.toString());

    // Save overall progress
    const totalQuestions = questions.length;
    const masteredQuestions = questions.filter(q => 
        parseInt(getCookie(`vocabHero-${q.id}`) || '0') > 0
    ).length;
    const progress = (masteredQuestions / totalQuestions * 100.0).toFixed(4);
    setCookie(`vocabHero-progress-${level}`, progress);

    // Play the word audio after showing the result
    await new Promise(resolve => setTimeout(resolve, 500));
    const audioPath = `/voices/WordFlash/level${level}/${currentQuestion.answer}.mp3`;
    await playAudioWithDelay(audioPath);

    // Clear transition first
    setIsTransitioning(false);
    await new Promise(resolve => setTimeout(resolve, 50));

    // Then reset states
    setSelectedOption(null);
    setIsCorrect(null);
    
    // Finally move to next question
    await new Promise(resolve => setTimeout(resolve, 50));
    setCurrentIndex(prev => (prev + 1) % questions.length);
    setIsProcessing(false);
  };

  const startGame = () => {
    setShowWelcome(false);
  };

  const calculateStats = () => {
    const totalQuestions = questions.length;
    const masteredQuestions = questions.filter(q => 
      parseInt(getCookie(`vocabHero-${q.id}`) || '0') > 0
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

  if (questions.length === 0) return <div>Loading...</div>;

  const currentQuestion = questions[currentIndex];
  const stats = calculateStats();

  return (
    <div className="vocab-hero-game">
      <button 
        className="back-button"
        onClick={() => navigate('/vocab-hero')}
      >
        <IoArrowBack size={24} />
      </button>

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

      <div className="sentence-section">
        <p className="sentence">{currentQuestion.sentence}</p>
      </div>

      <div className="choices">
        {options.map((option, index) => (
          <button
            key={index}
            onClick={() => handleChoice(option)}
            className={`
              choice-button
              ${!isTransitioning ? '' : 
                  selectedOption === option ? 
                      (option === currentQuestion.answer ? 'correct' : 'wrong') 
                      : ''}
            `}
            disabled={isProcessing}
          >
            {option}
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
          <span className="stat-label">Remaining:</span>
          <span className="stat-value">{stats.questionsToReview}/{stats.totalQuestions}</span>
        </div>
      </div>

      <audio ref={audioRef} />
    </div>
  );
}

function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
} 