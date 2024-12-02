import { Link, Outlet } from 'react-router-dom';
import './Home.css';
import { useState } from 'react';
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

export default function Home() {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

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
              <Link key={item.path} to={item.path} className="sub-menu-item">
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
