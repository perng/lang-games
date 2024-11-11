import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import fruitsData from '../../data/fruits.json';
import './styles.css';
import { setCookie, getCookie, deleteCookie } from '../../utils/cookies';
import '../../styles/missionBrief.css';
import '../../styles/explanationStyles.css';

// Article cycling options
const ARTICLE_OPTIONS = ['', 'a', 'an', 'the'];
const NAMES = new Set(['Wally', 'Paula', 'Peter', 'Kenny', 'Zealand', 'Bobby', 'Rita']);
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

const ARTICLES = ['a', 'an', 'the'] as const;
type Article = typeof ARTICLES[number];

export default function AnATheGame() {
  const { id } = useParams();
  const navigate = useNavigate();
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

    setResults(gameResults);
    setTotalScore((gameResults.score.correct / (gameResults.score.correct + gameResults.score.missed)) * 100);
  };

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

  return (
    <div className="game-container">
      <div className="game-header">
        <button className="back-button" onClick={() => navigate('/games')}>
          Back
        </button>
        <h1>{fruit?.title || ''}</h1>
      </div>

      <div className="game-content">
        <div className="text-container">
          {gameState.words.map((word, idx) => {
            const selectedArticle = gameState.playerSelections.get(word.index);
            const correctArticle = gameState.correctArticles.get(word.index - 1);
            
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
                {word.text}
              </span>
            );
          })}
        </div>

        <div className="article-selector">
          <div className="article-buttons">
            {ARTICLES.map(article => (
              <button
                key={article}
                className="article-button"
                onClick={() => {
                  const selectedWord = gameState.words.find(w => 
                    gameState.playerSelections.get(w.index) === undefined
                  );
                  if (selectedWord) {
                    toggleArticle(selectedWord.index);
                  }
                }}
              >
                {article}
              </button>
            ))}
          </div>
        </div>

        <div className="controls">
          {!results ? (
            <button className="check-button" onClick={handleCheck}>Check</button>
          ) : (
            <div className="results-container">
              <div className="score-details">
                <p>✅ Correct: {results.score.correct}</p>
                <p>❌ Wrong: {results.score.errors}</p>
                <p>⚠️ Missed: {results.score.missed}</p>
                <p className="total-score">Total Score: {totalScore.toFixed(0)}%</p>
              </div>
              <button className="try-again-button" onClick={handleTryAgain}>
                Try Again
              </button>
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
    </div>
  );
}