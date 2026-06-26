import { NavLink, useNavigate } from 'react-router-dom';
import { LogOut, HelpCircle, LifeBuoy, Settings as SettingsIcon, Leaf } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

const DashboardSidebar = ({ navItems, portalLabel }) => {
  const { t } = useLanguage();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    if (window.confirm(t.logoutConfirm)) {
      logout();
      navigate('/login');
    }
  };

  const initial = user?.fullName?.trim()?.charAt(0)?.toUpperCase() || '?';

  return (
    <aside className="dashboard-sidebar">
      <div className="sidebar-brand">
        <Leaf size={22} fill="currentColor" />
        <span>AgriResearch Pro</span>
      </div>

      <div className="sidebar-user">
        <div className="sidebar-avatar">{initial}</div>
        <div>
          <p className="sidebar-welcome">{t.sidebarWelcome}</p>
          <p className="sidebar-user-name">{user?.fullName}</p>
          <p className="sidebar-portal-label">{portalLabel}</p>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
          >
            <Icon size={18} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <NavLink to="settings" className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}>
          <SettingsIcon size={18} />
          <span>{t.navSettings}</span>
        </NavLink>
        <NavLink to="help" className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}>
          <HelpCircle size={18} />
          <span>{t.navHelp}</span>
        </NavLink>
        <NavLink to="support" className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}>
          <LifeBuoy size={18} />
          <span>{t.navSupport}</span>
        </NavLink>
        <button id="sidebar-logout-btn" className="sidebar-nav-item logout" onClick={handleLogout}>
          <LogOut size={18} />
          <span>{t.navLogout}</span>
        </button>
      </div>
    </aside>
  );
};

export default DashboardSidebar;
