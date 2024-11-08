import { Link } from 'react-router-dom';
import '../styles/home.css';

interface GameInfo {
  id: string;
  title: string;
  description: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  path: string;
}

const games: GameInfo[] = [
  {
    id: 'article-game',
    title: 'The Article Game',
    description: 'Practice using "the" correctly in English sentences.',
    difficulty: 'Medium',
    path: '/article-game'
  }
  // Add more games here as needed
];

function Home() {
  return (
    <div className="home">
      <h1>Language Games</h1>
      <div className="games-grid">
        {games.map(game => (
          <Link key={game.id} to={game.path} className="game-card">
            <h2>{game.title}</h2>
            <div className={`difficulty ${game.difficulty.toLowerCase()}`}>
              {game.difficulty}
            </div>
            <p className="description">{game.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default Home;