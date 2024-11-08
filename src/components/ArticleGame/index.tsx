import { useState, useEffect } from 'react';
import type { WordInfo, GameResults } from '../../types';
import articlesData from '../../data/articles.json';
import './styles.css';
import { useParams, useNavigate } from 'react-router-dom';

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
    if (results?.score) {
      const scoreChange = (results.score?.correct ?? 0) - (results.score?.errors ?? 0);
      setTotalScore(prev => prev + scoreChange);
    }
    
    if (articleIndex < articlesData.length - 1) {
      navigate(`/article-game/${articleIndex + 1}`);
      setResults(null);
    }
  };

  const resetGame = () => {
    initializeGame(articlesData[articleIndex]);
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
        } else if (articleIndex < articlesData.length - 1) {
          nextArticle();
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
            onClick={() => navigate('/article-game')} 
            className="list-button"
          >
            Article List
          </button>
          {results && <div className="score">Score: {getScore()}</div>}
        </div>
      </header>

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
            <div className="results-summary">
              <p>Correct: {results.score?.correct}</p>
              <p>Errors: {results.score?.errors}</p>
              <p>Missed: {results.score?.missed}</p>
            </div>
            <button onClick={resetGame} className="reset-button">
              Try Again
            </button>
            {articleIndex < articlesData.length - 1 && (
              <button onClick={nextArticle} className="next-button">
                Next Article
              </button>
            )}
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