import { Link, Outlet, useNavigate } from 'react-router-dom';
import './Home.css';
import { useState, useEffect } from 'react';
import { InfoPopup } from '../components/InfoPopup';

// Define menu structure
const menuItems = {
  '單字': [
    { title: '單字學習', path: '/word-flash' },
    { title: '單字測驗', path: '/vocab-hero' },
  ],
  '文法': [
    { title: '單複數', path: '/singular-plural' },
    { title: '定冠詞', path: '/article-game' },
    { title: '所有冠詞', path: '/an-a-the' },
  ]
};

// Helper function to find menu category by submenu title
const findMenuCategory = (subMenuTitle: string): string | null => {
  for (const [category, items] of Object.entries(menuItems)) {
    if (items.some(item => item.title === subMenuTitle)) {
      return category;
    }
  }
  return null;
};

// Helper function to find menu item by title
const findMenuItem = (title: string) => {
  for (const items of Object.values(menuItems)) {
    const item = items.find(item => item.title === title);
    if (item) return item;
  }
  return null;
};

export default function Home() {
  const navigate = useNavigate();
  const [activeMenu, setActiveMenu] = useState<string | null>(() => {
    const lastVisited = localStorage.getItem('lastVisitedMenu');
    return lastVisited ? findMenuCategory(lastVisited) : '單字';
  });

  useEffect(() => {
    // If no active menu is set or no last visited menu, default to showing 單字學習
    const lastVisited = localStorage.getItem('lastVisitedMenu') || '單字學習';
    const menuItem = findMenuItem(lastVisited);
    
    if (menuItem) {
      setActiveMenu(findMenuCategory(lastVisited));
      // Navigate to the game path
      navigate(menuItem.path);
    } else {
      // Default to 單字學習 if no valid last visited menu
      setActiveMenu('單字');
      const defaultItem = findMenuItem('單字學習');
      if (defaultItem) {
        localStorage.setItem('lastVisitedMenu', '單字學習');
        navigate(defaultItem.path);
      }
    }
  }, [navigate]);

  const handleSubMenuClick = (title: string) => {
    localStorage.setItem('lastVisitedMenu', title);
  };

  return (
    <div className="home">
      <InfoPopup />
      
      <div className="menu-container">
        {/* First level menu */}
        <div className="main-menu">
          {Object.keys(menuItems).map(menuTitle => (
            <button
              key={menuTitle}
              className={`menu-item ${activeMenu === menuTitle ? 'active' : ''}`}
              onClick={() => setActiveMenu(menuTitle)}
            >
              {menuTitle}
            </button>
          ))}
        </div>

        {/* Second level menu */}
        {activeMenu && (
          <div className="sub-menu">
            {menuItems[activeMenu as keyof typeof menuItems].map(item => (
              <Link 
                key={item.path} 
                to={item.path} 
                className="sub-menu-item"
                onClick={() => handleSubMenuClick(item.title)}
              >
                {item.title}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Game content area */}
      <div className="game-content">
        <Outlet />
      </div>
    </div>
  );
}
