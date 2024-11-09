import { useNavigate } from 'react-router-dom';
import { gameList } from '../config/games';
import './Home.css';

function Home() {
  const navigate = useNavigate();

  return (
    <div className="games-container">
      <h1 className="main-title">Language Learning Games</h1>
      <div className="game-cards">
        {gameList.map(game => (
          <button 
            key={game.id} 
            className="game-card"
            onClick={() => navigate(game.path)}
            type="button"
          >
            <div className="game-card-image-container">
              <img 
                src={game.imageUrl}
                alt={game.title}
                className="game-card-image"
              />
            </div>
            <div className="game-card-content">
              <h2 className="game-card-title">{game.title}</h2>
              <p className="game-card-tagline">{game.tagline}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

export default Home; 