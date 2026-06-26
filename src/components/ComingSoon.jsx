import { Construction } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const ComingSoon = ({ title }) => {
  const { t } = useLanguage();

  return (
    <div className="coming-soon-card">
      <div className="coming-soon-icon">
        <Construction size={28} />
      </div>
      <h2>{title || t.comingSoonTitle}</h2>
      <p>{t.comingSoonDesc}</p>
    </div>
  );
};

export default ComingSoon;
