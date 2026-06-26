import { Outlet } from 'react-router-dom';
import { LayoutGrid, Radio, ScanEye, BellRing, FileText } from 'lucide-react';
import DashboardSidebar from '../../components/DashboardSidebar';
import DashboardTopbar from '../../components/DashboardTopbar';
import { useLanguage } from '../../context/LanguageContext';

const FarmerLayout = () => {
  const { t } = useLanguage();

  const navItems = [
    { to: '', end: true, label: t.navDashboard, icon: LayoutGrid },
    { to: 'iot-sensors', label: t.navIotSensors, icon: Radio },
    { to: 'ai-diagnostics', label: t.navAiDiagnostics, icon: ScanEye },
    { to: 'alerts', label: t.navAlerts, icon: BellRing },
    { to: 'reports', label: t.navReports, icon: FileText }
  ];

  return (
    <div className="dashboard-shell">
      <DashboardSidebar navItems={navItems} portalLabel={t.sidebarFarmerPortal} />
      <div className="dashboard-main">
        <DashboardTopbar />
        <div className="dashboard-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default FarmerLayout;
