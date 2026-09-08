'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { IconDice } from '@/components/ui/StateIcons'
import { sounds } from '@/lib/sounds'
import { checkNameAvailable } from '@/lib/api'

const INK        = 'var(--mdd-ink)'
const MUTED      = 'var(--mdd-muted)'
const BLUE = '#0071E3'
const RED = '#FF3B30'

export interface EditableProfile {
  displayName: string
  bio: string
  avatarSeed: string
}

interface Props {
  open: boolean
  initial: EditableProfile
  defaultSeed: string
  /** Wallet address whose name is being edited - used for the live uniqueness check. */
  player: string | null | undefined
  onClose: () => void
  /** May reject (e.g. name taken in a last-moment race) - the modal stays open and shows the error inline. */
  onSave: (next: EditableProfile) => void | Promise<void>
}

// Matches the server-side limit in backend/src/lib/profile-store.ts, so a name
// accepted here is never rejected on save.
const NAME_MAX = 20
const BIO_MAX = 140

export function EditProfileModal({ open, initial, defaultSeed, player, onClose, onSave }: Props) {
  const [displayName, setDisplayName] = useState(initial.displayName)
  const [bio, setBio] = useState(initial.bio)
  const [avatarSeed, setAvatarSeed] = useState(initial.avatarSeed)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  // Live "is this name taken" check as the player types, debounced so it does
  // not fire on every keystroke. null = unknown/not yet checked or checking.
  const [nameStatus, setNameStatus] = useState<'checking' | 'available' | 'taken' | null>(null)

  useEffect(() => {
    if (open) {
      setDisplayName(initial.displayName)
      setBio(initial.bio)
      setAvatarSeed(initial.avatarSeed)
      setError('')
      setNameStatus(null)
    }
  }, [open, initial])

  // Debounced live availability check. Skips the check entirely when the name
  // is unchanged from what's already saved (renaming to your own current name
  // is always fine) or too short to be valid yet.
  useEffect(() => {
    const trimmed = displayName.trim()
    if (!open || !player || trimmed.length < 2 || trimmed === initial.displayName.trim()) {
      setNameStatus(null)
      return
    }
    setNameStatus('checking')
    let cancelled = false
    const t = setTimeout(() => {
      checkNameAvailable(player, trimmed).then(result => {
        if (cancelled) return
        if (!result) { setNameStatus(null); return }
        setNameStatus(result.available ? 'available' : 'taken')
      })
    }, 450)
    return () => { cancelled = true; clearTimeout(t) }
  }, [displayName, open, player, initial.displayName])

  // Has the user changed anything since the modal opened?
  const isDirty =
    displayName.trim() !== initial.displayName.trim() ||
    bio.trim()         !== initial.bio.trim() ||
    (avatarSeed.trim() || defaultSeed) !== initial.avatarSeed

  async function handleSave() {
    const trimmedName = displayName.trim()
    if (trimmedName.length > NAME_MAX) {
      setError(`Display name must be ${NAME_MAX} characters or fewer.`)
      return
    }
    if (nameStatus === 'taken') {
      setError('That name is taken. Try another one.')
      return
    }
    if (bio.length > BIO_MAX) {
      setError(`Bio must be ${BIO_MAX} characters or fewer.`)
      return
    }
    sounds.click()
    setError('')
    setSaving(true)
    try {
      // Awaited so a last-moment uniqueness conflict (someone else claimed the
      // name a beat earlier) surfaces here instead of leaving local state
      // out of sync with what the server actually accepted.
      await onSave({
        displayName: trimmedName,
        bio: bio.trim(),
        avatarSeed: avatarSeed.trim() || defaultSeed,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save profile.')
    } finally {
      setSaving(false)
    }
  }

  function attemptClose() {
    sounds.back()
    if (isDirty) setConfirmDiscard(true)
    else onClose()
  }

  function handleResetSeed() {
    sounds.tap()
    setAvatarSeed(defaultSeed)
  }

  function handleRandomSeed() {
    sounds.tap()
    setAvatarSeed(Math.random().toString(36).slice(2, 12))
  }

  const inputStyle: React.CSSProperties = {
    appearance: 'none', border: '1.5px solid rgba(0,0,0,0.08)', borderRadius: 10,
    padding: '10px 12px', fontSize: 14, fontFamily: 'inherit', color: INK,
    background: 'var(--mdd-card)', outline: 'none', width: '100%', boxSizing: 'border-box',
    transition: 'border-color 140ms ease, box-shadow 140ms ease',
  }

  // Track when we're mounted on the client so we can portal-render.
  // Without this guard the first SSR pass would call createPortal on undefined `document`.
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  // Lock body scroll while open
  useEffect(() => {
    if (!open || typeof document === 'undefined') return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  const ui = (
    <AnimatePresence>
      {open && (
        <motion.div
          key="modal-root"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={attemptClose}
          style={{
            position: 'fixed', inset: 0, zIndex: 100,
            background: 'rgba(0,0,0,0.45)',
            backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 16,
            boxSizing: 'border-box',
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-profile-title"
            className="edit-profile-modal"
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: 460,
              maxHeight: 'calc(100vh - 32px)',
              overflowY: 'auto',
              background: 'var(--mdd-card)', borderRadius: 22,
              boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
              padding: 24,
              boxSizing: 'border-box',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 id="edit-profile-title" style={{ margin: 0, fontSize: 20, fontWeight: 700, letterSpacing: -0.4, color: INK }}>
                Edit Profile
              </h2>
              <button
                onClick={attemptClose}
                aria-label="Close"
                style={{ appearance: 'none', border: 'none', background: 'var(--mdd-bg)', width: 32, height: 32, borderRadius: 8, cursor: 'pointer', color: MUTED, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontFamily: 'inherit' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* Display name */}
              <div>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: INK, marginBottom: 6 }}>
                  Display name
                  <span style={{ fontWeight: 400, color: MUTED, marginLeft: 8 }}>
                    {displayName.length}/{NAME_MAX}
                  </span>
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value.slice(0, NAME_MAX))}
                  placeholder="e.g. CeloChampion"
                  maxLength={NAME_MAX}
                  style={{
                    ...inputStyle,
                    borderColor: nameStatus === 'taken' ? RED : nameStatus === 'available' ? '#34C759' : inputStyle.borderColor,
                  }}
                  onFocus={e => (e.target.style.borderColor = BLUE)}
                  onBlur={e => (e.target.style.borderColor = nameStatus === 'taken' ? RED : nameStatus === 'available' ? '#34C759' : 'rgba(0,0,0,0.08)')}
                />
                {nameStatus === 'checking' && (
                  <p style={{ margin: '6px 0 0', fontSize: 11.5, color: MUTED, lineHeight: 1.4 }}>Checking availability…</p>
                )}
                {nameStatus === 'taken' && (
                  <p style={{ margin: '6px 0 0', fontSize: 11.5, color: RED, fontWeight: 600, lineHeight: 1.4 }}>That name is already taken.</p>
                )}
                {nameStatus === 'available' && (
                  <p style={{ margin: '6px 0 0', fontSize: 11.5, color: '#0A7A2D', fontWeight: 600, lineHeight: 1.4 }}>✓ Name is available.</p>
                )}
                {nameStatus === null && (
                  <p style={{ margin: '6px 0 0', fontSize: 11.5, color: MUTED, lineHeight: 1.4 }}>
                    This is how other players see you on the leaderboard and in match history. Names are unique.
                  </p>
                )}
              </div>

              {/* Bio */}
              <div>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: INK, marginBottom: 6 }}>
                  Bio
                  <span style={{ fontWeight: 400, color: MUTED, marginLeft: 8 }}>
                    {bio.length}/{BIO_MAX}
                  </span>
                </label>
                <textarea
                  value={bio}
                  onChange={e => setBio(e.target.value.slice(0, BIO_MAX))}
                  placeholder="Trivia king. Bluff master. Send it."
                  maxLength={BIO_MAX}
                  rows={3}
                  style={{ ...inputStyle, resize: 'vertical', minHeight: 70, lineHeight: 1.5 }}
                  onFocus={e => (e.target.style.borderColor = BLUE)}
                  onBlur={e => (e.target.style.borderColor = 'rgba(0,0,0,0.08)')}
                />
              </div>

              {/* Avatar seed */}
              <div>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: INK, marginBottom: 6 }}>
                  Avatar seed
                  <span style={{ fontWeight: 400, color: MUTED, marginLeft: 8 }}>
                    Changes the identicon pattern
                  </span>
                </label>
                <div className="seed-row" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <input
                    type="text"
                    value={avatarSeed}
                    onChange={e => setAvatarSeed(e.target.value.slice(0, 32))}
                    placeholder={defaultSeed}
                    style={{ ...inputStyle, flex: '1 1 100%', minWidth: 0 }}
                    onFocus={e => (e.target.style.borderColor = BLUE)}
                    onBlur={e => (e.target.style.borderColor = 'rgba(0,0,0,0.08)')}
                  />
                  <button
                    type="button"
                    onClick={handleRandomSeed}
                    style={{ appearance: 'none', border: '1.5px solid rgba(0,0,0,0.08)', background: 'var(--mdd-card)', padding: '8px 14px', borderRadius: 10, fontSize: 12.5, fontWeight: 600, color: INK, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', flex: '1 1 auto' }}
                    title="Generate random seed"
                  >
                    <IconDice size={13} color="#6E6E73" />Random
                  </button>
                  <button
                    type="button"
                    onClick={handleResetSeed}
                    style={{ appearance: 'none', border: '1.5px solid rgba(0,0,0,0.08)', background: 'var(--mdd-card)', padding: '8px 14px', borderRadius: 10, fontSize: 12.5, fontWeight: 600, color: MUTED, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', flex: '1 1 auto' }}
                    title="Reset to wallet default"
                  >
                    Reset
                  </button>
                </div>
              </div>

              {error && (
                <p style={{ margin: 0, fontSize: 12.5, color: RED, fontWeight: 500 }}>{error}</p>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24, flexWrap: 'wrap' }}>
              <button
                onClick={attemptClose}
                style={{ appearance: 'none', border: '1.5px solid rgba(0,0,0,0.10)', background: 'var(--mdd-card)', color: INK, padding: '10px 18px', borderRadius: 12, fontSize: 13.5, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', flex: '0 1 auto' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={nameStatus === 'taken' || nameStatus === 'checking' || saving}
                style={{
                  appearance: 'none', border: 'none', color: '#fff', padding: '10px 22px', borderRadius: 12,
                  fontSize: 13.5, fontWeight: 600, fontFamily: 'inherit', flex: '0 1 auto', whiteSpace: 'nowrap',
                  background: nameStatus === 'taken' || nameStatus === 'checking' || saving ? 'var(--mdd-border-strong)' : BLUE,
                  cursor: nameStatus === 'taken' || nameStatus === 'checking' || saving ? 'not-allowed' : 'pointer',
                  boxShadow: nameStatus === 'taken' || nameStatus === 'checking' || saving ? 'none' : '0 2px 10px rgba(0,113,227,0.25)',
                }}
              >
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )

  // Render via Portal so the modal escapes any ancestor transform/filter
  // (e.g. Framer Motion `motion.aside`) which would otherwise re-anchor
  // `position: fixed` to that ancestor instead of the viewport.
  if (!mounted) return null
  return (
    <>
      {createPortal(ui, document.body)}
      <ConfirmDialog
        open={confirmDiscard}
        title="Discard changes?"
        message="You have unsaved edits. If you leave now, your changes won't be saved."
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        tone="warning"
        onConfirm={() => { setConfirmDiscard(false); onClose() }}
        onCancel={() => setConfirmDiscard(false)}
      />
    </>
  )
}
