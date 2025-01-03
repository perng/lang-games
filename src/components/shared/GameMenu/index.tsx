import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getStorage } from '../../../utils/storage';
import { getCookie } from '../../../utils/cookies';
import { logPageView, logEvent } from '../../../utils/analytics';
import { useLocation } from 'react-router-dom';
import './styles.css';
import { IoArrowBack } from 'react-icons/io5';

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
        const scoreStr = getStorage(cookieKey);
        const scoreFromStorage = scoreStr ? parseInt(scoreStr) : 0;
        const scoreFromCookieStr = getCookie(cookieKey);
        const scoreFromCookie = scoreFromCookieStr ? parseInt(scoreFromCookieStr) : 0;          
        return Math.max(scoreFromStorage, scoreFromCookie);
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
    
    const handleStorySelect = (title: string) => {
        logEvent('Navigation', `Selected ${gamePathPrefix} Story: ${title}`);
    };

    const getLatestScore = (index: number): number | null => {
        return getStoryScore(index);
    };

    return (
        <div className="game-menu">
            
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