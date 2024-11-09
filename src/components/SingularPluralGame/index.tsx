import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import articles from '../../data/singular.json';
import './styles.css';

interface Word {
  text: string;
  index: number;
  isNoun: boolean;
  singularForm: string;
  pluralForm: string;
  correctForm: string;
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

  const processText = (text: string): Word[] => {
    const words: Word[] = [];
    let currentIndex = 0;
    
    const parts = text.split(/(\[[^\]]+\])/);
    parts.forEach((part) => {
      if (part.startsWith('[')) {
        // Process noun choices
        const [singular, plural] = part.slice(1, -1).split('|');
        const correctForm = singular; // First form is always correct in data
        
        // Randomly choose initial display (2/3 chance of wrong form)
        const showWrongForm = Math.random() < 0.67;
        const initialForm = showWrongForm ? plural : singular;

        words.push({
          text: initialForm,
          index: currentIndex,
          isNoun: true,
          singularForm: singular,
          pluralForm: plural,
          correctForm: correctForm
        });
      } else {
        // Regular text
        words.push({
          text: part,
          index: currentIndex,
          isNoun: false,
          singularForm: part,
          pluralForm: part,
          correctForm: part
        });
      }
      currentIndex++;
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
      missed: 0
    };

    gameState.correctAnswers.forEach((correctForm, index) => {
      const selectedForm = gameState.playerSelections.get(index);
      if (!selectedForm) {
        score.missed++;
      } else if (selectedForm === correctForm) {
        score.correct++;
      } else {
        score.errors++;
      }
    });

    setResults({ score });
  };

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
              className={`word ${word.isNoun ? 'noun' : ''} ${
                results ? (
                  gameState.playerSelections.get(word.index) === gameState.correctAnswers.get(word.index)
                    ? 'correct'
                    : gameState.playerSelections.has(word.index)
                    ? 'error'
                    : word.isNoun ? 'missed' : ''
                ) : ''
              }`}
              onClick={() => handleWordClick(index)}
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
            <p>💡 Missed: {results.score.missed}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default SingularPluralGame; 