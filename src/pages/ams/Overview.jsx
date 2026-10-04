import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, Radio, MapPin, Mail, LogIn, KeyRound, ShieldCheck, ChevronRight,
  UserPlus, RefreshCw, UserX, UserCheck, Pencil, Ban, RotateCcw, Trash2
} from 'lucide-react';
import axiosClient from '../../api/axiosClient';
import { useLanguage } from '../../context/LanguageContext';
import './ams.css';

const KIND_ICON = {
  login: LogIn,
  login_backup_code_used: KeyRound,
  totp_enrolled: ShieldCheck,
  totp_reenrolled: ShieldCheck,
  admin_invited: UserPlus,
  invite_resent: RefreshCw,
  invite_cancelled: UserX,
  admin_account_activated: UserCheck,
  admin_edited: Pencil,
  admin_suspended: Ban,
  admin_reactivated: RotateCcw,
  admin_removed: Trash2
};

const Overview = () => {
  const { t } = useLanguage();
  const [stats, setStats] = useState(null);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [statsRes, logRes] = await Promise.all([
          axiosClient.get('/ams/stats'),
          axiosClient.get('/ams/audit-log?limit=5')
        ]);
        setStats(statsRes.data.stats);
        setEntries(logRes.data.entries);
      } catch {
        setStats(null);
        setEntries([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const statCards = stats
    ? [
        { label: t.statActiveAdmins, value: stats.activeAdmins, icon: Users },
        { label: t.statRegionalSensors, value: stats.regionalSensors.toLocaleString(), icon: Radio },
        { label: t.statDistrictsCovered, value: stats.districtsCovered, icon: MapPin },
        { label: t.statPendingInvites, value: stats.pendingInvites, icon: Mail }
      ]
    : [];

  const renderActivityText = (entry) => {
    switch (entry.kind) {
      case 'login': return t.auditLogLogin.replace('{name}', entry.actorName);
      case 'login_backup_code_used': return t.auditLogLoginBackupCode.replace('{name}', entry.actorName);
      case 'totp_enrolled': return t.auditLogTotpEnrolled.replace('{name}', entry.actorName);
      case 'totp_reenrolled': return t.auditLogTotpReenrolled.replace('{name}', entry.actorName);
      case 'admin_invited': return t.auditLogAdminInvited.replace('{name}', entry.actorName);
      case 'invite_resent': return t.auditLogInviteResent.replace('{name}', entry.actorName);
      case 'invite_cancelled': return t.auditLogInviteCancelled.replace('{name}', entry.actorName);
      case 'admin_account_activated': return t.auditLogAdminAccountActivated.replace('{name}', entry.actorName);
      case 'admin_edited': return t.auditLogAdminEdited.replace('{name}', entry.actorName);
      case 'admin_suspended': return t.auditLogAdminSuspended.replace('{name}', entry.actorName);
      case 'admin_reactivated': return t.auditLogAdminReactivated.replace('{name}', entry.actorName);
      case 'admin_removed': return t.auditLogAdminRemoved.replace('{name}', entry.actorName);
      default: return entry.actorName;
    }
  };

  return (
    <>
      <div className="ams-page-header">
        <div>
          <h1 className="ams-page-title">{t.amsOverviewTitle}</h1>
          <p className="ams-page-subtitle">{t.amsOverviewSubtitle}</p>
        </div>
      </div>

      {!loading && stats && (
        <section className="ams-stat-grid">
          {statCards.map(({ label, value, icon: Icon }) => (
            <div className="ams-panel-card" key={label}>
              <Icon size={20} color="var(--ams-forest)" />
              <p className="ams-stat-card-value" style={{ marginTop: 12 }}>{value}</p>
              <p className="ams-stat-card-label">{label}</p>
            </div>
          ))}
        </section>
      )}

      <section className="ams-panel-card ams-recent-card">
        <div className="ams-recent-header">
          <h2 className="ams-recent-title">{t.amsRecentActivity}</h2>
          <Link to="/ams/audit" className="ams-footer-link" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 14 }}>
            {t.amsViewAll} <ChevronRight size={16} />
          </Link>
        </div>

        {entries.length === 0 ? (
          <p className="ams-activity-empty">{t.amsNoActivity}</p>
        ) : (
          <ul className="ams-activity-list">
            {entries.map((entry) => {
              const Icon = KIND_ICON[entry.kind] || LogIn;
              return (
                <li className="ams-activity-item" key={entry.id}>
                  <span className="ams-activity-icon"><Icon size={16} /></span>
                  <div>
                    <p className="ams-activity-text">{renderActivityText(entry)}</p>
                    <p className="ams-activity-time">{new Date(entry.createdAt).toLocaleString()}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
};

export default Overview;
