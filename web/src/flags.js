// Team → flag emoji. Cosmetic only — the backend is the source of truth for teams.
const FLAGS = {
  'México': '🇲🇽',
  'Alemania': '🇩🇪',
  'Escocia': '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  'Uruguay': '🇺🇾',
  'Argentina': '🇦🇷',
  'Francia': '🇫🇷',
  'Japón': '🇯🇵',
  'Marruecos': '🇲🇦',
};

export const teamFlag = (name) => FLAGS[name] || '🏳️';
