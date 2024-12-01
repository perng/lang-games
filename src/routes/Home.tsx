import { Link } from 'react-router-dom';
import './Home.css';
import { games } from '../config/games';
import { InfoPopup } from '../components/InfoPopup';

export default function Home() {
  return (
    <div className="home">
      <h1></h1>
      <InfoPopup />
      <div className="games-list">
        {games.map(game => (
          <Link key={game.id} to={game.path} className="game-item">
            <div className="game-content">
              <div className="title-row">
                <h2>{game.title}</h2>
              </div>
              <div className={`difficulty ${game.difficulty}`}>
                {game.difficulty}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
