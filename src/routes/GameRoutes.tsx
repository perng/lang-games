import WordFlashMenu from '../components/WordFlash/Menu';
import VocabHeroMenu from '../components/VocabHero/Menu';
import SingularPluralMenu from '../components/SingularPluralGame/Menu';
import ArticleGameMenu from '../components/ArticleGame/Menu';
import AnATheGameMenu from '../components/AnATheGame/Menu';

import WordFlashGame from '../components/WordFlash/Game';
import VocabHeroGame from '../components/VocabHero/Game';
import SingularPluralGamePlay from '../components/SingularPluralGame';
import ArticleGamePlay from '../components/ArticleGame';
import AnATheGamePlay from '../components/AnATheGame';

// Menu components
export function WordFlash() {
  return <WordFlashMenu />;
}

export function VocabHero() {
  return <VocabHeroMenu />;
}

export function SingularPluralGame() {
  return <SingularPluralMenu />;
}

export function ArticleGame() {
  return <ArticleGameMenu />;
}

export function AnATheGame() {
  return <AnATheGameMenu />;
}

// Gameplay components
export {
  WordFlashGame,
  VocabHeroGame,
  SingularPluralGamePlay,
  ArticleGamePlay,
  AnATheGamePlay
}; 