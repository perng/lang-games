import { Routes, Route } from 'react-router-dom';
import Home from './components/Home';
import ArticleGameMenu from './components/ArticleGame/Menu';
import ArticleGame from './components/ArticleGame';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/article-game" element={<ArticleGameMenu />} />
      <Route path="/article-game/:storyId" element={<ArticleGame />} />
    </Routes>
  );
}

export default App;