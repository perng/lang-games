import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './routes/Home';
import { 
  WordFlash, 
  VocabHero, 
  SingularPluralGame, 
  ArticleGame, 
  AnATheGame 
} from './routes/GameRoutes';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />}>
          <Route path="word-flash" element={<WordFlash />} />
          <Route path="vocab-hero" element={<VocabHero />} />
          <Route path="singular-plural" element={<SingularPluralGame />} />
          <Route path="article-game" element={<ArticleGame />} />
          <Route path="an-a-the" element={<AnATheGame />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
); 