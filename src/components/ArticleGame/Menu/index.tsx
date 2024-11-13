import GameMenu from '../../shared/GameMenu';
import articles from '../../../data/articles.json';

export default function ArticleGameMenu() {
    return (
        <GameMenu
            title="THE Game"
            articles={articles}
            gamePathPrefix="article-game"
            cookiePrefix="articleGame-score"
            imageIdSuffix="-small"
        />
    );
} 