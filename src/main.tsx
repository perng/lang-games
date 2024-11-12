import React from 'react';
import ReactDOM from 'react-dom/client';
import ReactGA from 'react-ga4';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

import Home from './routes/Home';
import { initGA } from './utils/analytics';

import ArticleGameMenu from './components/ArticleGame/Menu';
import ArticleGame from './components/ArticleGame';
import SingularPluralGame from './components/SingularPluralGame';
import SingularPluralGameMenu from './components/SingularPluralGame/Menu';
import AnATheGame from './components/AnATheGame';
import AnATheGameMenu from './components/AnATheGame/Menu';
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
]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
); 