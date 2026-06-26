import { MoreVertical, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';

const sampleFarmers = [
  { initials: 'AM', name: 'Ahmed Malik', location: 'Sector Alpha, Punjab Hub', sensors: 12, lastActivity: '2 hrs ago', status: 'Active' },
  { initials: 'FA', name: 'Fatima Ali', location: 'Sector Delta, Sindh Belt', sensors: 8, lastActivity: '5 hrs ago', status: 'Active' },
  { initials: 'TK', name: 'Tariq Khan', location: 'Sector Beta, KPK Highlands', sensors: 4, lastActivity: '3 days ago', status: 'Inactive' },
  { initials: 'ZB', name: 'Zainab Bibi', location: 'Sector Gamma, Balochistan Plains', sensors: 15, lastActivity: '10 mins ago', status: 'Active' }
];

const diseaseStats = [
  { sector: 'Sector Alpha', wheatRust: 30, blight: 55, powderyMildew: 20 },
  { sector: 'Sector Beta', wheatRust: 65, blight: 25, powderyMildew: 40 },
  { sector: 'Sector Gamma', wheatRust: 20, blight: 70, powderyMildew: 35 },
  { sector: 'Sector Delta', wheatRust: 45, blight: 30, powderyMildew: 60 }
];

const ManageFarmers = () => {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const comingSoon = () => showToast(t.comingSoonToast);

  return (
    <>
      <div className="dashboard-page-header">
        <h1>{t.adminDashTitle}</h1>
        <p>{t.adminDashSubtitle}</p>
      </div>

      <section className="dashboard-card">
        <div className="dashboard-card-header">
          <h2>{t.registeredFarmers}</h2>
          <button className="primary-pill-btn" type="button" onClick={comingSoon}>{t.addFarmer}</button>
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
              {sampleFarmers.map((farmer) => (
                <tr key={farmer.name}>
                  <td>
                    <div className="farmer-name-cell">
                      <span className="farmer-avatar">{farmer.initials}</span>
                      <span>{farmer.name}</span>
                    </div>
                  </td>
                  <td>{farmer.location}</td>
                  <td className="num">{farmer.sensors}</td>
                  <td>{farmer.lastActivity}</td>
                  <td>
                    <span className={`status-badge ${farmer.status === 'Active' ? 'active' : 'inactive'}`}>
                      {farmer.status}
                    </span>
                  </td>
                  <td className="num">
                    <button className="icon-only-btn" aria-label="More actions" onClick={comingSoon}><MoreVertical size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="table-pagination">
          <span>Showing 1-4 of 128 Farmers</span>
          <div className="pagination-controls">
            <button className="icon-only-btn" aria-label="Previous page" onClick={comingSoon}><ChevronLeft size={16} /></button>
            <button className="icon-only-btn" aria-label="Next page" onClick={comingSoon}><ChevronRight size={16} /></button>
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
