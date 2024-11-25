import { Link, useNavigate } from 'react-router-dom';
import { IoArrowBack } from 'react-icons/io5';
import { useEffect, useState } from 'react';

interface Level {
    id: string;
    title: string;
    description: string;
    game_type: string;
    wordFile: string;
    progress?: number; // Optional since it comes from progress tracking
}

export default function WordFlashMenu() {
    const navigate = useNavigate();
    const [levels, setLevels] = useState<Level[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetch('/data/WordFlash/levels.json')
            .then(response => response.json())
            .then(data => {
                setLevels(data);
                setIsLoading(false);
            })
            .catch(error => {
                console.error('Error loading levels:', error);
                setIsLoading(false);
            });
    }, []);

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
                {isLoading ? (
                    <div className="loading">Loading levels...</div>
                ) : (
                    levels.map(level => (
                        <Link 
                            key={level.id} 
                            to={`/word-flash/${level.id}`} 
                            className="level-card"
                        >
                            <div className="level-shape" />
                            <div className="level-content">
                                <h2>{level.title}</h2>
                                <p>{level.description}</p>
                                <div className="progress-bar">
                                    <div 
                                        className="progress-fill" 
                                        style={{ width: `${level.progress ?? 0}%` }}
                                    />
                                </div>
                            </div>
                        </Link>
                    ))
                )}
            </main>
        </div>
    );
} 