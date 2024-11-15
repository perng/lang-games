import { Link } from 'react-router-dom';
import level2Data from '../../../data/WordFlash/word_flash_level_2.json';
import './styles.css';

export default function WordFlashMenu() {
    const levels = [
        {
            ...level2Data,
            totalWords: level2Data.words.length,
            progress: 0, // This will be updated from cookies later
        }
    ];

    return (
        <div className="game-menu">
            <h1>Word Flash</h1>
            <div className="levels-grid">
                {levels.map(level => (
                    <Link 
                        key={level.id} 
                        to={`/word-flash/${level.id}`} 
                        className="level-card"
                    >
                        <div className="level-image">
                            <img 
                                src={`/src/images/word-flash/${level.imageId}.jpg`} 
                                alt={level.title} 
                            />
                        </div>
                        <div className="level-content">
                            <h2>{level.title}</h2>
                            <p className="description">{level.description}</p>
                            <div className="level-stats">
                                <span>Words: {level.totalWords}</span>
                                <span>Progress: {level.progress}%</span>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
} 