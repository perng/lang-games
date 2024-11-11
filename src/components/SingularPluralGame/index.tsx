import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import articles from '../../data/singular.json';
import './styles.css';
import { setCookie, getCookie, deleteCookie } from '../../utils/cookies';

interface Word {
  text: string;
  index: number;
  isNoun: boolean;
  singularForm: string;
  pluralForm: string;
  correctForm: string;
  isSpace: boolean;
  isPunctuation: boolean;
}

interface GameState {
  words: Word[];
  playerSelections: Map<number, string>; // index -> selected form
  correctAnswers: Map<number, string>;   // index -> correct form
}

function formatIncorrectAnswer(selected: string, correct: string) {
  return `<span style="color: red; text-decoration: line-through">${selected}</span><span style="color: blue">${correct}</span>`;
}

function formatCorrectAnswer(text: string) {
  return `<span style="color: green">${text}</span>`;
}

function SingularPluralGame() {
  const { storyId } = useParams<{ storyId: string }>();  // Explicitly type the params
  const navigate = useNavigate();
  const [gameState, setGameState] = useState<GameState>({
    words: [],
    playerSelections: new Map(),
    correctAnswers: new Map()
  });
  const [results, setResults] = useState<any>(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const [currentExplanation, setCurrentExplanation] = useState<'en-US' | 'zh-TW' | null>(null);

  console.log('Component rendered, storyId:', storyId);

  const processText = (text: string): Word[] => {
    const words: Word[] = [];
    let currentIndex = 0;
    
    const parts = text.split(/(\[[^\]]+\]|\s+|[.,!?])/);
    parts.forEach((part) => {
      if (!part) return; // Skip empty parts
      
      if (part.startsWith('[')) {
        // Process noun choices
        const [singular, plural] = part.slice(1, -1).split('|');
        const correctForm = singular;
        const showWrongForm = Math.random() < 0.67;
        const initialForm = showWrongForm ? plural : singular;

        words.push({
          text: initialForm,
          index: currentIndex++,
          isNoun: true,
          singularForm: singular,
          pluralForm: plural,
          correctForm: correctForm,
          isSpace: false,
          isPunctuation: false
        });
      } else if (/^\s+$/.test(part)) {
        // Handle spaces
        words.push({
          text: ' ',
          index: currentIndex++,
          isNoun: false,
          singularForm: ' ',
          pluralForm: ' ',
          correctForm: ' ',
          isSpace: true,
          isPunctuation: false
        });
      } else if (/^[.,!?]$/.test(part)) {
        // Handle punctuation
        words.push({
          text: part,
          index: currentIndex++,
          isNoun: false,
          singularForm: part,
          pluralForm: part,
          correctForm: part,
          isSpace: false,
          isPunctuation: true
        });
      } else {
        // Regular text
        words.push({
          text: part,
          index: currentIndex++,
          isNoun: false,
          singularForm: part,
          pluralForm: part,
          correctForm: part,
          isSpace: false,
          isPunctuation: false
        });
      }
    });
    return words;
  };

  const initializeGame = (id: number) => {
    if (id >= 0 && id < articles.length) {
      const words = processText(articles[id].content);
      const correctAnswers = new Map();
      words.forEach(word => {
        if (word.isNoun) {
          correctAnswers.set(word.index, word.correctForm);
        }
      });

      setGameState({
        words,
        playerSelections: new Map(),
        correctAnswers
      });
      setResults(null);
    }
  };

  useEffect(() => {
    const id = parseInt(storyId ?? '0');
    if (!isNaN(id) && id >= 0 && id < articles.length) {
      initializeGame(id);
    }
  }, [storyId]);

  const handleWordClick = (index: number) => {
    if (results || !gameState.words[index].isNoun) return;

    const word = gameState.words[index];
    const currentForm = word.text;
    const newForm = currentForm === word.singularForm ? word.pluralForm : word.singularForm;

    const newWords = [...gameState.words];
    newWords[index] = { ...word, text: newForm };

    const newSelections = new Map(gameState.playerSelections);
    newSelections.set(index, newForm);

    setGameState({
      ...gameState,
      words: newWords,
      playerSelections: newSelections
    });
  };

  const checkAnswers = () => {
    const score = {
      correct: 0,
      errors: 0,
      percentage: 0
    };

    const totalNouns = gameState.words.filter(word => word.isNoun).length;
    
    // Create new words array with formatting
    const newWords = gameState.words.map(word => {
      if (word.isNoun) {
        if (word.text === word.correctForm) {
          score.correct++;
          return {
            ...word,
            text: formatCorrectAnswer(word.text)
          };
        } else {
          score.errors++;
          return {
            ...word,
            text: formatIncorrectAnswer(word.text, word.correctForm)
          };
        }
      }
      return word;
    });

    score.percentage = Math.round((score.correct / totalNouns) * 100);

    if (storyId) {
      const cookieKey = getCookieKey(storyId);
      console.log('About to set cookie with key:', cookieKey);
      setCookie(cookieKey, score.percentage.toString(), 365);
      
      // Add this line to see all cookies
      console.log('All cookies:', document.cookie);
      
      // Verify cookie was set
      const verifyScore = getCookie(cookieKey);
      console.log('Verified cookie value:', verifyScore);
    }

    setGameState({
      ...gameState,
      words: newWords
    });
    setResults({ score });
  };

  const handleTryAgain = () => {
    initializeGame(parseInt(storyId ?? '0'));
    setCurrentExplanation(null);
  };

  const handleExplanationClick = (language: 'en-US' | 'zh-TW') => {
    setCurrentExplanation(currentExplanation === language ? null : language);
  };

  // Get current story title
  const currentStory = storyId ? articles[parseInt(storyId)] : null;

  // Create a helper function to get consistent cookie keys
  const getCookieKey = (id: string | number) => `singular-plural-${id}`;

  // Add this function to clear all game scores
  const clearAllScores = () => {
    // Clear cookies for all articles
    articles.forEach((_, index) => {
      const cookieKey = getCookieKey(index);
      deleteCookie(cookieKey);
    });
    
    // Force reload to update the display
    window.location.reload();
  };

  const renderArticleList = () => {
    console.log('Rendering article list');
    return (
      <div>
        <h1 className="main-title">One or Many</h1>
        <div className="article-list">
          {articles.map((article, index) => {
            console.log(`Checking article ${index}: ${article.title}`);
            const cookieKey = getCookieKey(index);
            console.log('Looking for cookie:', cookieKey);
            const savedScore = getCookie(cookieKey);
            console.log('Found score for article', index, ':', savedScore);
            
            const scoreDisplay = savedScore 
              ? `Last Score: ${savedScore}%`
              : 'Not attempted yet';
            
            return (
              <button
                key={index}
                className="article-item"
                onClick={() => navigate(`/singular-plural/${index}`)}
              >
                <h2>{article.title}</h2>
                <div className="score-display">
                  {scoreDisplay}
                </div>
              </button>
            );
          })}
        </div>
        <button 
          onClick={clearAllScores}
          className="clear-scores-button"
        >
          Clear All Scores
        </button>
      </div>
    );
  };

  const handleBackToMenu = () => {
    navigate('/singular-plural', { replace: true });
    window.location.reload(); // Force reload to ensure cookies are read
  };

  // Render article list view
  if (!storyId) {
    console.log('No storyId, showing article list');
    return renderArticleList();
  }

  return (
    <div>
      <h1 className="main-title">One or Many</h1>
      <h2 className="story-title">{currentStory?.title}</h2>
      <div className="game-container">
        <div className="game-header">
          <button 
            onClick={() => setShowInstructions(!showInstructions)}
            className="instructions-button"
          >
            Instructions
          </button>
          <button
            onClick={handleBackToMenu}
            className="article-list-button"
          >
            Article List
          </button>
        </div>

        {showInstructions && (
          <div className="instructions">
            <h2>How to Play</h2>
            <p>Click on nouns to toggle between singular and plural forms.</p>
          </div>
        )}

        <div className="word-container">
          {gameState.words.map((word, index) => (
            <span
              key={index}
              className={`word 
                ${word.isNoun ? 'noun' : ''} 
                ${word.isSpace ? 'space' : ''} 
                ${word.isPunctuation ? 'punctuation' : ''}`}
              onClick={() => word.isNoun && !results && handleWordClick(index)}
              dangerouslySetInnerHTML={
                word.isNoun && results 
                  ? { __html: word.text }
                  : undefined
              }
            >
              {!word.isNoun || !results ? word.text : undefined}
            </span>
          ))}
        </div>

        {!results && (
          <button 
            onClick={checkAnswers}
            className="check-button"
          >
            Check Answers
          </button>
        )}

        {results && (
          <div className="results-summary">
            <h3>Results:</h3>
            <p>✅ Correct: {results.score.correct}</p>
            <p>❌ Wrong: {results.score.errors}</p>
            <p className="final-score">
              Score: {results.score.percentage}%
            </p>
            
            <button 
              onClick={handleTryAgain}
              className="try-again-button"
            >
              Try Again
            </button>

            <div className="explanation-buttons">
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
                显示说明
              </button>
            </div>

            {currentExplanation === 'en-US' && (
              <div className="explanation-content">
                <ReactMarkdown>
                  {articles[parseInt(storyId)]['explanation-en-US']}
                </ReactMarkdown>
              </div>
            )}

            {currentExplanation === 'zh-TW' && (
              <div className="explanation-content">
                <ReactMarkdown>
                  {articles[parseInt(storyId)]['explanation-zh-TW']}
                </ReactMarkdown>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default SingularPluralGame; 