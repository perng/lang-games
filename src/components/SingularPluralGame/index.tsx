import { useState, useEffect } from 'react';
import { logPageView, logEvent } from '../../utils/analytics';
import { useParams, useNavigate, useLocation } from 'react-router-dom';

import ReactMarkdown from 'react-markdown';
import articles from '../../data/singular.json';
import './styles.css';
import { setStorage, getStorage } from '../../utils/storage';
import '../../styles/missionBrief.css';
import '../../styles/explanationStyles.css';
import { createFirework } from '../../utils/fireworks';
import { IoArrowBack } from 'react-icons/io5';

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

function formatBothCorrect(form1: string, form2: string) {
  return `<span style="color: blue">${form1}/${form2}</span>`;
}

function SingularPluralGame() {
  const navigate = useNavigate();
  const { levelId } = useParams<{ levelId: string }>();  // Explicitly type the params
  const [gameState, setGameState] = useState<GameState>({
    words: [],
    playerSelections: new Map(),
    correctAnswers: new Map()
  });
  const [results, setResults] = useState<any>(null);
  const [currentExplanation, setCurrentExplanation] = useState<'en-US' | 'zh-TW' | null>(null);
  const [showMissionBrief, setShowMissionBrief] = useState(false);
  const location = useLocation();

  console.log('Component rendered, storyId:', levelId);

  useEffect(() => {
    logPageView(location.pathname);
  }, [location]);

  const processText = (text: string): Word[] => {
    const words: Word[] = [];
    let currentIndex = 0;
    
    const parts = text.split(/(\[[^\]]+\]|\s+)/);
    parts.forEach((part) => {
      if (!part) return; // Skip empty parts
      
      if (part.startsWith('[')) {
        // Process noun choices
        const [singular, plural] = part.slice(1, -1).split(/[-|]/);
        const separator = part.slice(1, -1).includes('|') ? '|' : '-';
        const correctForm = separator === '|' ? singular : part.slice(1, -1);

        const showWrongForm = separator === '|' && Math.random() < 0.67;
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
      } else {
        // Regular text - now handle punctuation as part of the word
        const matches = part.match(/^(.*?)([.,!?]*)$/);
        if (matches) {
          const [_, word, punctuation] = matches;
          
          // Add the main word if it exists
          if (word) {
            words.push({
              text: word,
              index: currentIndex++,
              isNoun: false,
              singularForm: word,
              pluralForm: word,
              correctForm: word,
              isSpace: false,
              isPunctuation: false
            });
          }
          
          // Add punctuation if it exists
          if (punctuation) {
            words.push({
              text: punctuation,
              index: currentIndex++,
              isNoun: false,
              singularForm: punctuation,
              pluralForm: punctuation,
              correctForm: punctuation,
              isSpace: false,
              isPunctuation: true
            });
          }
        }
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
    const id = parseInt(levelId ?? '0');
    if (!isNaN(id) && id >= 0 && id < articles.length) {
      initializeGame(id);
    }
  }, [levelId]);

  const handleClick = (index: number, e: React.MouseEvent) => {
    if (results) return;
    
    // Add firework effect
    createFirework(e.clientX, e.clientY);
    
    setGameState(prev => {
      const newSelections = new Map(prev.playerSelections);
      const word = prev.words[index];
      
      // Toggle between singular and plural forms
      const currentForm = word.text;
      const newForm = currentForm === word.singularForm ? word.pluralForm : word.singularForm;
      
      newSelections.set(index, newForm);
      
      const newWords = [...prev.words];
      newWords[index] = {
        ...word,
        text: newForm
      };
      
      return {
        ...prev,
        words: newWords,
        playerSelections: newSelections
      };
    });
  };

  const checkAnswers = () => {
    const score = {
      correct: 0,
      errors: 0,
      percentage: 0
    };

    const totalNouns = gameState.words.filter(word => word.isNoun).length;
    
    const newWords = gameState.words.map(word => {
      if (word.isNoun) {
        const isHyphenSeparator = word.correctForm.includes('-');
        if (isHyphenSeparator) {
          score.correct++;
          const [form1, form2] = word.correctForm.split('-');
          return {
            ...word,
            text: formatBothCorrect(form1, form2)
          };
        } else if (word.text === word.correctForm) {
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

    if (levelId) {
      const cookieKey = getCookieKey(levelId);
      console.log('About to set cookie with key:', cookieKey);
      setStorage(cookieKey, score.percentage.toString());
            
      // Verify cookie was set
      const verifyScore = getStorage(cookieKey);
      console.log('Verified cookie value:', verifyScore);
    }

    setGameState({
      ...gameState,
      words: newWords
    });
    setResults({ score });
  };

  const handleTryAgain = () => {
    initializeGame(parseInt(levelId ?? '0'));
    setCurrentExplanation(null);
  };

  const handleExplanationClick = (language: 'en-US' | 'zh-TW') => {
    logEvent('UI', `Singular Plural Game Explanation Viewed - ${language}`);
    setCurrentExplanation(currentExplanation === language ? null : language);
  };

  const handleMissionBriefClick = () => {
    logEvent('UI', 'Singular Plural Game Mission Brief Opened');
    setShowMissionBrief(true);
  };

  // Get current story title
  const currentStory = levelId ? articles[parseInt(levelId)] : null;

  // Create a helper function to get consistent cookie keys
  const getCookieKey = (id: string | number) => `singular-plural-${id}`;

  // Add this function
  const handleBackToMenu = () => {
    logEvent('Navigation', 'Back to Singular Plural Menu');
    navigate('/singular-plural');
  };

  return (
    <div className="singular-plural-game">
      <button 
        className="back-button"
        onClick={handleBackToMenu}
      >
        <IoArrowBack size={20} />
      </button>

      <span 
        onClick={handleMissionBriefClick}
        className="mission-brief-link"
      >
        📜
      </span>

      <h1 className="main-title">One or Many</h1>
      <h2 className="story-title">{currentStory?.title}</h2>
      <div className="game-container">
        {showMissionBrief && (
          <div 
            className="mission-brief-overlay"
            onClick={() => setShowMissionBrief(false)}
          >
            <div className="mission-brief-content">
              <div className="scroll-content">
                <h2>🧙‍♂️ Secret Mission: The Singular-Plural Spell 🪄</h2>
                
                <p>Greetings, Apprentice Word Wizard! 🎭</p>
                
                <p>The Grand Library of Lexicon has been hit by a chaotic spell, causing words to shift 
                between their singular and plural forms! As our newest recruit to the Grammatical 
                Guard, your mission is critical! 🏰</p>

                <h3>Your Magical Tasks 📝</h3>
                <ul>
                  <li>🔮 Click on the enchanted words to toggle their form</li>
                  <li>✨ Transform plurals to singulars (or vice versa) as the story requires</li>
                  <li>🎯 Aim for perfect harmony in the text</li>
                </ul>

                <h3>Spell Power Levels 🌟</h3>
                <ul>
                  <li>⭐⭐⭐ 90%+ : Master Wizard</li>
                  <li>⭐⭐ 70-89% : Skilled Sorcerer</li>
                  <li>⭐ Below 70% : Apprentice (Keep practicing!)</li>
                </ul>

                <p>Remember: Every word you correct helps restore balance to the magical realm of grammar! 
                The Library's fate rests in your hands! 🪄✨</p>
              </div>
            </div>
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
              onClick={(e) => word.isNoun && !results && handleClick(index, e)}
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
                顯示說明
              </button>
            </div>

            {currentExplanation === 'en-US' && levelId && (
              <div className="explanation-content">
                <ReactMarkdown>
                  {articles[parseInt(levelId)]['explanation-en-US']}
                </ReactMarkdown>
              </div>
            )}

            {currentExplanation === 'zh-TW' && levelId && (
              <div className="explanation-content">
                <ReactMarkdown>
                  {articles[parseInt(levelId)]['explanation-zh-TW']}
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