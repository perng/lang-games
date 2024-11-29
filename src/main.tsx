import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import { initGA } from './utils/analytics';
import InfoIcon from '@mui/icons-material/Info';
import { IconButton, Popover, Typography, Link } from '@mui/material';

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

function InfoPopup() {
  const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);

  return (
    <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 1000 }}>
      <IconButton onClick={handleClick} color="primary">
        <InfoIcon />
      </IconButton>
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <Typography sx={{ p: 2 }}>
          此英語學習遊戲正在開發中，歡迎您試用
          <br />
          <Link href="https://forms.gle/AuKcZyUYvtdsDuFH6" target="_blank" rel="noopener">
            提供意見回饋
          </Link>
        </Typography>
      </Popover>
    </div>
  );
}

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
    <InfoPopup />
  </React.StrictMode>,
); 