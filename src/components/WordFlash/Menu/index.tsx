import { Link } from 'react-router-dom';
import level2Data from '../../../data/WordFlash/word_flash_level_2.json';
import { getCookie, deleteCookie } from '../../../utils/cookies';
import './styles.css';

export default function WordFlashMenu() {
    const levels = [
        {
            ...level2Data,
            progress: parseFloat(getCookie(`wordFlash-progress-${level2Data.id}`) || '0').toFixed(2),
            masteredMeanings: parseInt(getCookie(`wordFlash-mastered-${level2Data.id}`) || '0'),
            totalMeanings: parseInt(getCookie(`wordFlash-total-${level2Data.id}`) || '0')
        }
    ];

    const handleClearScores = () => {
        // Clear progress cookies
        levels.forEach(level => {
            deleteCookie(`wordFlash-progress-${level.id}`);
            deleteCookie(`wordFlash-mastered-${level.id}`);
            deleteCookie(`wordFlash-total-${level.id}`);
            
            // Clear individual word meaning scores
            level.words.forEach(word => {
                word.meanings.forEach((_, index) => {
                    deleteCookie(`${word.word}-${index}`);
                });
            });
        });

        // Force page reload to update displayed scores
        window.location.reload();
    };

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
                                <div className="progress-bar">
                                    <div 
                                        className="progress-fill" 
                                        style={{ width: `${level.progress}%` }}
                                    ></div>
                                </div>
                                <div className="stats-text">
                                    <span>Progress: {level.progress}%</span>
                                    <span>Mastered: {level.masteredMeanings}/{level.totalMeanings}</span>
                                </div>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
            <button 
                className="clear-scores-button" 
                onClick={handleClearScores}
            >
                Clear All Scores
            </button>
        </div>
    );
} 