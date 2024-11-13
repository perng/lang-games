import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getCookie, deleteCookie } from '../../../utils/cookies';
import { logPageView, logEvent } from '../../../utils/analytics';
import { useLocation } from 'react-router-dom';
import './styles.css';

interface GameArticle {
    id: string;
    title: string;
    content: string;
}

interface GameMenuProps {
    title: string;
    articles: GameArticle[];
    gamePathPrefix: string;
    cookiePrefix: string;
    imageIdSuffix?: string;
}

export default function GameMenu({ 
    title, 
    articles, 
    gamePathPrefix, 
    cookiePrefix,
    imageIdSuffix = ''
}: GameMenuProps) {
    const location = useLocation();

    useEffect(() => {
        logPageView(location.pathname);
    }, [location]);

    const getCookieKey = (index: number) => `${cookiePrefix}-${index}`;

    const getStoryScore = (index: number): number | null => {
        const cookieKey = getCookieKey(index);
        const score = getCookie(cookieKey);
        return score ? parseInt(score) : null;
    }

    const getCardClass = (score: number | null): string => {
        if (score === null) return 'not-attempted';
        if (score >= 90) return 'excellent';
        if (score >= 70) return 'good';
        if (score >= 50) return 'fair';
        return 'needs-practice';
    };
    
    const getImageUrl = (id: string) => {
        try {
            return new URL(`../../../images/${id}${imageIdSuffix}.jpg`, import.meta.url).href;
        } catch (error) {
            console.error(`Failed to load image for ${id}:`, error);
            return '';
        }
    };
    
    const clearAllScores = () => {
        articles.forEach((_, index) => {
            const cookieKey = getCookieKey(index);
            deleteCookie(cookieKey);
        });
        window.location.reload();
    };
    
    const handleStorySelect = (title: string) => {
        logEvent('Navigation', `Selected ${gamePathPrefix} Story: ${title}`);
    };

    const getLatestScore = (index: number): number | null => {
        return getStoryScore(index);
    };

    return (
        <div className="game-menu">
            <header>
                <div className="header-content">
                    <h1>{title}</h1>
                </div>
                <div className="header-actions">
                    <button onClick={clearAllScores} className="clear-scores-button">
                        Clear All Scores
                    </button>
                    <Link to="/" className="back-link">← Back to Games</Link>
                </div>
            </header>
            
            <div className="stories-grid">
                {articles.map((article, index) => {
                    const score = getStoryScore(index);
                    const latestScore = getLatestScore(index);
                    
                    return (
                        <Link 
                            key={index} 
                            to={`/${gamePathPrefix}/${index}`} 
                            className={`story-card ${getCardClass(score)}`}
                            onClick={() => handleStorySelect(article.title)}
                        >
                            {article.id && (
                                <div className="story-image">
                                    <img src={getImageUrl(article.id)} alt={article.title} />
                                </div>
                            )}
                            <div className="story-content">
                                <h3>{article.title}</h3>
                                {latestScore !== null && (
                                    <div className="latest-score">{latestScore}%</div>
                                )}
                            </div>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
} 