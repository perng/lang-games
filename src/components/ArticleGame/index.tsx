import { useState, useEffect } from 'react';
import type { WordInfo, GameResults } from '../../types';
import articlesData from '../../data/articles.json';
import './styles.css';
import { useParams, useNavigate } from 'react-router-dom';
import { setCookie } from '../../utils/cookies';
import ReactMarkdown from 'react-markdown';

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
  const [showExplanation, setShowExplanation] = useState<'zh-TW' | 'en-US' | null>(null);

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

  const getExplanation = (lang: 'zh-TW' | 'en-US') => {
    const article = articlesData[articleIndex];
    return article[`explanation-${lang}`] || '';
  };

  const NAMES = new Set([
    'Cappy', 'Sammy', 'Ollie', 'Olly', 'Penny', 'Toby', 'Gary', 'Lily', 
    'Squeaky', 'Bella', 'Max', 'Benny', 'Milo', 'Rosie', 'Tina', 'Freddy', 
    'Daisy', 'Timmy', 'Hugo', 'Charlie'
  ]);

  const getWordClassName = (word: WordInfo): string => {
    const classes = ['word'];
    
    // A word should be capitalized if:
    // 1. It's a name (always), or
    // 2. It's the first word of a sentence AND not preceded by 'the'
    const shouldCapitalize = 
      NAMES.has(word.text) || 
      (word.isSentenceStart && !gameState.playerSelections.has(word.index));
    
    if (shouldCapitalize) {
      classes.push('capitalize');
    }
    
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

  const getScoreEmoji = (percentage: number): string => {
    if (percentage <= 0) return '🤬';  // very angry
    if (percentage < 20) return '😠';   // angry
    if (percentage < 40) return '😕';   // confused
    if (percentage < 60) return '😐';   // neutral
    if (percentage < 80) return '🙂';   // slightly happy
    if (percentage < 90) return '😊';   // happy
    if (percentage < 100) return '😄';  // very happy
    return '🥳';                        // perfect score
  };

  return (
    <div>
      <h1 className="main-title">The Article Game</h1>
      <div className="game-container">
        <div className="game-header">
          <button 
            onClick={() => setShowInstructions(!showInstructions)} 
            className="instructions-button"
          >
            {showInstructions ? 'Hide Mission Brief' : 'Show Mission Brief'}
          </button>
          <button 
            onClick={() => navigate('/article-game')} 
            className="article-list-button"
          >
            Article List
          </button>
        </div>

        {showInstructions && (
          <div className="instructions">
            <h3>Mission Brief:</h3>
            <p>Your mission is to identify where the article "the" should be placed in the text.</p>
            <ul>
              <li>Click on a word if you think "the" should appear before it</li>
              <li>Click again to remove "the"</li>
              <li>Press Enter or click Check Answers when you're done</li>
            </ul>
          </div>
        )}

        <h2 className="story-title">
          {articlesData[articleIndex]?.title || 'Loading...'}
        </h2>

        <div className="game-content">
          <div className="word-container">
            {gameState.words.map((word, index) => {
              const isSelected = gameState.playerSelections.has(word.index);
              const isName = NAMES.has(word.text);
              const isSentenceStart = word.isSentenceStart;
              
              let displayWord;
              if (isName) {
                displayWord = word.text.charAt(0).toUpperCase() + word.text.slice(1).toLowerCase();
              } else if (isSentenceStart && !isSelected) {
                displayWord = word.text.charAt(0).toUpperCase() + word.text.slice(1).toLowerCase();
              } else {
                displayWord = word.text.toLowerCase();
              }

              let articleElement = null;
              const theArticle = isSentenceStart ? 'The ' : 'the ';

              if (results) {
                // Show results state
                if (gameState.correctThePositions.has(word.index - 1)) {
                  // Should have 'the'
                  if (isSelected) {
                    // Correct placement
                    articleElement = <span className="article correct">{theArticle}</span>;
                  } else {
                    // Missed 'the'
                    articleElement = <span className="article missed">{theArticle}</span>;
                  }
                } else if (isSelected) {
                  // Wrong placement
                  articleElement = (
                    <span className="article error">
                      <del>{theArticle}</del>
                    </span>
                  );
                }
              } else if (isSelected) {
                // Normal gameplay state
                articleElement = <span className="article">{theArticle}</span>;
              }

              return (
                <span
                  key={index}
                  className={getWordClassName(word)}
                  onClick={() => toggleThe(word.index)}
                >
                  {articleElement}
                  {displayWord}
                </span>
              );
            })}
          </div>
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
                  <p>✅ Correct placements: {results.score.correct}</p>
                  <p>❌ Wrong placements: {results.score.errors}</p>
                  <p>💡 Missed placements: {results.score.missed}</p>
                  <p className="final-score">
                    {getScoreEmoji(getScore().percentage)} Final Score: {getScore().points} points ({getScore().percentage}%)
                  </p>
                </div>
              )}
              <div className="action-buttons">
                <button onClick={resetGame} className="reset-button">
                  Try Again
                </button>
                {getExplanation('zh-TW') && (
                  <button 
                    onClick={() => setShowExplanation(showExplanation === 'zh-TW' ? null : 'zh-TW')} 
                    className={`explain-button ${showExplanation === 'zh-TW' ? 'active' : ''}`}
                  >
                    {showExplanation === 'zh-TW' ? '隱藏說明' : '查看中文說明'}
                  </button>
                )}
                {getExplanation('en-US') && (
                  <button 
                    onClick={() => setShowExplanation(showExplanation === 'en-US' ? null : 'en-US')} 
                    className={`explain-button ${showExplanation === 'en-US' ? 'active' : ''}`}
                  >
                    {showExplanation === 'en-US' ? 'Hide Explanation' : 'Show English Explanation'}
                  </button>
                )}
              </div>

              {showExplanation && (
                <div className="explanation-container">
                  <ReactMarkdown>
                    {getExplanation(showExplanation)}
                  </ReactMarkdown>
                </div>
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
    </div>
  );
}

export default ArticleGame;