import { Link } from 'react-router-dom';
import articles from '../../../data/singular.json';
import { getCookie } from '../../../utils/cookies';
import '../../ArticleGame/Menu/styles.css';

export default function SingularPluralGameMenu() {
    const getStoryScore = (index: number): number | null => {
        const score = getCookie(`singular-plural_${index}`);
        return score ? parseInt(score) : null;
    }

    const getCardClass = (score: number | null): string => {
        if (score === null) return 'not-attempted';
        if (score >= 90) return 'excellent';
        if (score >= 70) return 'good';
        if (score >= 50) return 'fair';
        return 'needs-practice';
      };
    
      const getImageUrl = (id: string) => {
        try {
          return new URL(`../../../images/${id}.jpg`, import.meta.url).href;
        } catch (error) {
          console.error(`Failed to load image for ${id}:`, error);
          return '';
        }
      };
    
      const clearAllScores = () => {
        articles.forEach((_, index) => {
          document.cookie = `singular-plural_${index}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
        });
        window.location.reload(); // Refresh to update the view
      };
    
      return (
        <div className="game-menu">
          <header>
            <h1>One or Many</h1>
            <div className="header-actions">
              <button onClick={clearAllScores} className="clear-scores-button">
                Clear All Scores
              </button>
              <Link to="/" className="back-link">← Back to Games</Link>
            </div>
          </header>
          
          <div className="stories-grid">
            {articles.map((article, index) => {
              const score = getStoryScore(index);
              
              return (
                <Link 
                  key={index} 
                  to={`/singular-plural/${index}`} 
                  className={`story-card ${getCardClass(score)}`}
                >
                  <div className="story-image">
                    <img 
                      src={getImageUrl(article.id)} 
                      alt={article.title}
                    />
                  </div>
                  <div className="story-header">
                    <h2>{article.title}</h2>
                    {score !== null && (
                      <div className="score-badge">
                        {score}%
                      </div>
                    )}
                  </div>
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
    