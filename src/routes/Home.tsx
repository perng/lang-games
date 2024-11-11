import { Link } from 'react-router-dom';
import './Home.css';
import { games } from '../config/games';

export default function Home() {
  return (
    <div className="home">
      <h1>Language Games</h1>
      <div className="games-grid">
        {games.map(game => (
          <Link key={game.id} to={game.path} className="game-card">
            <div className="game-image">
              <img src={game.logoSrc} alt={game.title} />
            </div>
            <div className="game-content">
              <div className="title-row">
                <h2>{game.title}</h2>
                <div className={`difficulty ${game.difficulty.toLowerCase()}`}>
                  {game.difficulty}
                </div>
              </div>
              <p className="description">{game.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
