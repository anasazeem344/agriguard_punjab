import { Outlet } from 'react-router-dom';
import AmsSidebar from './AmsSidebar';
import { useLanguage } from '../../context/LanguageContext';
import './ams.css';

const AmsLayout = () => {
  const { lang, setLang } = useLanguage();

  return (
    <div className="ams-root">
      <div className="ams-shell">
        <AmsSidebar />
        <div className="ams-main-content">
          <header className="ams-topbar">
            <div className="ams-lang-toggle" role="group" aria-label="Language selection">
              <button type="button" className={`ams-lang-btn ${lang === 'English' ? 'active' : ''}`} onClick={() => setLang('English')}>English</button>
              <button type="button" className={`ams-lang-btn ${lang === 'Urdu' ? 'active' : ''}`} onClick={() => setLang('Urdu')}>Urdu</button>
            </div>
          </header>
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default AmsLayout;
