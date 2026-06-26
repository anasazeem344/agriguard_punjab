import { Bell } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const DashboardTopbar = () => {
  const { lang, setLang } = useLanguage();

  return (
    <div className="dashboard-topbar">
      <div className="dashboard-topbar-actions">
        <div className="lang-switcher" role="group" aria-label="Language selection">
          <button
            id="dash-lang-en-btn"
            className={`lang-btn ${lang === 'English' ? 'active' : ''}`}
            onClick={() => setLang('English')}
          >
            English
          </button>
          <button
            id="dash-lang-ur-btn"
            className={`lang-btn ${lang === 'Urdu' ? 'active' : ''}`}
            onClick={() => setLang('Urdu')}
          >
            Urdu
          </button>
        </div>
        <button className="notification-bell" aria-label="Notifications">
          <Bell size={18} />
          <span className="notification-dot" />
        </button>
      </div>
    </div>
  );
};

export default DashboardTopbar;
