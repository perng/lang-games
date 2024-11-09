import { useState, useEffect } from 'react';
import type { WordInfo, GameResults } from '../../types';
import articlesData from '../../data/articles.json';
import './styles.css';
import { useParams, useNavigate } from 'react-router-dom';
import { setCookie } from '../../utils/cookies';

interface GameState {
  words: WordInfo[];
  correctThePositions: Set<number>;
  playerSelections: Set<number>;
  sentenceStarts: Set<number>;
}

function ArticleGame() {
  const { storyId } = useParams();
  const navigate = useNavigate();
  const articleIndex = parseInt(storyId || '0');

  useEffect(() => {
    if (isNaN(articleIndex) || articleIndex < 0 || articleIndex >= articlesData.length) {
      navigate('/article-game');
    }
  }, [articleIndex, navigate]);

  const [gameState, setGameState] = useState<GameState>({
    words: [],
    correctThePositions: new Set(),
    playerSelections: new Set(),
    sentenceStarts: new Set()
  });
  const [results, setResults] = useState<GameResults | null>(null);
  const [totalScore, setTotalScore] = useState(0);
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    initializeGame(articlesData[articleIndex]);
  }, [articleIndex]);

  const initializeGame = (article: { title: string; content: string }) => {
    const words: WordInfo[] = [];
    const correctThePositions = new Set<number>();
    const sentenceStarts = new Set<number>();
    
    const rawWords = article.content.split(/\s+/);
    let isFirstWord = true;
    
    rawWords.forEach((word, index) => {
      const isThe = word.toLowerCase() === 'the';
      const isSentenceStart = isFirstWord || 
                           (index > 0 && /[.!?]$/.test(rawWords[index - 1]));
      
      if (isThe) {
        correctThePositions.add(index);
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
      correctThePositions,
      sentenceStarts,
      playerSelections: new Set()
    }));
  };

  const toggleThe = (index: number) => {
    if (results) return;
    
    setGameState(prev => {
      const newSelections = new Set(prev.playerSelections);
      
      if (newSelections.has(index)) {
        newSelections.delete(index);
      } else {
        newSelections.add(index);
      }

      return {
        ...prev,
        playerSelections: newSelections
      };
    });
  };

  const getDisplayWords = () => {
    return gameState.words.map(word => {
      const shouldCapitalize = gameState.sentenceStarts.has(word.index);
      const text = shouldCapitalize ? 
        word.text.charAt(0).toUpperCase() + word.text.slice(1).toLowerCase() : 
        word.text;

      const isSelected = gameState.playerSelections.has(word.index);
      const shouldHaveThe = gameState.correctThePositions.has(word.index - 1);
      const theWord = shouldCapitalize ? 'The' : 'the';

      let displayText = text;
      
      if (results) {
        if (shouldHaveThe) {
          displayText = `${theWord} ${text}`;
        } else if (isSelected) {
          displayText = `<strike>${theWord}</strike> ${text}`;
        }
      } else if (isSelected) {
        displayText = `${theWord} ${text}`;
      }

      return {
        ...word,
        displayText,
        isSelected,
        shouldHaveThe
      };
    });
  };

  const checkResults = () => {
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
      if (gameState.correctThePositions.has(word.index - 1)) {
        if (gameState.playerSelections.has(word.index)) {
          gameResults.correct.push(word.index);
        } else {
          gameResults.missed.push(word.index);
        }
      } else if (gameState.playerSelections.has(word.index)) {
        gameResults.errors.push(word.index);
      }
    });

    const finalResults = {
      correct: gameResults.correct,
      errors: gameResults.errors,
      missed: gameResults.missed,
      score: {
        correct: gameResults.correct.length,
        errors: gameResults.errors.length,
        missed: gameResults.missed.length
      }
    } as const;

    const points = finalResults.score.correct - finalResults.score.errors;
    const totalThes = finalResults.score.correct + finalResults.score.missed;
    const percentage = totalThes > 0 ? Math.round((points / totalThes) * 100) : 0;
    
    setCookie(`articleGame_score_${articleIndex}`, percentage.toString());

    setResults(finalResults);
    return finalResults;
  };


  const resetGame = () => {
    setGameState({
      words: [],
      correctThePositions: new Set(),
      playerSelections: new Set(),
      sentenceStarts: new Set()
    });
    setResults(null);
    initializeGame(articlesData[articleIndex]);
  };

  const getScore = () => {
    if (!results?.score) return { points: 0, percentage: 0 };
    
    const points = results.score.correct - results.score.errors;
    const totalThes = results.score.correct + results.score.missed; // Total number of required "the"s
    const percentage = totalThes > 0 ? Math.round((points / totalThes) * 100) : 0;
    
    return { points, percentage };
  };

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        if (!results) {
          checkResults();
        }
      }
    };

    window.addEventListener('keypress', handleKeyPress);
    return () => window.removeEventListener('keypress', handleKeyPress);
  }, [results, articleIndex]);

  return (
    <div className="game-container">
      <header className="game-header">
        <h1>The Article Game</h1>
        <div className="header-controls">
          <button 
            onClick={() => setShowInstructions(true)} 
            className="instructions-button"
          >
            📜 Mission Brief
          </button>
          <button 
            onClick={() => navigate('/article-game')} 
            className="list-button"
          >
            Article List
          </button>
          {results && (
            <div className="score">
              Score: {getScore().points} ({getScore().percentage}%)
            </div>
          )}
        </div>
      </header>

      {showInstructions && (
        <div className="instructions-modal">
          <div className="instructions-content">
            <h2>🚨 Grammar Emergency! 🚨</h2>
            <p className="mission-intro">
              The evil Article Bandit has struck again! They've stolen all the "the"s 
              from our stories, causing chaos in the Grammar Universe. We need your 
              help to restore order!
            </p>
            <ul>
              <li>🎯 Click on words that need their "the" back</li>
              <li>🔄 Made a mistake? Click again to undo</li>
              <li>✨ Once you think you've restored all the "the"s, click "Check Answers"</li>
            </ul>
            <div className="scoring">
              <h3>Scoring System:</h3>
              <ul>
                <li>✅ Correct "the" placement: +1 point</li>
                <li>❌ Wrong "the" placement: -1 point</li>
                <li>⭕ Missed "the" placement: 0 points</li>
              </ul>
              <p>Final Score = Correct placements - Wrong placements</p>
              <p>Percentage Score = (Final Score) / (Total required "the"s) × 100%</p>
            </div>
            <div className="legend">
              <h3>Your Grammar Detective Guide:</h3>
              <div className="legend-item">
                <span className="sample correct">the word</span>
                <span>✅ Perfect placement! You're a grammar hero!</span>
              </div>
              <div className="legend-item">
                <span className="sample error">
                  <del>the</del> word
                </span>
                <span>❌ Oops! This word was happy without its "the"</span>
              </div>
              <div className="legend-item">
                <span className="sample missed">the word</span>
                <span>🎯 Missed one! This word is crying for its "the"</span>
              </div>
            </div>
            <button 
              onClick={() => setShowInstructions(false)}
              className="close-button"
            >
              Let's Save Grammar! 🚀
            </button>
          </div>
        </div>
      )}

      <div className="game-content">
        {getDisplayWords().map((word, idx) => (
          <span 
            key={idx}
            onClick={() => !results && toggleThe(word.index)}
            className={`
              word 
              ${word.isSelected ? 'selected' : ''}
              ${results ? (
                word.shouldHaveThe ? (
                  word.isSelected ? 'correct' : 'missed'
                ) : (
                  word.isSelected ? 'error' : ''
                )
              ) : ''}
            `}
            dangerouslySetInnerHTML={{ __html: word.displayText }}
          />
        ))}
      </div>

      <div className="game-controls">
        {!results ? (
          <button onClick={checkResults} className="check-button">
            Check Answers
          </button>
        ) : (
          <div className="results-controls">
            {results && results.score && (
              <div className="results-summary">
                <h3>Results:</h3>
                <p>Correct placements: {results.score.correct}</p>
                <p>Wrong placements: {results.score.errors}</p>
                <p>Missed placements: {results.score.missed}</p>
                <p className="final-score">
                  Final Score: {getScore().points} points ({getScore().percentage}%)
                </p>
              </div>
            )}
            <button onClick={resetGame} className="reset-button">
              Try Again
            </button>            
          </div>
        )}
      </div>

      <div className="progress">
        Article {articleIndex + 1} of {articlesData.length}
      </div>

      {articleIndex === articlesData.length - 1 && results && (
        <div className="final-score">
          <h2>Game Complete!</h2>
          <p>Final Score: {totalScore}</p>
          <button onClick={() => {
            navigate(`/article-game/${0}`);
            setTotalScore(0);
          }}>
            Play Again
          </button>
        </div>
      )}
    </div>
  );
}

export default ArticleGame;