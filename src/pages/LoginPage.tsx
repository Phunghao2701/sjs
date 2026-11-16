import { Box, Button, CircularProgress, Paper, Typography } from '@mui/material'

export type SsoLoginStatus = 'checking' | 'idle' | 'starting' | 'processing' | 'success' | 'error'

type LoginPageProps = {
  status: SsoLoginStatus
  error: string
  setupMessage: string
  canSignIn: boolean
  onSignIn: () => void
}

export function LoginPage({ status, error, setupMessage, canSignIn, onSignIn }: LoginPageProps) {
  const busy = status === 'checking' || status === 'starting' || status === 'processing' || status === 'success'
  const buttonText = status === 'checking'
    ? 'Checking session…'
    : status === 'starting'
      ? 'Opening HyperDataLab…'
      : status === 'processing'
        ? 'Completing sign-in…'
        : status === 'success'
          ? 'Opening your workspace…'
          : 'Sign in with HyperDataLab'

  return (
    <Box component="main" aria-busy={busy} sx={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', p: { xs: 2, sm: 3 }, bgcolor: 'var(--app-bg)' }}>
      <Paper variant="outlined" sx={{ width: '100%', maxWidth: 432, p: { xs: 3, sm: 4 }, borderColor: 'var(--stroke)', borderRadius: 'var(--radius-card)', bgcolor: 'var(--surface)', boxShadow: 'none' }}>
        <Box component="img" src="/Cyan_folded-ribbon_T_favicon.png" alt="" aria-hidden="true" sx={{ width: 40, height: 40, display: 'block', objectFit: 'contain', mb: 3 }} />
        <Typography component="h1" sx={{ color: 'var(--ink)', fontSize: 23, fontWeight: 600, lineHeight: 1.25 }}>
          Sign in to SJS
        </Typography>
        <Typography component="p" sx={{ mt: 1, mb: 3, color: 'var(--muted)', fontSize: 13, lineHeight: 1.6 }}>
          Continue with your HyperDataLab account to access your research workspace.
        </Typography>

        {error && <Typography component="p" role="alert" sx={{ mb: 2, color: 'var(--color-error)', fontSize: 13, lineHeight: 1.5 }}>{error}</Typography>}
        {!error && setupMessage && <Typography component="p" role="status" sx={{ mb: 2, color: 'var(--muted)', fontSize: 12, lineHeight: 1.5 }}>{setupMessage}</Typography>}

        <Button
          type="button"
          className="sso-login-button"
          variant="contained"
          disableElevation
          disableRipple
          fullWidth
          disabled={!canSignIn || busy}
          onClick={onSignIn}
          startIcon={busy ? <CircularProgress size={16} color="inherit" /> : undefined}
          sx={{ minHeight: 42, bgcolor: 'var(--brand)', fontSize: 14, fontWeight: 500, textTransform: 'none', '&:hover': { bgcolor: 'var(--brand)' }, '&.Mui-disabled': { bgcolor: 'var(--hover)', color: 'var(--soft-muted)' } }}
        >
          {buttonText}
        </Button>

        <Typography component="p" sx={{ mt: 2, mb: 0, color: 'var(--soft-muted)', fontSize: 11, lineHeight: 1.5 }}>
          Sign-in is available to active, approved HyperDataLab accounts.
        </Typography>
      </Paper>
    </Box>
  )
}
