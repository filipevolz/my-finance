import 'styled-components';

declare module 'styled-components' {
  export interface DefaultTheme {
    background: string;
    surface: string;
    surfaceSecondary: string;
    text: string;
    textSecondary: string;
    textTertiary: string;
    border: string;
    borderHover: string;
    primary: string;
    primaryHover: string;
    success: string;
    error: string;
    shadow: string;
    shadowHover: string;
  }
}


