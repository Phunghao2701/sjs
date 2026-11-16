import { useState, type FormEvent } from 'react'
import { updateProfile } from 'firebase/auth'
import { AdjustmentsHorizontalIcon, CheckCircleIcon, ShieldCheckIcon, UserIcon } from '@heroicons/react/24/outline'
import { Alert, Box, Button, MenuItem, Paper, Select, TextField, Typography } from '@mui/material'
import { auth } from '../services/firebase'

type AppearancePreference = 'System' | 'Light' | 'Dark'
type LanguagePreference = 'English' | 'Tiếng Việt'
type ProfilePreferences = { appearance: AppearancePreference; language: LanguagePreference }

const defaultPreferences: ProfilePreferences = { appearance: 'System', language: 'English' }

function readPreferences(userId: string): ProfilePreferences {
  if (!userId) return defaultPreferences
  try {
    const value = window.localStorage.getItem(`sjs-profile-preferences:${userId}`)
    if (!value) return defaultPreferences
    const parsed = JSON.parse(value) as Partial<ProfilePreferences>
    return {
      appearance: ['System', 'Light', 'Dark'].includes(parsed.appearance ?? '') ? parsed.appearance as AppearancePreference : 'System',
      language: ['English', 'Tiếng Việt'].includes(parsed.language ?? '') ? parsed.language as LanguagePreference : 'English',
    }
  } catch {
    return defaultPreferences
  }
}

