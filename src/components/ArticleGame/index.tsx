import { useState, useEffect } from 'react';
import type { WordInfo, GameResults } from '../../types';
import articlesData from '../../games/the-article-game/data/articles.json';
import './styles.css';

interface GameState {
  words: WordInfo[];
  correctThePositions: Set<number>;
  playerSelections: Set<number>;
  sentenceStarts: Set<number>;
}

function ArticleGame() {
  const [gameState, setGameState] = useState<GameState>({
    words: [],
    correctThePositions: new Set(),
    playerSelections: new Set(),
    sentenceStarts: new Set()
  });
  const [results, setResults] = useState<GameResults | null>(null);
  const [currentArticleIndex, setCurrentArticleIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [totalScore, setTotalScore] = useState(0);
  const [showInstructions, setShowInstructions] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize game with first article
  useEffect(() => {
    try {
      initializeGame(articlesData[currentArticleIndex]);
    } catch (err) {
      setError('Failed to load article. Please try again.');
    }
  }, [currentArticleIndex]);

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

  const getWords = () => {
    return gameState.words.map(word => ({
      ...word,
      text: gameState.sentenceStarts.has(word.index) ? 
           capitalizeFirstLetter(word.text) : 
           word.text
    }));
  };

  const capitalizeFirstLetter = (str: string): string => {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  };

  const toggleThe = (index: number) => {
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

  const checkResults = () => {
    const gameResults: GameResults = {
      correct: [],
      errors: [],
      missed: [],
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

    const finalResults: GameResults = {
      ...gameResults,
      score: {
        correct: gameResults.correct.length,
        errors: gameResults.errors.length,
        missed: gameResults.missed.length
      }
    };

    setResults(finalResults);
    return finalResults;
  };

  const nextArticle = () => {
    if (currentArticleIndex < articlesData.length - 1) {
      setCurrentArticleIndex(prev => prev + 1);
      setResults(null);
      if (results?.score) {
        setTotalScore(prev => prev + (results.score.correct - results.score.errors));
      }
    }
  };

  const resetGame = () => {
    initializeGame(articlesData[currentArticleIndex]);
    setResults(null);
  };

  const getScore = () => {
    if (!results?.score) return 0;
    return results.score.correct - results.score.errors;
  };

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        if (!results) {
          checkResults();
        } else if (currentArticleIndex < articlesData.length - 1) {
          nextArticle();
        }
      }
    };

    window.addEventListener('keypress', handleKeyPress);
    return () => window.removeEventListener('keypress', handleKeyPress);
  }, [results, currentArticleIndex]);

  if (error) {
    return (
      <div className="error">
        <p>{error}</p>
        <button onClick={() => {
          setError(null);
          initializeGame(articlesData[currentArticleIndex]);
        }}>
          Retry
        </button>
      </div>
    );
  }

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="game-container">
      <header className="game-header">
        <h1>The Article Game</h1>
        {results && <div className="score">Score: {getScore()}</div>}
      </header>

      <div className="game-content">
        {getWords().map((word, idx) => (
          <span 
            key={idx}
            onClick={() => !results && toggleThe(word.index)}
            className={`
              word 
              ${gameState.playerSelections.has(word.index) ? 'selected' : ''}
              ${results?.correct.includes(word.index) ? 'correct' : ''}
              ${results?.errors.includes(word.index) ? 'error' : ''}
              ${results?.missed.includes(word.index) ? 'missed' : ''}
            `}
          >
            {word.text}
          </span>
        ))}
      </div>

      <div className="game-controls">
        {!results ? (
          <button onClick={checkResults} className="check-button">
            Check Answers
          </button>
        ) : (
          <div className="results-controls">
            <div className="results-summary">
              <p>Correct: {results.score?.correct}</p>
              <p>Errors: {results.score?.errors}</p>
              <p>Missed: {results.score?.missed}</p>
            </div>
            <button onClick={resetGame} className="reset-button">
              Try Again
            </button>
            {currentArticleIndex < articlesData.length - 1 && (
              <button onClick={nextArticle} className="next-button">
                Next Article
              </button>
            )}
          </div>
        )}
      </div>

      <div className="progress">
        Article {currentArticleIndex + 1} of {articlesData.length}
      </div>

      {currentArticleIndex === articlesData.length - 1 && results && (
        <div className="final-score">
          <h2>Game Complete!</h2>
          <p>Final Score: {totalScore}</p>
          <button onClick={() => {
            setCurrentArticleIndex(0);
            setTotalScore(0);
          }}>
            Play Again
          </button>
        </div>
      )}

      {showInstructions && (
        <div className="instructions-modal">
          <h2>How to Play</h2>
          <p>Click on words where you think "the" should go.</p>
          <p>Score points for correct placements and lose points for mistakes.</p>
          <button onClick={() => setShowInstructions(false)}>Start Game</button>
        </div>
      )}
    </div>
  );
}

export default ArticleGame;