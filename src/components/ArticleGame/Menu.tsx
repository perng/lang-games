import { Link } from 'react-router-dom';
import articlesData from '../../data/articles.json';
import './menu.css';

function ArticleGameMenu() {
  return (
    <div className="game-menu">
      <header>
        <h1>The Article Game</h1>
        <Link to="/" className="back-link">← Back to Games</Link>
      </header>
      
      <div className="stories-grid">
        {articlesData.map((article, index) => (
          <Link 
            key={index} 
            to={`/article-game/${index}`} 
            className="story-card"
          >
            <h2>{article.title}</h2>
            <p className="preview">
              {article.content.slice(0, 100)}...
            </p>
            <div className="story-meta">
              <span className="word-count">
                {article.content.split(/\s+/).length} words
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default ArticleGameMenu; 