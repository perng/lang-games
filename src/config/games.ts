export interface Game {
  id: string;
  title: string;
  description: string;
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Insane';
  path: string;
  icon: string;
  logoSrc: string;
}

export const games: Game[] = [
  {
    id: 'singular-plural',
    title: 'Singular & Plural Game',
    description: 'Practice using singular and plural forms correctly',
    difficulty: 'Easy',
    path: '/singular-plural',
    icon: '🔢',
    logoSrc: '/images/one-or-many-logo.jpg'
  },
  {
    id: 'article-game',
    title: 'THE Game',
    description: 'Master the use of "the" in English',
    difficulty: 'Medium',
    path: '/article-game',
    icon: '📚',
    logoSrc: '/images/the-game-logo.jpg'
  },
  {
    id: 'an-a-the',
    title: 'Articles Game',
    description: 'Practice using "a", "an", and "the" correctly',
    difficulty: 'Hard',
    path: '/an-a-the',
    icon: '🎯',
    logoSrc: '/images/article-game-logo.jpg'
  }  
]; 