export interface GameCard {
  id: string;
  title: string;
  tagline: string;
  imageUrl: string;
  path: string;
}

export const gameList: GameCard[] = [
  {
    id: 'article-game',
    title: 'THE Game',
    tagline: 'Master the use of "the" in English',
    imageUrl: '/images/the-game-logo.jpg',
    path: '/article-game'
  },
  {
    id: 'singular-plural-game',
    title: 'One or Many',
    tagline: 'Master singular and plural nouns',
    imageUrl: '/images/one-or-many-logo.jpg',  // Using the same logo for now
    path: '/singular-plural'
  }
]; 