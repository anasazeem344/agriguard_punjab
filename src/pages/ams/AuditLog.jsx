import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, LogIn, KeyRound, ShieldCheck, UserPlus, RefreshCw, UserX, UserCheck, Pencil, Ban, RotateCcw, Trash2 } from 'lucide-react';
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

const LOG_PAGE_LIMIT = 20;

const AuditLog = () => {
  const { t } = useLanguage();
  const [entries, setEntries] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [kind, setKind] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (kind) params.set('kind', kind);
      params.set('page', String(page));
      params.set('limit', String(LOG_PAGE_LIMIT));
      const res = await axiosClient.get(`/ams/audit-log?${params.toString()}`);
      setEntries(res.data.entries);
      setTotal(res.data.total);
    } catch {
      setEntries([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [kind, page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [kind]);

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

  const kindOptions = [
    { value: '', label: t.amsFilterAll },
    { value: 'login', label: t.navAmsOverview },
    { value: 'admin_invited', label: t.amsInviteAdminBtn },
    { value: 'admin_suspended', label: t.amsSuspendBtn },
    { value: 'admin_reactivated', label: t.amsReactivateBtn },
    { value: 'admin_removed', label: t.amsRemoveBtn }
  ];

  const pages = Math.max(1, Math.ceil(total / LOG_PAGE_LIMIT));
  const from = total === 0 ? 0 : (page - 1) * LOG_PAGE_LIMIT + 1;
  const to = Math.min(page * LOG_PAGE_LIMIT, total);

  return (
    <>
      <div className="ams-page-header">
        <div>
          <h1 className="ams-page-title">{t.amsAuditTitle}</h1>
          <p className="ams-page-subtitle">{t.amsAuditSubtitle}</p>
        </div>
      </div>

      <section className="ams-panel-card" style={{ marginTop: 24 }}>
        <div className="ams-toolbar" style={{ marginTop: 0 }}>
          <label className="ams-field-wrap" style={{ maxWidth: 260 }}>
            <span className="ams-field-label">{t.amsAuditFilterLabel}</span>
            <select className="ams-select" style={{ width: '100%' }} value={kind} onChange={(e) => setKind(e.target.value)}>
              {kindOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </label>
        </div>

        {!loading && entries.length === 0 ? (
          <div className="ams-empty-state">
            <p className="ams-empty-state-title">{t.amsAuditNoEntries}</p>
            <p className="ams-empty-state-sub">{t.amsAuditNoEntriesSub}</p>
          </div>
        ) : (
          <ul className="ams-activity-list" style={{ marginTop: 24 }}>
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

        {total > 0 && (
          <div className="ams-pagination">
            <span className="ams-pagination-info">{from}–{to} / {total}</span>
            <div className="ams-pagination-controls">
              <button type="button" className="ams-pagination-btn" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                <ChevronLeft size={16} /> {t.amsPaginationPrev}
              </button>
              <button type="button" className="ams-pagination-btn" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
                {t.amsPaginationNext} <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </section>
    </>
  );
};

export default AuditLog;
