import { Link, useNavigate } from 'react-router-dom';
import { IoArrowBack } from 'react-icons/io5';

interface Level {
    id: string;
    title: string;
    progress: number;
    masteredMeanings: number;
    totalMeanings: number;
}

export default function WordFlashMenu() {
    const navigate = useNavigate();
    
    const generateLevels = (): Level[] => {
        const totalLevels = 100;
        return Array.from({ length: totalLevels }, (_, index) => ({
            id: `word_flash_level_${index + 1}`,
            title: `Level ${index + 1}`,
            progress: 0, // This would come from your progress tracking system
        }));
    };

    const levels = generateLevels();

    return (
        <div className="word-flash-menu">
            <header>
                <button 
                    className="back-button"
                    onClick={() => navigate('/')}
                >
                    <IoArrowBack size={24} />
                </button>
                <h1>Word Flash</h1>
            </header>

            <main className="levels-container">
                {levels.map(level => (
                    <Link 
                        key={level.id} 
                        to={`/word-flash/${level.id}`} 
                        className="level-card"
                    >
                        <div className="level-shape" />
                        <div className="level-content">
                            <h2>{level.title}</h2>
                            <div className="progress-bar">
                                <div 
                                    className="progress-fill" 
                                    style={{ width: `${level.progress}%` }}
                                />
                            </div>
                        </div>
                    </Link>
                ))}
            </main>
        </div>
    );
} 