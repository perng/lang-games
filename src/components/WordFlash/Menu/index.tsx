import { Link, useNavigate } from 'react-router-dom';
import level6Data from '../../../data/WordFlash/word_flash_level_6.json';
import { getCookie, deleteCookie } from '../../../utils/cookies';
import './styles.css';

export default function WordFlashMenu() {
    const navigate = useNavigate();

    const levels = [
        {
            ...level6Data,
            progress: parseFloat(getCookie(`wordFlash-progress-${level6Data.id}`) || '0').toFixed(2),
            masteredMeanings: parseInt(getCookie(`wordFlash-mastered-${level6Data.id}`) || '0'),
            totalMeanings: parseInt(getCookie(`wordFlash-total-${level6Data.id}`) || '0')
        }
    ];

    const getImageUrl = (image_name: string) => {
        console.log(image_name);
        try {
            return new URL(`../../../images/word-flash/${image_name}.jpg`, import.meta.url).href;
        } catch (error) {
            console.error(`Failed to load image for ${image_name}:`, error);
            return '';
        }
    };


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