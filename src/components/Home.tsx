import { Link } from 'react-router-dom';
import '../styles/home.css';

function Home() {
  return (
    <div className="home">
      <h1>Language Games</h1>
      <nav>
        <Link to="/article-game">The Article Game</Link>
      </nav>
    </div>
  );
}

export default Home;