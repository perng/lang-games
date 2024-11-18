import GameMenu from '../../shared/GameMenu';
import articles from '../../../data/fruits.json';

export default function AnATheGameMenu() {
    return (
        <GameMenu
            title="A, An, or The"
            articles={articles}
            gamePathPrefix="an-a-the"
            cookiePrefix="a-an-the"
        />
    );
}
    