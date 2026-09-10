export interface ColorOption {
  id: string;
  name: string;
  hex: string;
  bgLight: string;
}

// 4 Ana Renk (Mavi, Kırmızı, Yeşil, Turuncu)
export const STRUCTURED_COLORS: ColorOption[] = [
  { id: 'blue', name: 'Mavi', hex: '#0A84FF', bgLight: 'rgba(10, 132, 255, 0.18)' },
  { id: 'red', name: 'Kırmızı', hex: '#FF453A', bgLight: 'rgba(255, 69, 58, 0.18)' },
  { id: 'green', name: 'Yeşil', hex: '#30D158', bgLight: 'rgba(48, 209, 88, 0.18)' },
  { id: 'orange', name: 'Turuncu', hex: '#FF9F0A', bgLight: 'rgba(255, 159, 10, 0.18)' },
];
