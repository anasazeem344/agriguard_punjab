import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutGrid, Users, ClipboardList, Settings as SettingsIcon, LogOut, Leaf } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';

const AmsSidebar = () => {
  const { t } = useLanguage();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const navItems = [
    { to: '', end: true, label: t.navAmsOverview, icon: LayoutGrid },
    { to: 'admins', label: t.navAmsAdmins, icon: Users },
    { to: 'audit', label: t.navAmsAudit, icon: ClipboardList },
    { to: 'settings', label: t.navSettings, icon: SettingsIcon }
  ];

  const handleLogout = () => {
    if (window.confirm(t.logoutConfirm)) {
      logout();
      navigate('/ams/login');
    }
  };

  const initial = user?.fullName?.trim()?.charAt(0)?.toUpperCase() || 'SA';

  return (
    <aside className="ams-sidebar">
      <div className="ams-glow ams-glow-leaf" />
      <div className="ams-glow ams-glow-peach" />

      <div className="ams-sidebar-top">
        <div className="ams-aside-brand"><Leaf size={22} /> {t.amsBrand}</div>
        <p className="ams-sidebar-console-label">{t.amsSidebarConsole}</p>
        <nav className="ams-sidebar-nav">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to || 'index'} to={to} end={end} className={({ isActive }) => `ams-nav-item ${isActive ? 'active' : ''}`}>
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="ams-sidebar-bottom">
        <div className="ams-sidebar-user">
          <div className="ams-sidebar-avatar">{initial}</div>
          <div>
            <p className="ams-sidebar-user-name">{t.amsSuperadmin}</p>
            <p className="ams-sidebar-user-email" dir="ltr">{user?.email}</p>
          </div>
        </div>
        <button id="ams-sidebar-logout-btn" type="button" className="ams-logout-btn" onClick={handleLogout}>
          <LogOut size={18} /> <span>{t.navLogout}</span>
        </button>
      </div>
    </aside>
  );
};

export default AmsSidebar;
