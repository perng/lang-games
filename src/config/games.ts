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
    id: 'word-flash',
    title: '單字學習',
    description: '',
    difficulty: 'Easy',
    path: '/word-flash',
    icon: '✨',
    logoSrc: '/images/word-flash-logo.jpg' 
  },
  {
    id: 'vocab-hero',
    title: '單字測驗',
    description: '',
    difficulty: 'Medium',
    path: '/vocab-hero',
    icon: '📖',
    logoSrc: '/images/vocab-hero-logo.jpg'  },
  {
    id: 'singular-plural',
    title: '單複數練習',
    description: '',
    difficulty: 'Easy',
    path: '/singular-plural',
    icon: '🔢',
    logoSrc: '/images/one-or-many-logo.jpg'
  },
  {
    id: 'article-game',
    title: '定冠詞練習',
    description: '',
    difficulty: 'Medium',
    path: '/article-game',
    icon: '📚',
    logoSrc: '/images/the-game-logo.jpg'
  },
  {
    id: 'an-a-the',
    title: '所有冠詞練習',
    description: '',
    difficulty: 'Hard',
    path: '/an-a-the',
    icon: '🎯',
    logoSrc: '/images/article-game-logo.jpg' 
  }
]; 