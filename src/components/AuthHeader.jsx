import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Leaf } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const AuthHeader = ({ showBack = true, backTo = '/' }) => {
  const navigate = useNavigate();
  const { lang, setLang, t, isRtl } = useLanguage();

  return (
    <header className="header-nav" role="banner">
      {showBack ? (
        <button
          id="back-btn"
          className="back-button"
          onClick={() => navigate(backTo)}
          aria-label={t.back}
          title={t.back}
        >
          <ArrowLeft size={20} style={{ transform: isRtl ? 'scaleX(-1)' : 'none' }} />
        </button>
      ) : (
        <div style={{ gridColumn: 1 }}></div>
      )}

      <div className="logo-container" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
        <span className="logo-icon">
          <Leaf size={24} fill="currentColor" />
        </span>
        <span className="logo-text">{t.appName}</span>
      </div>

      <div className="lang-switcher" role="group" aria-label="Language selection">
        <button
          id="lang-en-btn"
          className={`lang-btn ${lang === 'English' ? 'active' : ''}`}
          onClick={() => setLang('English')}
        >
          English
        </button>
        <button
          id="lang-ur-btn"
          className={`lang-btn ${lang === 'Urdu' ? 'active' : ''}`}
          onClick={() => setLang('Urdu')}
        >
          Urdu
        </button>
      </div>
    </header>
  );
};

export default AuthHeader;
