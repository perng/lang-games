import { Routes, Route } from 'react-router-dom';
import Home from './components/Home';
import ArticleGame from './components/ArticleGame';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/article-game" element={<ArticleGame />} />
    </Routes>
  );
}

export default App;