import { useState } from 'react';
import { Thermometer, Droplets, Waves, UploadCloud, TriangleAlert } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';

const activityLogs = [
  { dateTime: '2026-06-26 09:14', event: 'Sensor Reading', location: 'Sector 4, Region A', severity: 'Normal' },
  { dateTime: '2026-06-26 06:02', event: 'Risk Threshold Breached', location: 'Sector 4, Region A', severity: 'High' },
  { dateTime: '2026-06-25 18:47', event: 'Sensor Reading', location: 'Sector 4, Region A', severity: 'Normal' }
];

const Overview = () => {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const [fileName, setFileName] = useState(null);
  const comingSoon = () => showToast(t.comingSoonToast);

  return (
    <>
      <div className="dashboard-page-header">
        <h1>{t.farmerDashTitle}</h1>
      </div>

      <section className="dashboard-card">
        <div className="dashboard-card-header">
          <div>
            <h2>{t.iotFieldMonitoring}</h2>
            <p className="dashboard-card-subtext">{t.iotFieldMonitoringDesc}</p>
          </div>
        </div>

        <div className="iot-stat-grid">
          <div className="iot-stat-card">
            <div className="iot-stat-icon temp"><Thermometer size={20} /></div>
            <p className="iot-stat-label">{t.ambientTemp}</p>
            <p className="iot-stat-value">26°C</p>
          </div>
          <div className="iot-stat-card">
            <div className="iot-stat-icon humidity"><Droplets size={20} /></div>
            <p className="iot-stat-label">{t.relativeHumidity}</p>
            <p className="iot-stat-value">75% <span className="risk-badge high">HIGH</span></p>
          </div>
          <div className="iot-stat-card">
            <div className="iot-stat-icon soil"><Waves size={20} /></div>
            <p className="iot-stat-label">{t.soilMoisture}</p>
            <p className="iot-stat-value">45%</p>
          </div>
        </div>
      </section>

      <div className="dashboard-two-col">
        <section className="dashboard-card">
          <div className="dashboard-card-header">
            <h2>{t.earlyRiskAlerts}</h2>
          </div>
          <div className="alert-card">
            <div className="alert-card-icon"><TriangleAlert size={18} /></div>
            <div>
              <p className="alert-card-title">Stage 1 Alert: High Humidity Detected</p>
              <p className="alert-card-desc">
                Wheat Rust risk is currently HIGH in Sector 4 based on sustained humidity over 70% for 48 hours.
                Preventive fungicidal action is recommended within 24 hours.
              </p>
              <div className="alert-card-actions">
                <button className="primary-pill-btn small" type="button" onClick={comingSoon}>View Treatment Protocol</button>
                <button className="ghost-pill-btn small" type="button" onClick={comingSoon}>Dismiss Alert</button>
              </div>
            </div>
          </div>
        </section>

        <section className="dashboard-card">
          <div className="dashboard-card-header">
            <div>
              <h2>{t.stage2CnnDiagnosis}</h2>
              <p className="dashboard-card-subtext">{t.cnnDiagnosisDesc}</p>
            </div>
          </div>
          <label className="upload-dropzone" htmlFor="leaf-image-input">
            <UploadCloud size={26} />
            <span>{fileName || 'Drag & drop leaf image here'}</span>
            <input
              id="leaf-image-input"
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => setFileName(e.target.files?.[0]?.name || null)}
            />
          </label>
          <button className="primary-pill-btn full" type="button" onClick={comingSoon}>{t.uploadScanImage}</button>
        </section>
      </div>

      <section className="dashboard-card">
        <div className="dashboard-card-header">
          <h2>{t.recentActivityLogs}</h2>
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date &amp; Time</th>
                <th>Event Type</th>
                <th>Location</th>
                <th>Severity</th>
              </tr>
            </thead>
            <tbody>
              {activityLogs.map((log) => (
                <tr key={log.dateTime}>
                  <td>{log.dateTime}</td>
                  <td>{log.event}</td>
                  <td>{log.location}</td>
                  <td>
                    <span className={`status-badge ${log.severity === 'High' ? 'inactive' : 'active'}`}>
                      {log.severity}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
};

export default Overview;
