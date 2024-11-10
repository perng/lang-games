import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import articles from '../../data/singular.json';
import './styles.css';
import { setCookie, getCookie } from '../../utils/cookies';

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

function SingularPluralGame() {
  const { storyId } = useParams();
  const navigate = useNavigate();
  const [gameState, setGameState] = useState<GameState>({
    words: [],
    playerSelections: new Map(),
    correctAnswers: new Map()
  });
  const [results, setResults] = useState<any>(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const [currentExplanation, setCurrentExplanation] = useState<'en-US' | 'zh-TW' | null>(null);

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
    if (storyId) {
      initializeGame(parseInt(storyId));
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
    
    gameState.words.forEach((word, index) => {
      if (word.isNoun) {
        if (word.text === word.correctForm) {
          score.correct++;
        } else {
          score.errors++;
        }
      }
    });

    score.percentage = Math.round((score.correct / totalNouns) * 100);

    // Save score to cookie
    if (storyId) {
      const cookieKey = `singular-plural-${storyId}`;
      const existingScores = getCookie(cookieKey);
      let scores = existingScores ? JSON.parse(existingScores) : [];
      scores.push(score.percentage);
      // Keep only last 5 attempts
      scores = scores.slice(-5);
      setCookie(cookieKey, JSON.stringify(scores));
    }

    setResults({ score });
  };

  const handleTryAgain = () => {
    initializeGame(parseInt(storyId));
    setCurrentExplanation(null);
  };

  const handleExplanationClick = (language: 'en-US' | 'zh-TW') => {
    setCurrentExplanation(currentExplanation === language ? null : language);
  };

  // Get current story title
  const currentStory = storyId ? articles[parseInt(storyId)] : null;

  // Render article list view
  if (!storyId) {
    return (
      <div>
        <h1 className="main-title">One or Many</h1>
        <div className="article-list">
          {articles.map((article, index) => (
            <button
              key={index}
              className="article-item"
              onClick={() => navigate(`/singular-plural/${index}`)}
            >
              <h2>{article.title}</h2>
            </button>
          ))}
        </div>
      </div>
    );
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
            onClick={() => navigate('/singular-plural')}
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
                ${word.isPunctuation ? 'punctuation' : ''} 
                ${results && word.isNoun ? (
                  word.text === word.correctForm ? 'correct' : 'error'
                ) : ''}`}
              onClick={() => word.isNoun && handleWordClick(index)}
            >
              {word.text}
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