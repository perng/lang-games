import { Link, useNavigate } from 'react-router-dom';
import levelsData from '../../../data/VocabHero/levels.json';
import { getCookie } from '../../../utils/cookies';
import { IoArrowBack } from 'react-icons/io5';
import './styles.css';
import { useState, useEffect } from 'react';

export default function VocabHeroMenu() {
    const navigate = useNavigate();
    const [levelStats, setLevelStats] = useState(levelsData.levels.map(level => ({
        ...level,
        progress: "0.00",
        masteredWords: 0,
        totalWords: 0
    })));

    useEffect(() => {
        const loadLevelStats = async () => {
            const updatedStats = await Promise.all(levelsData.levels.map(async (level) => {
                try {
                    // Dynamically import the level's question data
                    const levelData = await import(`../../../data/VocabHero/${level.id}`);
                    const questions = levelData.default;
                    
                    // Count mastered questions
                    const masteredWords = questions.filter(q => 
                        parseInt(getCookie(`vocabHero-${q.id}`) || '0') > 0
                    ).length;

                    const totalWords = questions.length;
                    const progress = totalWords > 0 ? ((masteredWords / totalWords) * 100) : 0;

                    return {
                        ...level,
                        progress: progress.toFixed(2),
                        masteredWords,
                        totalWords
                    };
                } catch (error) {
                    console.error(`Failed to load stats for level ${level.id}:`, error);
                    return {
                        ...level,
                        progress: "0.00",
                        masteredWords: 0,
                        totalWords: 0
                    };
                }
            }));

            setLevelStats(updatedStats);
        };

        loadLevelStats();
    }, []);

    const getImageUrl = (image_name: string) => {
        try {
            return new URL(`../../../images/vocab-hero/${image_name}.jpg`, import.meta.url).href;
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

            <h1>Vocab Hero</h1>
            <div className="levels-grid">
                {levelStats.map(level => (
                    <Link 
                        key={level.id} 
                        to={`/vocab-hero/${level.id}`} 
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
                                    <div>Mastered: {level.masteredWords}/{level.totalWords}</div>
                                </div>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
} 