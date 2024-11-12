import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import fruitsData from '../../data/fruits.json';
import './styles.css';
import { setCookie, getCookie } from '../../utils/cookies';
import '../../styles/missionBrief.css';
import '../../styles/explanationStyles.css';
import { logPageView, logEvent } from '../../utils/analytics';
import { useParams, useNavigate, useLocation } from 'react-router-dom';

// Article cycling options
// const ARTICLE_OPTIONS = ['', 'a', 'an', 'the'];
const NAMES_CHECK = new Set(['annie', 'wally', 'paula', 'peter', 'kenny', 'zealand', 'bobby', 'rita', 'willy'].map(name => name.toLowerCase()));
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
  index: number;
}

interface GameState {
  words: Word[];
  correctArticles: Map<number, string>;
  playerSelections: Map<number, string>;
  sentenceStarts: Set<number>;
}

export default function AnATheGame() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const fruitIndex = parseInt(id || '0');
  
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
    if (isNaN(fruitIndex) || fruitIndex < 0 || fruitIndex >= fruitsData.length) {
      navigate('/an-a-the');
    }
  }, [fruitIndex, navigate]);

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
      
      if (isArticle) {
        correctArticles.set(index, lowerWord);
        if (isSentenceStart && index + 1 < rawWords.length) {
          sentenceStarts.add(index + 1);
        }
      } else {
        if (isSentenceStart) {
          sentenceStarts.add(index);
        }
        words.push({
          text: word,
          isSentenceStart: isSentenceStart,
          index: index
        });
      }
      
      isFirstWord = false;
    });

    setGameState(prev => ({
      ...prev,
      words,
      correctArticles,
      sentenceStarts,
      playerSelections: new Map()
    }));
  };

  const toggleArticle = (index: number) => {
    if (results) return;
    
    setGameState(prev => {
      const newSelections = new Map(prev.playerSelections);
      const currentArticle = newSelections.get(index);
      
      // Cycle through articles: none -> a -> an -> the -> none
      if (!currentArticle) {
        newSelections.set(index, 'a');
      } else if (currentArticle === 'a') {
        newSelections.set(index, 'an');
      } else if (currentArticle === 'an') {
        newSelections.set(index, 'the');
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

  return (
    <div className="game-container">
      <div className="game-header">
        <button 
          onClick={() => setShowMissionBrief(true)}
          className="mission-brief-button"
        >
          <span>Mission Brief</span> 📜
        </button>
        <button 
          onClick={() => navigate('/an-a-the')} 
          className="article-list-button"
        >
          Story List
        </button>
      </div>

      <h2 className="story-title">
        {fruitsData[fruitIndex]?.title || 'Loading...'}
      </h2>

      <div className="game-content">
        <div className="text-container">
          {gameState.words.map((word, idx) => {
            const selectedArticle = gameState.playerSelections.get(word.index);
            const correctArticle = gameState.correctArticles.get(word.index - 1);
            const isName = NAMES_CHECK.has(word.text.toLowerCase());
            
            // Determine word capitalization
            let displayWord = word.text;
            if (isName) {
              // Keep the original case for names
              displayWord = word.text;
            } else if (word.isSentenceStart && !selectedArticle) {
              // Capitalize if it's sentence start and no article
              displayWord = word.text.charAt(0).toUpperCase() + word.text.slice(1).toLowerCase();
            } else {
              // Otherwise lowercase
              displayWord = word.text.toLowerCase();
            }
            
            return (
              <span
                key={idx}
                className={getWordClassName(word)}
                onClick={() => toggleArticle(word.index)}
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
        <div className="mission-brief-overlay">
          <div className="mission-brief-content">
            <div className="scroll-content">
              <h2>🏰 The Article Quest 👑</h2>
              
              <p>Greetings, Article Master! ⚔️</p>
              
              <p>Our sacred texts are missing their articles (a, an, the)! As a 
              member of the Article Defense Force, your mission is to restore these 
              missing articles to their rightful places. 📚✨</p>

              <h3>Sacred Rules of Articles 🛡️</h3>
              <ul>
                <li>🎯 Click words to cycle through article options</li>
                <li>🔮 Use 'a' before consonant sounds</li>
                <li>✨ Use 'an' before vowel sounds</li>
                <li>🌟 Use 'the' for specific or previously mentioned items</li>
              </ul>

              <h3>Examples of Power 📜</h3>
              <ul>
                <li>🎵 'a piano' (consonant sound)</li>
                <li>🦉 'an owl' (vowel sound)</li>
                <li>🌞 'the sun' (unique item)</li>
              </ul>

              <button 
                onClick={() => setShowMissionBrief(false)}
                className="close-mission-brief"
              >
                Begin Quest 🗡️
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}