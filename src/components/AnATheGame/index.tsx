import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import fruitsData from '../../data/fruits.json';
import './styles.css';
import { setCookie, getCookie } from '../../utils/cookies';
import '../../styles/missionBrief.css';
import '../../styles/explanationStyles.css';
import { logPageView, logEvent } from '../../utils/analytics';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { createSpark } from '../../utils/sparks';
import { IoArrowBack } from 'react-icons/io5';

// Article cycling options
// const ARTICLE_OPTIONS = ['', 'a', 'an', 'the'];
const NAMES_CHECK = new Set(['annie', 'wally', 'paula', 'peter', 'kenny', 'zealand', 'bobby', 'rita', 'willy', 'olivia'].map(name => name.toLowerCase()));
//const NAMES_DISPLAY = new Set(['Annie', 'Wally', 'Paula', 'Peter', 'Kenny', 'Zealand', 'Bobby', 'Rita', 'Willy']);
// Define GameResults type
interface GameResults {
  correct: number[];
  errors: number[];
  missed: number[];
  score: {
    correct: number;
    errors: number;
    missed: number;
  };
}

interface Word {
  text: string;
  isSentenceStart: boolean;
  isFirstNonArticleWord: boolean;
  index: number;
  originalText?: string;
}

interface GameState {
  words: Word[];
  correctArticles: Map<number, string>;
  playerSelections: Map<number, string>;
  sentenceStarts: Set<number>;
}

