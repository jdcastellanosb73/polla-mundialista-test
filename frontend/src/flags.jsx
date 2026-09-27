// Team → bundled SVG flag. Local assets (no runtime CDN dependency) because
// emoji flags render as plain letter codes on Windows/Chrome.
import { FlagFallbackIcon } from './icons.jsx';
import ar from './assets/flags/ar.svg';
import de from './assets/flags/de.svg';
import fr from './assets/flags/fr.svg';
import jp from './assets/flags/jp.svg';
import ma from './assets/flags/ma.svg';
import mx from './assets/flags/mx.svg';
import sct from './assets/flags/gb-sct.svg';
import uy from './assets/flags/uy.svg';

const FLAGS = {
  'México': mx,
  'Alemania': de,
  'Escocia': sct,
  'Uruguay': uy,
  'Argentina': ar,
  'Francia': fr,
  'Japón': jp,
  'Marruecos': ma,
};

export function Flag({ name }) {
  const src = FLAGS[name];
  if (!src) return <span className="flag flag-fallback" aria-hidden="true"><FlagFallbackIcon size={14} /></span>;
  return <img className="flag-img" src={src} alt="" aria-hidden="true" loading="lazy" />;
}
