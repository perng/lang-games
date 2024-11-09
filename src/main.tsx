import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import Home from './routes/Home';
import ArticleGame from './components/ArticleGame';
import SingularPluralGame from './components/SingularPluralGame';
import './index.css';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Home />,
  },
  {
    path: '/article-game',
    element: <ArticleGame />,
  },
  {
    path: '/article-game/:storyId',
    element: <ArticleGame />,
  },
  {
    path: '/singular-plural',
    element: <SingularPluralGame />,
  },
  {
    path: '/singular-plural/:storyId',
    element: <SingularPluralGame />,
  }
]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
); 