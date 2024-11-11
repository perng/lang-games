import { Link } from 'react-router-dom';
import './Home.css';

interface GameInfo {
  id: string;
  title: string;
  description: string;
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Insane';
  path: string;
  image: string;
}

const games: GameInfo[] = [
  {
    id: 'singular-plural-game',
    title: 'One or Many',
    description: 'Practice using singular and plural nouns correctly in context.',
    difficulty: 'Easy',
    path: '/singular-plural',
    image: '/images/one-or-many-logo.jpg'
  },
  {
    id: 'article-game',
    title: 'THE Game',
    description: 'Practice using "the" correctly in English sentences.',
    difficulty: 'Medium',
    path: '/article-game',
    image: '/images/the-game-logo.jpg'
  }
];

export default function Home() {
  return (
    <div className="home">
      <h1>Language Games</h1>
      <div className="games-grid">
        {games.map(game => (
          <Link key={game.id} to={game.path} className="game-card">
            <div className="game-image">
              <img src={game.image} alt={game.title} />
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
