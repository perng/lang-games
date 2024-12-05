import { Link, useNavigate } from 'react-router-dom';
import { FaCheckCircle } from 'react-icons/fa';
import { useEffect, useState } from 'react';
import { getStorage } from '../../../utils/storage';
import './styles.css';

export default function VocabHeroMenu() {
    const navigate = useNavigate();
    const [levels, setLevels] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadLevels = async () => {
            try {
                const response = await fetch('/data/VocabHero/vh_levels.json');
                const data = await response.json();
                
                const levelsWithProgress = data.map((level: any) => ({
                    ...level,
                    progress: parseFloat(getStorage(`vocabHero-progress-${level.id}`) || '0')
                }));
                
                setLevels(levelsWithProgress);
                setIsLoading(false);
            } catch (error) {
                console.error('Error loading levels:', error);
                setIsLoading(false);
            }
        };

        loadLevels();
    }, []);

    const formatTitle = (title: string) => {
        const parts = title.split(/\[|\]/);
        return parts.map((part, index) => {
            return index % 2 === 0 ? (
                <span key={index}>{part}</span>
            ) : (
                <strong key={index}>{part}</strong>
            );
        });
    };

    return (
        <div className="word-flash-menu">

            <main className="levels-container">
                {isLoading ? (
                    <div className="loading">Loading levels...</div>
                ) : (
                    levels.map((level) => (
                        <Link 
                            key={level.id} 
                            to={`/vocab-hero/${level.id}`} 
                            className="level-item"
                            style={{
                                '--bg-light': level.progress === 100 ? '#e8f5e9' : '#f5f5f5',
                                '--bg-lighter': level.progress === 100 ? '#f1f8f2' : '#ffffff',
                                '--progress-color': level.progress === 100 ? '#4CAF50' : '#2196f3',
                            } as React.CSSProperties}
                        >
                            <div className="level-number">
                                {level.id.split('_').pop()}
                                {level.progress === 100 && (
                                    <FaCheckCircle className="complete-check" />
                                )}
                            </div>
                            <div className="level-info">
                                <p className="level-title">{formatTitle(level.title)}</p>
                                <div className="progress-bar">
                                    <div 
                                        className="progress-fill" 
                                        style={{ width: `${level.progress}%` }}
                                    />
                                </div>
                            </div>
                        </Link>
                    ))
                )}
            </main>

            <footer className="menu-footer">
                <div className="footer-content">
                    <p>Select a level to begin</p>
                </div>
            </footer>
        </div>
    );
} 