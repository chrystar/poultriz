export const lightTheme = {
  background: '#FFFFFF',
  screenBackground: '#F5F9EF',
  cardBackground: '#F2F2F2',
  cardBackgroundAlt: '#E8E8E8',
  text: '#111111',
  textMuted: '#666666',
  textFaint: '#999999',
  accent: '#B9E37D',
  accentDark: '#4CAF50',
  border: '#DDDDDD',
  danger: '#E53935',
};

export const darkTheme = {
  background: '#121212',
  screenBackground: '#0D0D0D',
  cardBackground: '#1E1E1E',
  cardBackgroundAlt: '#242424',
  text: '#FFFFFF',
  textMuted: '#AAAAAA',
  textFaint: '#777777',
  accent: '#B9E37D',
  accentDark: '#8BC34A',
  border: '#333333',
  danger: '#EF5350',
};

export type Theme = typeof lightTheme;