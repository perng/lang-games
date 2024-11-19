import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import { initGA } from './utils/analytics';

import Home from './routes/Home';
import ArticleGameMenu from './components/ArticleGame/Menu';
import ArticleGame from './components/ArticleGame';
import SingularPluralGame from './components/SingularPluralGame';
import SingularPluralGameMenu from './components/SingularPluralGame/Menu';
import AnATheGame from './components/AnATheGame';
import AnATheGameMenu from './components/AnATheGame/Menu';
import WordFlashMenu from './components/WordFlash/Menu';
import WordFlash from './components/WordFlash/Game';
import VocabHeroMenu from './components/VocabHero/Menu';
import VocabHero from './components/VocabHero/Game';
import './styles/global.css';

// Initialize GA
initGA();

const router = createBrowserRouter([
  {
    path: '/',
    element: <Home />,
  },
  {
    path: '/article-game',
    element: <ArticleGameMenu />,
  },
  {
    path: '/article-game/:storyId',
    element: <ArticleGame />,
  },
  {
    path: '/singular-plural',
    element: <SingularPluralGameMenu />,
  },
  {
    path: '/singular-plural/:storyId',
    element: <SingularPluralGame />,
  },
  {
    path: '/an-a-the',
    element: <AnATheGameMenu />,
  },
  {
    path: '/an-a-the/:storyId',
    element: <AnATheGame />,
  },
  {
    path: '/word-flash',
    element: <WordFlashMenu />,
  },
  {
    path: '/word-flash/:levelId',
    element: <WordFlash />,
  },
  {
    path: '/vocab-hero',
    element: <VocabHeroMenu />,
  },
  {
    path: '/vocab-hero/:levelId',
    element: <VocabHero />,
  },
]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
); 