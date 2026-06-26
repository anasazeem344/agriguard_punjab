import { Outlet } from 'react-router-dom';
import { LayoutGrid, Users, Radio, BarChart3, FileText } from 'lucide-react';
import DashboardSidebar from '../../components/DashboardSidebar';
import DashboardTopbar from '../../components/DashboardTopbar';
import { useLanguage } from '../../context/LanguageContext';

const AdminLayout = () => {
  const { t } = useLanguage();

  const navItems = [
    { to: 'dashboard', label: t.navDashboard, icon: LayoutGrid },
    { to: '', end: true, label: t.navManageFarmers, icon: Users },
    { to: 'global-sensors', label: t.navGlobalSensors, icon: Radio },
    { to: 'system-analytics', label: t.navSystemAnalytics, icon: BarChart3 },
    { to: 'reports', label: t.navReports, icon: FileText }
  ];

  return (
    <div className="dashboard-shell">
      <DashboardSidebar navItems={navItems} portalLabel={t.sidebarAdminPortal} />
      <div className="dashboard-main">
        <DashboardTopbar />
        <div className="dashboard-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;