export function ProfilePage({
  displayName,
  email,
  emailVerified,
  userId,
}: {
  displayName: string
  email: string
  emailVerified: boolean
  userId: string
}) {
  const initialName = displayName.trim() || 'Researcher'
  const [name, setName] = useState(initialName)
  const [savedName, setSavedName] = useState(initialName)
  const [savingName, setSavingName] = useState(false)
  const [nameMessage, setNameMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [emailMessage, setEmailMessage] = useState('')
  const [passwordMessage, setPasswordMessage] = useState('')
  const [preferences, setPreferences] = useState(() => readPreferences(userId))
  const [preferencesMessage, setPreferencesMessage] = useState('')

  const handleNameSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextName = name.trim()
    if (!nextName) {
      setNameMessage({ type: 'error', text: 'Display name cannot be empty.' })
      return
    }
    if (nextName === savedName || savingName) return

    const user = auth.currentUser
    if (!user) {
      setNameMessage({ type: 'error', text: 'Sign in again before updating your profile.' })
      return
    }

    setSavingName(true)
    setNameMessage(null)
    try {
      await updateProfile(user, { displayName: nextName })
      setName(nextName)
      setSavedName(nextName)
      setNameMessage({ type: 'success', text: 'Display name updated.' })
    } catch (error) {
      setNameMessage({ type: 'error', text: error instanceof Error ? error.message : 'Could not update your display name.' })
    } finally {
      setSavingName(false)
    }
  }

  const savePreferences = (next: ProfilePreferences) => {
    setPreferences(next)
    setPreferencesMessage('')
    try {
      if (userId) window.localStorage.setItem(`sjs-profile-preferences:${userId}`, JSON.stringify(next))
      setPreferencesMessage('Preference saved.')
    } catch {
      setPreferencesMessage('Could not save this preference in this browser.')
    }
  }

  return <Box className="profile-page">
    <Box className="profile-page-intro">
      <Typography component="h1">My Profile</Typography>
      <Typography>{email || 'No email address available'}</Typography>
    </Box>

    <Box component="section" className="profile-section" aria-labelledby="profile-personal-heading">
      <Box className="profile-section-heading">
        <UserIcon aria-hidden="true" />
        <Typography component="h2" id="profile-personal-heading">Personal Information</Typography>
      </Box>
      <Paper variant="outlined" className="profile-card profile-personal-card">
        <Box className="profile-identity">
          <Box className="profile-identity-icon"><UserIcon aria-hidden="true" /></Box>
          <Box className="profile-identity-copy">
            <Typography>{savedName}</Typography>
            <span>Research account</span>
          </Box>
        </Box>
        <Box className="profile-card-divider" />
        <Box component="form" className="profile-fields" onSubmit={(event) => { void handleNameSave(event) }}>
          <Box className="profile-field-row">
            <Typography component="label" htmlFor="profile-display-name">Display name</Typography>
            <Box className="profile-field-control">
              <TextField
                id="profile-display-name"
                value={name}
                onChange={(event) => {
                  setName(event.target.value)
                  setNameMessage(null)
                }}
                slotProps={{ htmlInput: { maxLength: 100, 'aria-label': 'Display name' } }}
                size="small"
              />
              <Button type="submit" variant="outlined" disabled={savingName || name.trim() === savedName}>
                {savingName ? 'Saving…' : 'Update'}
              </Button>
            </Box>
          </Box>
          <Box className="profile-field-row">
            <Typography component="span">Email address</Typography>
            <Box className="profile-field-control profile-email-control">
              <Box className="profile-email-value">
                <span>{email || 'No email address available'}</span>
                <Box className={`profile-verified-badge${emailVerified ? '' : ' is-unverified'}`}>
                  {emailVerified && <CheckCircleIcon aria-hidden="true" />}
                  {emailVerified ? 'Verified' : 'Not verified'}
                </Box>
              </Box>
              <Button variant="outlined" onClick={() => setEmailMessage('Email is managed by your HyperDataLab SSO account. Contact your administrator to change it.')}>Change</Button>
            </Box>
          </Box>
          {nameMessage && <Alert className="profile-inline-alert" severity={nameMessage.type}>{nameMessage.text}</Alert>}
          {emailMessage && <Alert className="profile-inline-alert" severity="info" onClose={() => setEmailMessage('')}>{emailMessage}</Alert>}
        </Box>
      </Paper>
    </Box>

    <Box component="section" className="profile-section" aria-labelledby="profile-security-heading">
      <Box className="profile-section-heading">
        <ShieldCheckIcon aria-hidden="true" />
        <Typography component="h2" id="profile-security-heading">Security</Typography>
      </Box>
      <Paper variant="outlined" className="profile-card profile-security-card">
        <Box className="profile-setting-copy">
          <Typography>Password</Typography>
          <span>Manage your account password</span>
        </Box>
        <Button variant="outlined" onClick={() => setPasswordMessage('Password is managed by your HyperDataLab SSO account. Use your organization’s sign-in support to change it.')}>Change</Button>
      </Paper>
      {passwordMessage && <Alert className="profile-inline-alert" severity="info" onClose={() => setPasswordMessage('')}>{passwordMessage}</Alert>}
    </Box>

    <Box component="section" className="profile-section" aria-labelledby="profile-preferences-heading">
      <Box className="profile-section-heading">
        <AdjustmentsHorizontalIcon aria-hidden="true" />
        <Typography component="h2" id="profile-preferences-heading">Preferences</Typography>
      </Box>
      <Paper variant="outlined" className="profile-card profile-preferences-card">
        <Box className="profile-setting-row">
          <Typography component="label" htmlFor="profile-language">Language</Typography>
          <Select
            id="profile-language"
            value={preferences.language}
            onChange={(event) => savePreferences({ ...preferences, language: event.target.value as LanguagePreference })}
            size="small"
            aria-label="Language preference"
          >
            <MenuItem value="English">English</MenuItem>
            <MenuItem value="Tiếng Việt">Tiếng Việt</MenuItem>
          </Select>
        </Box>
        <Box className="profile-setting-row">
          <Typography component="label" htmlFor="profile-appearance">Appearance</Typography>
          <Select
            id="profile-appearance"
            value={preferences.appearance}
            onChange={(event) => savePreferences({ ...preferences, appearance: event.target.value as AppearancePreference })}
            size="small"
            aria-label="Appearance preference"
          >
            <MenuItem value="System">System</MenuItem>
            <MenuItem value="Light">Light</MenuItem>
            <MenuItem value="Dark">Dark</MenuItem>
          </Select>
        </Box>
        {preferencesMessage && <Typography className="profile-preference-message" role="status">{preferencesMessage}</Typography>}
      </Paper>
    </Box>
  </Box>
}
