import { Link, useNavigate } from 'react-router-dom';
import levelsData from '../../../data/WordFlash/levels.json';
import { getCookie } from '../../../utils/cookies';
import './styles.css';

export default function WordFlashMenu() {
    const navigate = useNavigate();

    const levels = levelsData.levels.map(level => ({
        ...level,
        progress: parseFloat(getCookie(`wordFlash-progress-${level.id}`) || '0').toFixed(2),
        masteredMeanings: parseInt(getCookie(`wordFlash-mastered-${level.id}`) || '0'),
        totalMeanings: parseInt(getCookie(`wordFlash-total-${level.id}`) || '0')
    }));

    const getImageUrl = (image_name: string) => {
        try {
            return new URL(`../../../images/word-flash/${image_name}.jpg`, import.meta.url).href;
        } catch (error) {
            console.error(`Failed to load image for ${image_name}:`, error);
            return '';
        }
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
                                src={getImageUrl(level.imageId)}
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
                                    <div>Progress: {level.progress}%</div>                                    
                                    <div>Mastered: {level.masteredMeanings}/{level.totalMeanings}</div>
                                </div>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
            <button 
                className="home-button"
                onClick={() => navigate('/')}
            >
                Language Games
            </button>
        </div>
    );
} 