import { createTheme } from '@mui/material'

export const researchPulseTheme = createTheme({
  palette: {
    mode: 'light',
    // Keep these values aligned with src/design-system/tokens.css. MUI color utilities need concrete colors.
    primary: { main: '#0879c9', dark: '#0669af', light: '#eaf5fc' },
    background: { default: '#fbfbfb', paper: '#ffffff' },
    text: { primary: '#171a1e', secondary: '#626972' },
    divider: '#e2e5e9',
  },
  typography: {
    fontFamily: "Inter, 'Segoe UI', Arial, sans-serif",
    button: { fontSize: 14, fontWeight: 500, textTransform: 'none' },
  },
  shape: { borderRadius: 7 },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: { root: { minHeight: 36, borderRadius: 7 } },
    },
    MuiPaper: { styleOverrides: { rounded: { borderRadius: 9 } } },
  },
})
