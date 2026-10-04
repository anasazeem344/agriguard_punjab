import { useNavigate, Link } from 'react-router-dom';
import { Tractor, Shield, ArrowRight } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import AuthHeader from '../components/AuthHeader';

const RoleSelection = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <div className="app-container">
      <AuthHeader showBack={false} />

      <main className="role-selection-section" role="main">
        <div className="role-selection-header">
          <h1 id="screen-title" className="role-selection-title">{t.roleTitle}</h1>
          <p id="screen-subtitle" className="role-selection-subtitle">{t.roleSubtitle}</p>
        </div>

        <div className="role-cards-container">
          <div
            id="select-farmer-card"
            className="role-card farmer"
            onClick={() => navigate('/register/farmer')}
          >
            <div className="role-card-decorator" aria-hidden="true" />
            <div className="role-card-icon-wrapper" aria-hidden="true">
              <Tractor size={26} />
            </div>
            <h2 className="role-card-title">{t.farmerRoleTitle}</h2>
            <p className="role-card-desc">{t.farmerRoleDesc}</p>
            <span className="role-card-link">
              <span>{t.farmerRoleLink}</span>
              <ArrowRight size={16} />
            </span>
          </div>

          <div
            id="select-admin-card"
            className="role-card admin"
            onClick={() => navigate('/login')}
          >
            <div className="role-card-decorator" aria-hidden="true" />
            <div className="role-card-icon-wrapper" aria-hidden="true">
              <Shield size={26} />
            </div>
            <h2 className="role-card-title">{t.adminRoleTitle}</h2>
            <p className="role-card-desc">{t.adminRoleDesc}</p>
            <span className="role-card-link">
              <span>{t.adminRoleLink}</span>
              <ArrowRight size={16} />
            </span>
          </div>
        </div>

        <div className="role-selection-footer">
          <span>{t.footerText}</span>
          <Link id="role-login-link" to="/login" className="footer-link">
            {t.loginLink}
          </Link>
        </div>
      </main>
    </div>
  );
};

export default RoleSelection;
