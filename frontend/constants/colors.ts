// Rich, vibrant color palette inspired by Zomato/Swiggy/Zepto
export const COLORS = {
  // Primary colors - vibrant and energetic
  primary: '#FF6B35',        // Bright Orange (Swiggy-inspired)
  primaryLight: '#FFE5DC',   // Light orange tint
  primaryDark: '#E55A2B',    // Darker orange
  
  // Secondary colors
  secondary: '#7B2CBF',      // Deep Purple (Zepto-inspired)
  secondaryLight: '#E8D5F8', // Light purple tint
  
  // Accent colors
  accent1: '#06D6A0',        // Fresh Green/Teal
  accent1Light: '#D4F7EE',   // Light teal tint
  accent2: '#EF476F',        // Coral Pink
  accent2Light: '#FFDCE5',   // Light pink tint
  accent3: '#FFD166',        // Warm Yellow
  accent3Light: '#FFF4D9',   // Light yellow tint
  accent4: '#118AB2',        // Ocean Blue
  accent4Light: '#D6EEF6',   // Light blue tint
  
  // Gradients
  gradient1: ['#FF6B35', '#EF476F'],     // Orange to Pink
  gradient2: ['#7B2CBF', '#FF6B35'],     // Purple to Orange
  gradient3: ['#06D6A0', '#118AB2'],     // Teal to Blue
  gradient4: ['#FFD166', '#FF6B35'],     // Yellow to Orange
  gradient5: ['#E8D5F8', '#FFE5DC'],     // Light purple to light orange
  
  // Neutrals
  bg: '#F7F9FC',             // Light background
  surface: '#FFFFFF',        // Card surface
  text: '#1E2022',           // Dark text
  textSec: '#707A8A',        // Secondary text
  border: '#E8ECEF',         // Border color
  
  // Semantic colors
  success: '#06D6A0',
  error: '#EF476F',
  warning: '#FFD166',
  info: '#118AB2',
  
  // Special
  white: '#FFFFFF',
  black: '#1E2022',
  overlay: 'rgba(0, 0, 0, 0.3)',
};

// Helper to create linear gradient string
export const createGradient = (colors: string[]) => {
  return colors;
};
