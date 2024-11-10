import { useNavigate } from 'react-router-dom';
import articles from '../../../data/singular.json';
import { getCookie } from '../../../utils/cookies';
import '../../ArticleGame/Menu/styles.css';

function SingularPluralGameMenu() {
  const navigate = useNavigate();

  const getScoreEmoji = (percentage: number): string => {
    if (percentage <= 0) return '🤬';
    if (percentage < 20) return '😠';
    if (percentage < 40) return '😕';
    if (percentage < 60) return '😐';
    if (percentage < 80) return '🙂';
    if (percentage < 90) return '😊';
    if (percentage < 100) return '😄';
    return '🥳';
  };

  return (
    <div className="game-board">
      <div className="game-header">
        <h1>One or Many</h1>
        <p>Practice singular and plural forms of nouns</p>
      </div>

      <div className="article-list">
        {articles.map((article, index) => {
          const cookieKey = `singular-plural-${index}`;
          const scores = getCookie(cookieKey);
          const previousScores = scores ? JSON.parse(scores) : [];
          const bestScore = previousScores.length > 0 
            ? Math.max(...previousScores) 
            : null;

          return (
            <div key={index} className="article-card">
              <div className="article-image-container">
                <img 
                  src={`/src/images/${article.id}.jpg`}
                  alt={article.title}
                  className="article-image"
                />
                {bestScore !== null && (
                  <div className="score-badge">
                    {getScoreEmoji(bestScore)} {bestScore}%
                  </div>
                )}
              </div>
              <div className="article-info">
                <h2>{article.title}</h2>
                <div className="article-stats">
                  <div className="article-length">
                    {article.content.split(/\[([^\]]+)\]/).length - 1} nouns
                  </div>
                </div>
                <button 
                  className="start-button"
                  onClick={() => navigate(`/singular-plural/${index}`)}
                >
                  Start
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default SingularPluralGameMenu;
