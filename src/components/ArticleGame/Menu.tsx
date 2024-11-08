import { Link } from 'react-router-dom';
import { getCookie } from '../../utils/cookies';
import articlesData from '../../data/articles.json';
import './menu.css';

function ArticleGameMenu() {
  const getStoryScore = (index: number): number | null => {
    const score = getCookie(`articleGame_score_${index}`);
    return score ? parseInt(score) : null;
  };

  // Helper function to determine card class based on score
  const getCardClass = (score: number | null): string => {
    if (score === null) return 'not-attempted';
    if (score >= 90) return 'excellent';
    if (score >= 70) return 'good';
    if (score >= 50) return 'fair';
    return 'needs-practice';
  };

  return (
    <div className="game-menu">
      <header>
        <h1>The Article Game</h1>
        <Link to="/" className="back-link">← Back to Games</Link>
      </header>
      
      <div className="stories-grid">
        {articlesData.map((article, index) => {
          const score = getStoryScore(index);
          
          return (
            <Link 
              key={index} 
              to={`/article-game/${index}`} 
              className={`story-card ${getCardClass(score)}`}
            >
              <div className="story-header">
                <h2>{article.title}</h2>
                {score !== null && (
                  <div className="score-badge">
                    {score}%
                  </div>
                )}
              </div>
              <p className="preview">
                {article.content.slice(0, 100)}...
              </p>
              <div className="story-meta">
                <span className="word-count">
                  {article.content.split(/\s+/).length} words
                </span>
                {score === null && (
                  <span className="not-attempted-text">Not attempted yet</span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
      <div className="score-legend">
        <div className="legend-title">Score Guide:</div>
        <div className="legend-items">
          <div className="legend-item">
            <div className="legend-color" style={{ background: 'white' }}></div>
            <span>Not attempted</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ background: '#f1f8e9' }}></div>
            <span>Excellent (90%+)</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ background: '#fff3e0' }}></div>
            <span>Good (70-89%)</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ background: '#e3f2fd' }}></div>
            <span>Fair (50-69%)</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ background: '#ffebee' }}></div>
            <span>Needs Practice (below 50%)</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ArticleGameMenu; 