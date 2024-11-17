import { useState, useEffect } from 'react';
import type { WordInfo, GameResults } from '../../types';
import articlesData from '../../data/articles.json';
import './styles.css';
import { logPageView, logEvent } from '../../utils/analytics';
import { useParams, useNavigate, useLocation } from 'react-router-dom';

import { setCookie } from '../../utils/cookies';
import ReactMarkdown from 'react-markdown';
import '../../styles/missionBrief.css';
import '../../styles/explanationStyles.css';
import { createSpark } from '../../utils/sparks';

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
  const location = useLocation();

  useEffect(() => {
    if (isNaN(articleIndex) || articleIndex < 0 || articleIndex >= articlesData.length) {
      navigate('/article-game');
    }
  }, [articleIndex, navigate]);

  useEffect(() => {
    logPageView(location.pathname);
  }, [location]);

  const [gameState, setGameState] = useState<GameState>({
    words: [],
    correctThePositions: new Set(),
    playerSelections: new Set(),
    sentenceStarts: new Set()
  });
  const [results, setResults] = useState<GameResults | null>(null);
  const [totalScore, setTotalScore] = useState(0);
  const [showMissionBrief, setShowMissionBrief] = useState(false);
  const [currentExplanation, setCurrentExplanation] = useState<'en-US' | 'zh-TW' | null>(null);

  useEffect(() => {
    initializeGame(articlesData[articleIndex]);
  }, [articleIndex]);

  const initializeGame = (article: { title: string; content: string }) => {
    console.log('Starting initializeGame with:', article);
    
    const words: WordInfo[] = [];
    const correctThePositions = new Set<number>();
    const sentenceStarts = new Set<number>();
    
    const rawWords = article.content.split(/\s+/);
    let isFirstWord = true;
    
    rawWords.forEach((word, index) => {
      const isThe = word.toLowerCase() === 'the';
      const isSentenceStart = isFirstWord || 
                           (index > 0 && /[.!?]$/.test(rawWords[index - 1]));
      
      const isFirstNonArticleWord = index > 0 && 
                                   rawWords[index - 1].toLowerCase() === 'the' && 
                                   (index === 1 || /[.!?]$/.test(rawWords[index - 2]));
      
      console.log('Processing word:', {
        word,
        index,
        isThe,
        isSentenceStart,
        isFirstNonArticleWord,
        currentWordsLength: words.length
      });
      
      if (!isThe) {
        words.push({
          text: word,
          index: words.length,
          isSentenceStart,
          isFirstNonArticleWord
        });
      }
      
      if (isThe) {
        correctThePositions.add(words.length);
        if (isSentenceStart) {
          sentenceStarts.add(words.length);
        }
      }
      
      if (!isThe) {
        isFirstWord = false;
      }
    });

    setGameState(prev => ({
      ...prev,
      words,
      correctThePositions,
      sentenceStarts,
      playerSelections: new Set()
    }));

    console.log('Finished initialization:', {
      words: words.map(w => ({ ...w, text: w.text })),
      correctThePositions: Array.from(correctThePositions),
      sentenceStarts: Array.from(sentenceStarts),
    });
  };

  const toggleThe = (index: number, e: React.MouseEvent) => {
    if (results) return;
    
    createSpark(e.clientX, e.clientY);
    
    console.log('Toggling the at index:', index);
    
    setGameState(prev => {
      const newSelections = new Set(prev.playerSelections);
      
      if (newSelections.has(index)) {
        newSelections.delete(index);
      } else {
        newSelections.add(index);
      }

      console.log('New selections:', Array.from(newSelections));
      return {
        ...prev,
        playerSelections: newSelections
      };
    });
  };

  const checkResults = () => {
    console.log('Checking results:', {
      correctPositions: Array.from(gameState.correctThePositions),
      playerSelections: Array.from(gameState.playerSelections),
      words: gameState.words.map(w => ({ ...w, text: w.text, isSentenceStart: w.isSentenceStart }))
    });

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
      console.log('Evaluating word:', {
        text: word.text,
        index: word.index,
        isSentenceStart: word.isSentenceStart,
        isFirstNonArticleWord: word.isFirstNonArticleWord,
        isCorrectPosition: gameState.correctThePositions.has(word.index),
        isPlayerSelected: gameState.playerSelections.has(word.index)
      });

      if (gameState.correctThePositions.has(word.index)) {
        if (gameState.playerSelections.has(word.index)) {
          gameResults.correct.push(word.index);
        } else {
          gameResults.missed.push(word.index);
        }
      } else if (gameState.playerSelections.has(word.index)) {
        gameResults.errors.push(word.index);
      }
    });

    console.log('Game results:', gameResults);

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
    
    setCookie(`articleGame-score-${articleIndex}`, percentage.toString());

    logEvent('Game', `Article Game Score: ${percentage}%`);

    setResults(finalResults);
    return finalResults;
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

  const handleExplanationClick = (language: 'en-US' | 'zh-TW') => {
    logEvent('UI', `Article Game Explanation Viewed - ${language}`);
    setCurrentExplanation(currentExplanation === language ? null : language);
  };

  const handleTryAgain = () => {
    setResults(null);
    setCurrentExplanation(null);
    
    if (storyId) {
      initializeGame(articlesData[articleIndex]);
    }
  };

  const NAMES = new Set([
    'Cappy', 'Sammy', 'Ollie', 'Olly', 'Penny', 'Toby', 'Gary', 'Lily', 
    'Squeaky', 'Bella', 'Max', 'Benny', 'Milo', 'Rosie', 'Tina', 'Freddy', 
    'Daisy', 'Timmy', 'Hugo', 'Charlie'
  ]);

  const handleMissionBriefClick = () => {
    logEvent('UI', 'Article Game Mission Brief Opened');
    setShowMissionBrief(true);
  };

  const renderWord = (word: WordInfo) => {
    const isSelected = gameState.playerSelections.has(word.index);
    const isCorrect = results && results.correct.includes(word.index);
    const isError = results && results.errors.includes(word.index);
    const isMissed = results && results.missed.includes(word.index);
    
    return (
      <span 
        key={word.index}
        className={`
          word
          ${isSelected ? 'selected' : ''}
          ${isCorrect ? 'correct' : ''}
          ${isError ? 'error' : ''}
          ${isMissed ? 'missed' : ''}
        `}
        onClick={(e) => toggleThe(word.index, e)}
      >
        {(isSelected || isMissed) && (
          <span className={isError ? 'strike-through' : ''}>
            the{' '}
          </span>
        )}
        {word.text}{' '}
      </span>
    );
  };

  return (
    <div className="article-game">
      <h1 className="main-title">THE Game</h1>
      <div className="game-container">
        <div className="game-header">
          <button 
            onClick={handleMissionBriefClick}
            className="mission-brief-button"
          >
            <span>Mission Brief</span> 📜
          </button>
          <button 
            onClick={() => navigate('/article-game')} 
            className="article-list-button"
          >
            Article List
          </button>
        </div>

        <h2 className="story-title">
          {articlesData[articleIndex]?.title || 'Loading...'}
        </h2>

        <div className="game-content">
          <div className="word-container">
            {gameState.words.map(renderWord)}
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
                    {articlesData[articleIndex]['explanation-en-US']}
                  </ReactMarkdown>
                </div>
              )}

              {currentExplanation === 'zh-TW' && (
                <div className="explanation-content">
                  <ReactMarkdown>
                    {articlesData[articleIndex]['explanation-zh-TW']}
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

      {showMissionBrief && (
        <div className="mission-brief-overlay">
          <div className="mission-brief-content">
            <div className="scroll-content">
              <h2>🏰 The Definite Article Quest 👑</h2>
              
              <p>Greetings, Guardian of 'The'! ⚔️</p>
              
              <p>The most powerful article in our realm - 'the' - has been mysteriously 
              disappearing from ancient texts! As a member of the Definite Article Defense 
              Force, your mission is to restore these missing 'the's to their rightful 
              places. 📚✨</p>

              <h3>Sacred Rules of 'The' 🛡️</h3>
              <ul>
                <li>🎯 Click gaps where you think 'the' belongs</li>
                <li>🔮 Use 'the' when referring to specific things</li>
                <li>✨ Use 'the' for unique or well-known items</li>
                <li>🌟 Use 'the' when the context makes it clear which one we mean</li>
              </ul>

              <h3>Examples of Power 📜</h3>
              <ul>
                <li>🌞 'the sun' (there's only one)</li>
                <li>🎵 'the piano' (when we know which piano)</li>
                <li>🏔️ 'the mountain' (when previously mentioned)</li>
              </ul>

              <h3>Power Rankings 👑</h3>
              <ul>
                <li>🏆 90%+ : Grand Defender of The</li>
                <li>🎨 70-89% : The-Keeper Sage</li>
                <li>🌱 Below 70% : Article Apprentice</li>
              </ul>

              <p>Each 'the' you restore brings clarity back to our magical texts. 
              The realm of definite articles awaits your wisdom! 🗝️✨</p>

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

export default ArticleGame;