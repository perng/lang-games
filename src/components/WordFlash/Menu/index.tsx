import { Link, useNavigate } from 'react-router-dom';
import levelsData from '../../../data/WordFlash/levels.json';
import { getStorageWithCookie } from '../../../utils/storage';
import './styles.css';
import { IoArrowBack } from 'react-icons/io5';

export default function WordFlashMenu() {
    const navigate = useNavigate();

    const levels = levelsData.levels.map(level => ({
        ...level,
        progress: parseFloat(getStorageWithCookie(`wordFlash-progress-${level.id}`) || '0').toFixed(2),
        masteredMeanings: parseInt(getStorageWithCookie(`wordFlash-mastered-${level.id}`) || '0'),
        totalMeanings: parseInt(getStorageWithCookie(`wordFlash-total-${level.id}`) || '0')
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
            <button 
                className="back-button"
                onClick={() => navigate('/')}
            >
                <IoArrowBack size={24} />
            </button>

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
        </div>
    );
} 