export default function AnATheGame() {
  const { storyId } = useParams();
  console.log('useParams id:', storyId, typeof storyId);
  const navigate = useNavigate();
  const location = useLocation();
  const fruitIndex = parseInt(storyId || '0');
  
  const [gameState, setGameState] = useState<GameState>({
    words: [],
    correctArticles: new Map(),
    playerSelections: new Map(),
    sentenceStarts: new Set()
  });
  const [results, setResults] = useState<GameResults | null>(null);
  const [totalScore, setTotalScore] = useState(0);
  const [showMissionBrief, setShowMissionBrief] = useState(false);
  const [currentExplanation, setCurrentExplanation] = useState<'en-US' | 'zh-TW' | null>(null);

  useEffect(() => {
    console.log('Current fruitIndex:', fruitIndex);
    
    if (storyId === undefined || isNaN(fruitIndex) || fruitIndex < 0 || fruitIndex >= fruitsData.length) {
      console.log('Redirecting due to invalid index');
      navigate('/an-a-the');
    }
  }, [storyId, fruitIndex, navigate]);

  const fruit = fruitsData[fruitIndex];

  useEffect(() => {
    if (fruit) {
      initializeGame(fruit);
    }
  }, [fruit]);

  const initializeGame = (fruit: { title: string; content: string }) => {
    const words: Word[] = [];
    const correctArticles = new Map<number, string>();
    const sentenceStarts = new Set<number>();
    
    const rawWords = fruit.content.split(/\s+/);
    let isFirstWord = true;
    
    rawWords.forEach((word, index) => {
      const lowerWord = word.toLowerCase();
      const isArticle = ['a', 'an', 'the'].includes(lowerWord);
      const isSentenceStart = isFirstWord || 
                           (index > 0 && /[.!?]$/.test(rawWords[index - 1]));
      const isName = NAMES_CHECK.has(lowerWord);
      
      if (isArticle) {
        correctArticles.set(index, isSentenceStart 
          ? lowerWord.charAt(0).toUpperCase() + lowerWord.slice(1)
          : lowerWord);
          
        if (isSentenceStart && index + 1 < rawWords.length) {
          sentenceStarts.add(index + 1);
        }
      } else {
        if (isSentenceStart) {
          sentenceStarts.add(index);
        }
        words.push({
          text: isName ? word : word.toLowerCase(),
          originalText: word,
          isSentenceStart,
          isFirstNonArticleWord: index > 0 && 
            ['a', 'an', 'the'].includes(rawWords[index - 1].toLowerCase()) && 
            (index === 1 || /[.!?]$/.test(rawWords[index - 2])),
          index
        });
      }
      
      if (!isArticle) {
        isFirstWord = false;
      }
    });

    setGameState({
      words,
      correctArticles,
      sentenceStarts,
      playerSelections: new Map()
    });
  };

  const toggleArticle = (index: number, e: React.MouseEvent) => {
    if (results) return;
    
    createSpark(e.clientX, e.clientY);
    
    setGameState(prev => {
      const newSelections = new Map(prev.playerSelections);
      const currentArticle = newSelections.get(index);
      // Check if the current word is at sentence start
      const isSentenceStart = prev.sentenceStarts.has(index);
      
      // Cycle through articles: none -> a -> an -> the -> none
      if (!currentArticle) {
        newSelections.set(index, isSentenceStart ? 'A' : 'a');
      } else if (currentArticle.toLowerCase() === 'a') {
        newSelections.set(index, isSentenceStart ? 'An' : 'an');
      } else if (currentArticle.toLowerCase() === 'an') {
        newSelections.set(index, isSentenceStart ? 'The' : 'the');
      } else {
        newSelections.delete(index);
      }

      return {
        ...prev,
        playerSelections: newSelections
      };
    });
  };

  const handleCheck = () => {
    const gameResults: GameResults = {
      correct: [],
      errors: [],
      missed: [],
      score: {
        correct: 0,
        errors: 0,
        missed: 0
      }
    };

    gameState.words.forEach(word => {
      const correctArticle = gameState.correctArticles.get(word.index - 1);
      const selectedArticle = gameState.playerSelections.get(word.index);
      
      if (correctArticle) {
        if (selectedArticle === correctArticle) {
          gameResults.correct.push(word.index);
          gameResults.score.correct++;
        } else {
          gameResults.missed.push(word.index);
          gameResults.score.missed++;
        }
      } else if (selectedArticle) {
        gameResults.errors.push(word.index);
        gameResults.score.errors++;
      }
    });

    const points = gameResults.score.correct - gameResults.score.errors;
    const totalArticles = gameResults.score.correct + gameResults.score.missed;
    const percentage = totalArticles > 0 ? Math.round((points / totalArticles) * 100) : 0;
    
    const cookieName = `a-an-the-${fruitIndex}`;
    console.log('Saving score to cookie:', cookieName, percentage);
    setCookie(cookieName, percentage.toString());
    
    // Verify cookie was set
    const savedScore = getCookie(cookieName);
    console.log('Verified saved score:', savedScore);

    if (savedScore !== percentage.toString()) {
      console.error('Cookie not saved correctly!', {
        expected: percentage.toString(),
        actual: savedScore
      });
    }

    setResults(gameResults);
    setTotalScore(percentage);

    // Log the score to GA
    logEvent('Game', `AnAThe Game Score: ${percentage}%`);
  };

  // Add useEffect to check cookie on component mount
  useEffect(() => {
    const cookieName = `anATheGame_score_${fruitIndex}`;
    const savedScore = getCookie(cookieName);
    console.log('Initial cookie check:', cookieName, savedScore);
  }, [fruitIndex]);

  const handleTryAgain = () => {
    setResults(null);
    if (fruit) {
      initializeGame(fruit);
    }
  };

  const getWordClassName = (word: Word): string => {
    const classes = ['word'];
    
    if (results) {
      if (results.correct.includes(word.index)) {
        classes.push('correct');
      } else if (results.errors.includes(word.index)) {
        classes.push('error');
      } else if (results.missed.includes(word.index)) {
        classes.push('missed');
      }
    } else if (gameState.playerSelections.has(word.index)) {
      classes.push('selected');
    }
    
    return classes.join(' ');
  };

  const handleExplanationClick = (language: 'en-US' | 'zh-TW') => {
    setCurrentExplanation(currentExplanation === language ? null : language);
  };

  useEffect(() => {
    logPageView(location.pathname);
  }, [location]);

  const handleMissionBriefClick = () => {
    logEvent('UI', 'AnAThe Game Mission Brief Opened');
    setShowMissionBrief(true);
  };

  return (
    <div className="game-container">
      <button 
        className="back-button"
        onClick={() => navigate('/an-a-the')}
      >
        <IoArrowBack size={20} />
      </button>

      <span 
        onClick={handleMissionBriefClick}
        className="mission-brief-link"
      >
        📜
      </span>

      <h2 className="story-title">
        {fruitsData[fruitIndex]?.title || 'Loading...'}
      </h2>

      <div className="game-content">
        <div className="text-container">
          {gameState.words.map((word, idx) => {
            const selectedArticle = gameState.playerSelections.get(word.index);
            const correctArticle = gameState.correctArticles.get(word.index - 1);
            const isName = NAMES_CHECK.has(word.text.toLowerCase());
            
            // Determine word display
            let displayWord = isName 
              ? word.originalText || word.text  // Use original casing for names
              : ((word.isSentenceStart || word.isFirstNonArticleWord) && !selectedArticle)
                ? word.text.charAt(0).toUpperCase() + word.text.slice(1)
                : word.text.toLowerCase();
            
            return (
              <span
                key={idx}
                className={getWordClassName(word)}
                onClick={(e) => toggleArticle(word.index, e)}
              >
                {results ? (
                  <>
                    {correctArticle && !selectedArticle && (
                      <span className="article missed">
                        {word.isSentenceStart 
                          ? correctArticle.charAt(0).toUpperCase() + correctArticle.slice(1)
                          : correctArticle} {' '}
                      </span>
                    )}
                    {selectedArticle && (
                      <span className="article">
                        {selectedArticle !== correctArticle ? (
                          <del>
                            {word.isSentenceStart 
                              ? selectedArticle.charAt(0).toUpperCase() + selectedArticle.slice(1)
                              : selectedArticle} {' '}
                          </del>
                        ) : (
                          <>
                            {word.isSentenceStart 
                              ? selectedArticle.charAt(0).toUpperCase() + selectedArticle.slice(1)
                              : selectedArticle} {' '}
                          </>
                        )}
                      </span>
                    )}
                  </>
                ) : (
                  selectedArticle && (
                    <span className="article">
                      {word.isSentenceStart 
                        ? selectedArticle.charAt(0).toUpperCase() + selectedArticle.slice(1)
                        : selectedArticle} {' '}
                    </span>
                  )
                )}
                {displayWord}
              </span>
            );
          })}
        </div>

        <div className="controls">
          {!results ? (
            <button onClick={handleCheck} className="check-button">
              Check Answers
            </button>
          ) : (
            <div className="results-container">
              <div className="score-details">
                <p>✅ Correct: {results.score.correct}</p>
                <p>❌ Wrong: {results.score.errors}</p>
                <p>💡 Missed: {results.score.missed}</p>
                <p className="total-score">Total Score: {totalScore.toFixed(0)}%</p>
              </div>
              <div className="results-actions">
                <button 
                  onClick={handleTryAgain}
                  className="try-again-button"
                >
                  Try Again
                </button>
                <button 
                  onClick={() => handleExplanationClick('en-US')}
                  className={`explanation-button ${currentExplanation === 'en-US' ? 'active' : ''}`}
                >
                  Show Explanation
                </button>
                <button 
                  onClick={() => handleExplanationClick('zh-TW')}
                  className={`explanation-button ${currentExplanation === 'zh-TW' ? 'active' : ''}`}
                >
                  顯示說明
                </button>
              </div>

              {currentExplanation === 'en-US' && (
                <div className="explanation-content">
                  <ReactMarkdown>
                    {fruitsData[fruitIndex]['explanation-en-US']}
                  </ReactMarkdown>
                </div>
              )}

              {currentExplanation === 'zh-TW' && (
                <div className="explanation-content">
                  <ReactMarkdown>
                    {fruitsData[fruitIndex]['explanation-zh-TW']}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="progress">
        Story {fruitIndex + 1} of {fruitsData.length}
      </div>

      {fruitIndex === fruitsData.length - 1 && results && (
        <div className="final-score">
          <h2>Game Complete!</h2>
          <p>Final Score: {totalScore}</p>
          <button onClick={() => {
            navigate(`/an-a-the/${0}`);
            setTotalScore(0);
          }}>
            Play Again
          </button>
        </div>
      )}

      {showMissionBrief && (
        <div 
          className="mission-brief-overlay"
          onClick={() => setShowMissionBrief(false)}
        >
          <div className="mission-brief-content">
            <div className="scroll-content">
              <h2>🎯 Mission: The Article Adventure 📚</h2>
              <p>Welcome, Article Explorer! 🌟</p>
              
              <p>Your mission is to master the art of choosing between 'a', 'an', and 'the'. 
              Each choice you make shapes the clarity of our language! 🎨</p>

              <h3>Your Quest Rules 📜</h3>
              <ul>
                <li>🎯 Choose 'a' before consonant sounds</li>
                <li>🎵 Choose 'an' before vowel sounds</li>
                <li>✨ Choose 'the' for specific or unique items</li>
              </ul>

              <h3>Power Levels 🌟</h3>
              <ul>
                <li>⭐⭐⭐ 90%+ : Article Master</li>
                <li>⭐⭐ 70-89% : Article Adept</li>
                <li>⭐ Below 70% : Article Apprentice</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}