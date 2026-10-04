import { useCallback, useEffect, useState } from 'react';
import { Ban, RotateCcw, Trash2, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import axiosClient from '../../api/axiosClient';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';

const initials = (name) =>
  (name || '').trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() || '').join('');

const diseaseStats = [
  { sector: 'Sector Alpha', wheatRust: 30, blight: 55, powderyMildew: 20 },
  { sector: 'Sector Beta', wheatRust: 65, blight: 25, powderyMildew: 40 },
  { sector: 'Sector Gamma', wheatRust: 20, blight: 70, powderyMildew: 35 },
  { sector: 'Sector Delta', wheatRust: 45, blight: 30, powderyMildew: 60 }
];

const PAGE_SIZE = 10;

const ManageFarmers = () => {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const comingSoon = () => showToast(t.comingSoonToast);

  const [farmers, setFarmers] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const fetchFarmers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axiosClient.get('/admin/farmers', { params: { page, limit: PAGE_SIZE } });
      setFarmers(res.data.farmers);
      setTotal(res.data.total);
      setHasMore(res.data.hasMore);
    } catch {
      showToast(t.errorGeneric, 'error');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  useEffect(() => {
    fetchFarmers();
  }, [fetchFarmers]);

  const handleSuspend = async (farmer) => {
    if (!window.confirm(t.confirmSuspendFarmer)) return;
    try {
      setActionLoadingId(farmer.id);
      await axiosClient.patch(`/admin/farmers/${farmer.id}/suspend`);
      showToast(t.farmerSuspended, 'success');
      fetchFarmers();
    } catch (err) {
      showToast(err.response?.data?.message || t.errorGeneric, 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReactivate = async (farmer) => {
    if (!window.confirm(t.confirmReactivateFarmer)) return;
    try {
      setActionLoadingId(farmer.id);
      await axiosClient.patch(`/admin/farmers/${farmer.id}/reactivate`);
      showToast(t.farmerReactivated, 'success');
      fetchFarmers();
    } catch (err) {
      showToast(err.response?.data?.message || t.errorGeneric, 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRemove = async (farmer) => {
    if (!window.confirm(t.confirmRemoveFarmer)) return;
    try {
      setActionLoadingId(farmer.id);
      await axiosClient.delete(`/admin/farmers/${farmer.id}`);
      showToast(t.farmerRemoved, 'success');
      fetchFarmers();
    } catch (err) {
      showToast(err.response?.data?.message || t.errorGeneric, 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const rangeStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, total);

  return (
    <>
      <div className="dashboard-page-header">
        <h1>{t.adminDashTitle}</h1>
        <p>{t.adminDashSubtitle}</p>
      </div>

      <section className="dashboard-card">
        <div className="dashboard-card-header">
          <h2>{t.registeredFarmers}</h2>
        </div>

        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t.colFarmerName}</th>
                <th>{t.colLocation}</th>
                <th className="num">{t.colSensors}</th>
                <th>{t.colLastActivity}</th>
                <th>{t.colStatus}</th>
                <th className="num">{t.colActions}</th>
              </tr>
            </thead>
            <tbody>
              {!loading && farmers.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center' }}>{t.noFarmersYet}</td></tr>
              )}
              {farmers.map((farmer) => (
                <tr key={farmer.id}>
                  <td>
                    <div className="farmer-name-cell">
                      <span className="farmer-avatar">{initials(farmer.fullName)}</span>
                      <span>{farmer.fullName}</span>
                    </div>
                  </td>
                  <td>{farmer.location}</td>
                  <td className="num">{farmer.sensors}</td>
                  <td>{farmer.lastActivity || '—'}</td>
                  <td>
                    <span className={`status-badge ${farmer.status === 'Active' ? 'active' : 'inactive'}`}>
                      {farmer.status}
                    </span>
                  </td>
                  <td className="num">
                    {farmer.status === 'Active' ? (
                      <button
                        className="icon-only-btn" aria-label="Suspend" title="Suspend"
                        disabled={actionLoadingId === farmer.id}
                        onClick={() => handleSuspend(farmer)}
                      ><Ban size={16} /></button>
                    ) : (
                      <button
                        className="icon-only-btn" aria-label="Reactivate" title="Reactivate"
                        disabled={actionLoadingId === farmer.id}
                        onClick={() => handleReactivate(farmer)}
                      ><RotateCcw size={16} /></button>
                    )}
                    <button
                      className="icon-only-btn" aria-label="Remove" title="Remove"
                      disabled={actionLoadingId === farmer.id}
                      onClick={() => handleRemove(farmer)}
                    ><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="table-pagination">
          <span>{t.showingFarmersRange.replace('{start}', rangeStart).replace('{end}', rangeEnd).replace('{total}', total)}</span>
          <div className="pagination-controls">
            <button className="icon-only-btn" aria-label="Previous page" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}><ChevronLeft size={16} /></button>
            <button className="icon-only-btn" aria-label="Next page" disabled={!hasMore} onClick={() => setPage((p) => p + 1)}><ChevronRight size={16} /></button>
          </div>
        </div>
      </section>

      <section className="dashboard-card">
        <div className="dashboard-card-header">
          <div>
            <h2>{t.regionalDiseaseStats}</h2>
            <p className="dashboard-card-subtext">{t.regionalDiseaseStatsDesc}</p>
          </div>
          <button className="outline-pill-btn" type="button" onClick={comingSoon}><Filter size={14} /> {t.filter}</button>
        </div>

        <div className="bar-chart">
          {diseaseStats.map((row) => (
            <div className="bar-chart-group" key={row.sector}>
              <div className="bar-chart-bars">
                <div className="bar-chart-bar wheat-rust" style={{ height: `${row.wheatRust}%` }} />
                <div className="bar-chart-bar blight" style={{ height: `${row.blight}%` }} />
                <div className="bar-chart-bar powdery-mildew" style={{ height: `${row.powderyMildew}%` }} />
              </div>
              <span className="bar-chart-label">{row.sector}</span>
            </div>
          ))}
        </div>

        <div className="chart-legend">
          <span><i className="legend-dot wheat-rust" /> Wheat Rust</span>
          <span><i className="legend-dot blight" /> Blight</span>
          <span><i className="legend-dot powdery-mildew" /> Powdery Mildew</span>
        </div>
      </section>
    </>
  );
};

export default ManageFarmers;
