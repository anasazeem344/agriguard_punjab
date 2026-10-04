import { useCallback, useEffect, useState } from 'react';
import {
  Search, UserPlus, Pencil, Ban, RotateCcw, Trash2, RefreshCw, X,
  ChevronLeft, ChevronRight, Users, Mail
} from 'lucide-react';
import axiosClient from '../../api/axiosClient';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import './ams.css';

const PAGE_LIMIT = 10;

const ManageAdmins = () => {
  const { t } = useLanguage();
  const { showToast } = useToast();

  const [admins, setAdmins] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [panel, setPanel] = useState('none'); // 'none' | 'invite' | 'row'
  const [selected, setSelected] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null); // 'suspend' | 'reactivate' | 'remove' | 'cancelInvite'
  const [actionLoading, setActionLoading] = useState(false);

  const [inviteForm, setInviteForm] = useState({ fullName: '', email: '', district: '' });
  const [inviteError, setInviteError] = useState(null);
  const [inviteDevLink, setInviteDevLink] = useState(null);
  const [inviteLoading, setInviteLoading] = useState(false);

  const [editForm, setEditForm] = useState({ fullName: '', district: '' });
  const [editError, setEditError] = useState(null);
  const [editLoading, setEditLoading] = useState(false);

  const loadAdmins = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (statusFilter) params.set('status', statusFilter);
      params.set('page', String(page));
      params.set('limit', String(PAGE_LIMIT));
      const res = await axiosClient.get(`/ams/admins?${params.toString()}`);
      setAdmins(res.data.admins);
      setTotal(res.data.total);
    } catch {
      setAdmins([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, page]);

  useEffect(() => {
    loadAdmins();
  }, [loadAdmins]);

  // Reset to page 1 whenever the search/filter changes.
  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  const closePanel = () => {
    setPanel('none');
    setSelected(null);
    setConfirmAction(null);
    setInviteError(null);
    setInviteDevLink(null);
    setEditError(null);
  };

  const openInvite = () => {
    setInviteForm({ fullName: '', email: '', district: '' });
    setInviteError(null);
    setInviteDevLink(null);
    setPanel('invite');
  };

  const openRow = (row) => {
    setSelected(row);
    setEditForm({ fullName: row.fullName, district: row.district || '' });
    setEditError(null);
    setConfirmAction(null);
    setPanel('row');
  };

  const handleInviteSubmit = async (e) => {
    e.preventDefault();
    if (!inviteForm.fullName.trim() || !inviteForm.email.trim()) {
      setInviteError(t.errorRequired);
      return;
    }
    try {
      setInviteLoading(true);
      setInviteError(null);
      const res = await axiosClient.post('/ams/admins/invite', {
        fullName: inviteForm.fullName.trim(),
        email: inviteForm.email.trim(),
        district: inviteForm.district.trim() || undefined
      });
      showToast(t.amsInviteFormSuccess, 'success');
      if (res.data.devInviteUrl) {
        setInviteDevLink(res.data.devInviteUrl);
      } else {
        closePanel();
      }
      loadAdmins();
    } catch (err) {
      setInviteError(err.response?.data?.message || t.errorGeneric);
    } finally {
      setInviteLoading(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editForm.fullName.trim()) {
      setEditError(t.errorRequired);
      return;
    }
    try {
      setEditLoading(true);
      setEditError(null);
      await axiosClient.patch(`/ams/admins/${selected.id}`, {
        fullName: editForm.fullName.trim(),
        district: editForm.district.trim() || undefined
      });
      showToast(t.profileUpdateSuccess, 'success');
      closePanel();
      loadAdmins();
    } catch (err) {
      setEditError(err.response?.data?.message || t.errorGeneric);
    } finally {
      setEditLoading(false);
    }
  };

  const runConfirmedAction = async () => {
    if (!selected || !confirmAction) return;
    try {
      setActionLoading(true);
      if (confirmAction === 'suspend') {
        await axiosClient.patch(`/ams/admins/${selected.id}/suspend`);
      } else if (confirmAction === 'reactivate') {
        await axiosClient.patch(`/ams/admins/${selected.id}/reactivate`);
      } else if (confirmAction === 'remove') {
        await axiosClient.delete(`/ams/admins/${selected.id}`);
      } else if (confirmAction === 'cancelInvite') {
        await axiosClient.delete(`/ams/admins/invites/${selected.id}`);
      }
      const successLabel = {
        suspend: t.amsSuspendBtn,
        reactivate: t.amsReactivateBtn,
        remove: t.amsRemoveBtn,
        cancelInvite: t.amsCancelInviteBtn
      }[confirmAction];
      showToast(successLabel, 'success');
      closePanel();
      loadAdmins();
    } catch (err) {
      showToast(err.response?.data?.message || t.errorGeneric, 'info');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResendInvite = async (row) => {
    try {
      const res = await axiosClient.post(`/ams/admins/invites/${row.id}/resend`);
      showToast(t.amsResendSuccess, 'success');
      if (res.data.devInviteUrl) {
        setSelected(row);
        setInviteDevLink(res.data.devInviteUrl);
        setPanel('invite');
        setInviteForm({ fullName: row.fullName, email: row.email, district: row.district || '' });
      }
      loadAdmins();
    } catch (err) {
      showToast(err.response?.data?.message || t.errorGeneric, 'info');
    }
  };

  const pages = Math.max(1, Math.ceil(total / PAGE_LIMIT));
  const from = total === 0 ? 0 : (page - 1) * PAGE_LIMIT + 1;
  const to = Math.min(page * PAGE_LIMIT, total);

  const statusBadge = (status) => {
    const cls = status === 'active' ? 'active' : status === 'suspended' ? 'suspended' : 'pending';
    const label = status === 'active' ? t.amsStatusActive : status === 'suspended' ? t.amsStatusSuspended : t.amsStatusPending;
    return <span className={`ams-status-badge ${cls}`}>{label}</span>;
  };

  return (
    <>
      <div className="ams-page-header">
        <div>
          <h1 className="ams-page-title">{t.amsAdminsTitle}</h1>
          <p className="ams-page-subtitle">{t.amsAdminsSubtitle}</p>
        </div>
        <button type="button" className="ams-submit-btn" style={{ marginTop: 0, width: 'auto', padding: '0 20px' }} onClick={openInvite}>
          <UserPlus size={18} /> {t.amsInviteAdminBtn}
        </button>
      </div>

      <section className="ams-panel-card" style={{ marginTop: 24 }}>
        <div className="ams-toolbar">
          <div className="ams-toolbar-fields">
            <div className="ams-search-field">
              <Search size={16} />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t.amsSearchPlaceholder}
                aria-label={t.amsSearchPlaceholder}
              />
            </div>
            <select className="ams-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">{t.amsFilterAll}</option>
              <option value="active">{t.amsFilterActive}</option>
              <option value="suspended">{t.amsFilterSuspended}</option>
              <option value="pending">{t.amsFilterPending}</option>
            </select>
          </div>
        </div>

        {!loading && admins.length === 0 ? (
          <div className="ams-empty-state">
            <div className="ams-empty-state-icon"><Users size={26} /></div>
            <p className="ams-empty-state-title">{search || statusFilter ? t.amsNoResults : t.amsNoAdmins}</p>
            {!search && !statusFilter && <p className="ams-empty-state-sub">{t.amsNoAdminsSub}</p>}
          </div>
        ) : (
          <div className="ams-table-wrap">
            <table className="ams-table">
              <thead>
                <tr>
                  <th className="ams-th">{t.amsTableColName}</th>
                  <th className="ams-th">{t.amsTableColEmail}</th>
                  <th className="ams-th">{t.amsTableColDistrict}</th>
                  <th className="ams-th">{t.amsTableColEmployeeId}</th>
                  <th className="ams-th">{t.amsTableColStatus}</th>
                  <th className="ams-th"><span className="sr-only">{t.amsTableColActions}</span></th>
                </tr>
              </thead>
              <tbody>
                {admins.map((row) => (
                  <tr className="ams-table-row" key={row.id}>
                    <td className="ams-td">{row.fullName}</td>
                    <td className="ams-td" dir="ltr" style={{ textAlign: 'left' }}>{row.email}</td>
                    <td className="ams-td">{row.district || '—'}</td>
                    <td className="ams-td" dir="ltr" style={{ textAlign: 'left', fontFamily: 'var(--ams-font-mono)', fontSize: 13 }}>{row.employeeId || '—'}</td>
                    <td className="ams-td">{statusBadge(row.status)}</td>
                    <td className="ams-td">
                      <div className="ams-row-actions">
                        {row.recordType === 'invite' ? (
                          <>
                            <button type="button" className="ams-icon-btn" aria-label={t.amsResendInviteBtn} title={t.amsResendInviteBtn} onClick={() => handleResendInvite(row)}>
                              <RefreshCw size={16} />
                            </button>
                            <button type="button" className="ams-icon-btn danger" aria-label={t.amsCancelInviteBtn} title={t.amsCancelInviteBtn} onClick={() => { openRow(row); setConfirmAction('cancelInvite'); }}>
                              <X size={16} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button type="button" className="ams-icon-btn" aria-label={t.amsEditFormTitle} title={t.amsEditFormTitle} onClick={() => openRow(row)}>
                              <Pencil size={16} />
                            </button>
                            {row.status === 'active' ? (
                              <button type="button" className="ams-icon-btn" aria-label={t.amsSuspendBtn} title={t.amsSuspendBtn} onClick={() => { openRow(row); setConfirmAction('suspend'); }}>
                                <Ban size={16} />
                              </button>
                            ) : (
                              <button type="button" className="ams-icon-btn" aria-label={t.amsReactivateBtn} title={t.amsReactivateBtn} onClick={() => { openRow(row); setConfirmAction('reactivate'); }}>
                                <RotateCcw size={16} />
                              </button>
                            )}
                            <button type="button" className="ams-icon-btn danger" aria-label={t.amsRemoveBtn} title={t.amsRemoveBtn} onClick={() => { openRow(row); setConfirmAction('remove'); }}>
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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

      {panel !== 'none' && (
        <>
          <button type="button" className="ams-slideover-backdrop" aria-label={t.back} onClick={closePanel} />
          <div className="ams-slideover">
            <div className="ams-slideover-header">
              <div>
                <h2 className="ams-slideover-title">{panel === 'invite' ? t.amsInviteFormTitle : t.amsEditFormTitle}</h2>
                <p className="ams-slideover-subtitle">{panel === 'invite' ? t.amsInviteFormSubtitle : t.amsEditFormSubtitle}</p>
              </div>
              <button type="button" className="ams-slideover-close" aria-label={t.back} onClick={closePanel}><X size={18} /></button>
            </div>

            {panel === 'invite' && (
              inviteDevLink ? (
                <div>
                  <div className="ams-note" style={{ marginTop: 0 }}>
                    <Mail size={16} />
                    <p>{t.amsInviteFormDevLinkLabel}</p>
                  </div>
                  <p className="ams-dev-link-box" dir="ltr">{inviteDevLink}</p>
                  <button type="button" className="ams-submit-btn" onClick={closePanel}>{t.back}</button>
                </div>
              ) : (
                <form onSubmit={handleInviteSubmit} noValidate>
                  {inviteError && <div className="ams-error-banner" style={{ marginTop: 0, marginBottom: 16 }}>{inviteError}</div>}
                  <label className="ams-field-wrap" style={{ marginBottom: 16, display: 'block' }}>
                    <span className="ams-field-label">{t.amsInviteFormNameLabel}</span>
                    <div className="ams-field">
                      <input className="ams-input" value={inviteForm.fullName} onChange={(e) => setInviteForm((p) => ({ ...p, fullName: e.target.value }))} placeholder={t.amsInviteFormNamePlaceholder} />
                    </div>
                  </label>
                  <label className="ams-field-wrap" style={{ marginBottom: 16, display: 'block' }}>
                    <span className="ams-field-label">{t.amsInviteFormEmailLabel}</span>
                    <div className="ams-field">
                      <input dir="ltr" type="email" className="ams-input" value={inviteForm.email} onChange={(e) => setInviteForm((p) => ({ ...p, email: e.target.value }))} placeholder={t.amsInviteFormEmailPlaceholder} />
                    </div>
                  </label>
                  <label className="ams-field-wrap" style={{ display: 'block' }}>
                    <span className="ams-field-label">{t.amsInviteFormDistrictLabel}</span>
                    <div className="ams-field">
                      <input className="ams-input" value={inviteForm.district} onChange={(e) => setInviteForm((p) => ({ ...p, district: e.target.value }))} />
                    </div>
                  </label>
                  <div className="ams-slideover-footer">
                    <button type="button" className="ams-ghost-btn" onClick={closePanel}>{t.cancel}</button>
                    <button type="submit" className="ams-submit-btn" disabled={inviteLoading}>{inviteLoading ? t.saving : t.amsInviteFormSubmitBtn}</button>
                  </div>
                </form>
              )
            )}

            {panel === 'row' && selected && !confirmAction && selected.recordType === 'admin' && (
              <form onSubmit={handleEditSubmit} noValidate>
                {editError && <div className="ams-error-banner" style={{ marginTop: 0, marginBottom: 16 }}>{editError}</div>}
                <label className="ams-field-wrap" style={{ marginBottom: 16, display: 'block' }}>
                  <span className="ams-field-label">{t.amsEditNameLabel}</span>
                  <div className="ams-field">
                    <input className="ams-input" value={editForm.fullName} onChange={(e) => setEditForm((p) => ({ ...p, fullName: e.target.value }))} />
                  </div>
                </label>
                <label className="ams-field-wrap" style={{ marginBottom: 16, display: 'block' }}>
                  <span className="ams-field-label">{t.amsEditDistrictLabel}</span>
                  <div className="ams-field">
                    <input className="ams-input" value={editForm.district} onChange={(e) => setEditForm((p) => ({ ...p, district: e.target.value }))} />
                  </div>
                </label>
                <div className="ams-slideover-footer">
                  <button type="button" className="ams-ghost-btn" onClick={closePanel}>{t.cancel}</button>
                  <button type="submit" className="ams-submit-btn" disabled={editLoading}>{editLoading ? t.saving : t.saveChanges}</button>
                </div>

                <div className="ams-row-actions" style={{ justifyContent: 'flex-start', marginTop: 24, gap: 10 }}>
                  {selected.status === 'active' ? (
                    <button type="button" className="ams-ghost-btn" style={{ marginTop: 0, width: 'auto', padding: '0 16px', height: 40 }} onClick={() => setConfirmAction('suspend')}>
                      <Ban size={16} /> {t.amsSuspendBtn}
                    </button>
                  ) : (
                    <button type="button" className="ams-ghost-btn" style={{ marginTop: 0, width: 'auto', padding: '0 16px', height: 40 }} onClick={() => setConfirmAction('reactivate')}>
                      <RotateCcw size={16} /> {t.amsReactivateBtn}
                    </button>
                  )}
                  <button type="button" className="ams-ghost-btn" style={{ marginTop: 0, width: 'auto', padding: '0 16px', height: 40, borderColor: '#a13a1f', color: '#a13a1f' }} onClick={() => setConfirmAction('remove')}>
                    <Trash2 size={16} /> {t.amsRemoveBtn}
                  </button>
                </div>
              </form>
            )}

            {confirmAction && (
              <div className="ams-confirm-banner">
                <p className="ams-confirm-banner-title">
                  {confirmAction === 'suspend' && t.amsConfirmSuspendTitle}
                  {confirmAction === 'reactivate' && t.amsConfirmReactivateTitle}
                  {confirmAction === 'remove' && t.amsConfirmRemoveTitle}
                  {confirmAction === 'cancelInvite' && t.amsConfirmCancelInviteTitle}
                </p>
                <p className="ams-confirm-banner-body">
                  {confirmAction === 'suspend' && t.amsConfirmSuspendBody}
                  {confirmAction === 'reactivate' && t.amsConfirmReactivateBody}
                  {confirmAction === 'remove' && t.amsConfirmRemoveBody}
                  {confirmAction === 'cancelInvite' && t.amsConfirmCancelInviteBody}
                </p>
                <div className="ams-confirm-banner-actions">
                  <button type="button" className="ams-ghost-btn" onClick={() => setConfirmAction(null)}>{t.cancel}</button>
                  <button
                    type="button"
                    className={`ams-submit-btn ${confirmAction === 'remove' || confirmAction === 'cancelInvite' ? 'ams-danger-btn' : ''}`}
                    disabled={actionLoading}
                    onClick={runConfirmedAction}
                  >
                    {actionLoading ? t.saving : t.amsConfirmYes}
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
};

export default ManageAdmins;
