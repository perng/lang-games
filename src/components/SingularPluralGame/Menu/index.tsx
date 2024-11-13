import GameMenu from '../../shared/GameMenu';
import articles from '../../../data/singular.json';

export default function SingularPluralGameMenu() {
    return (
        <GameMenu
            title="One or Many"
            articles={articles}
            gamePathPrefix="singular-plural"
            cookiePrefix="singular-plural"
        />
    );
}
    