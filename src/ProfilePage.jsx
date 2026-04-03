import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  getCurrentProfile,
  getInterests,
  isSupabaseConfigured,
  logoutUser,
  supabase,
  updateProfileWithReauth,
} from './supabaseClient'

function ReauthModal({ open, loading, error, onCancel, onConfirm }) {
  const [password, setPassword] = useState('')

  useEffect(() => {
    if (!open) setPassword('')
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <h3 className="text-lg font-semibold text-slate-800">Confirm Current Password</h3>
        <p className="mt-2 text-sm text-slate-600">
          Enter your current password to save profile and interests.
        </p>

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-4 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
          placeholder="Current password"
        />

        {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(password)}
            disabled={loading || !password}
            className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Verifying...' : 'Verify & Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ProfilePage() {
  const [profile, setProfile] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    studentClass: '',
    rollno: '',
    email: '',
    phone: '',
    whatsapp: '',
    instagram: '',
  })
  const [interests, setInterests] = useState([])
  const [selectedInterests, setSelectedInterests] = useState([])
  const [showAddInterest, setShowAddInterest] = useState(false)
  const [newInterestName, setNewInterestName] = useState('')
  const [addingInterest, setAddingInterest] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})
  const [banner, setBanner] = useState({ type: '', text: '' })
  const [showReauth, setShowReauth] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        if (!isSupabaseConfigured) {
          throw new Error(
            'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.',
          )
        }

        const [profileData, interestData] = await Promise.all([
          getCurrentProfile(),
          getInterests(),
        ])

        if (!profileData) {
          navigate('/auth', { replace: true })
          return
        }

        setProfile(profileData)
        setInterests(interestData)
        setSelectedInterests(profileData.selectedInterests || [])
        setFormData({
          name: profileData.name || '',
          studentClass: profileData.class || '',
          rollno: profileData.rollno || '',
          email: profileData.email || '',
          phone: profileData.phone || '',
          whatsapp: profileData.whatsapp || '',
          instagram: profileData.instagram || '',
        })
      } catch (error) {
        setErrors({ page: error.message })
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [navigate])

  const toggleInterest = (interestId) => {
    setSelectedInterests((prev) => {
      if (prev.includes(interestId)) {
        return prev.filter((id) => id !== interestId)
      }
      return [...prev, interestId]
    })
  }

  const handleAddInterest = async () => {
    const nextName = newInterestName.trim()
    if (!nextName) {
      setErrors((prev) => ({ ...prev, addInterest: 'Enter an interest name.' }))
      return
    }

    if (!isSupabaseConfigured || !supabase) {
      setErrors((prev) => ({
        ...prev,
        addInterest:
          'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.',
      }))
      return
    }

    const existingInterest = interests.find(
      (interest) => interest.name.toLowerCase() === nextName.toLowerCase(),
    )

    if (existingInterest) {
      if (!selectedInterests.includes(existingInterest.id)) {
        setSelectedInterests((prev) => [...prev, existingInterest.id])
      }
      setNewInterestName('')
      setShowAddInterest(false)
      setErrors((prev) => ({ ...prev, addInterest: '', interests: '' }))
      return
    }

    setAddingInterest(true)
    setErrors((prev) => ({ ...prev, addInterest: '' }))

    const { data, error } = await supabase
      .from('interests')
      .insert([{ name: nextName }])
      .select('id, name')
      .single()

    if (error || !data) {
      setErrors((prev) => ({
        ...prev,
        addInterest: 'Could not add this interest right now. Please try again.',
      }))
      setAddingInterest(false)
      return
    }

    setInterests((prev) => {
      const nextInterests = [...prev, data]
      return nextInterests.sort((a, b) => a.name.localeCompare(b.name))
    })
    setSelectedInterests((prev) => [...prev, data.id])
    setNewInterestName('')
    setShowAddInterest(false)
    setErrors((prev) => ({ ...prev, addInterest: '', interests: '' }))
    setAddingInterest(false)
  }

  const requestSave = (event) => {
    event.preventDefault()
    setBanner({ type: '', text: '' })

    const nextErrors = {}
    if (!formData.name.trim()) {
      nextErrors.name = 'Name is required.'
    }
    if (selectedInterests.length === 0) {
      nextErrors.interests = 'Select at least one interest.'
    }

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setShowReauth(true)
  }

  const confirmSave = async (password) => {
    if (!profile) return

    setSaving(true)
    setErrors((prev) => ({ ...prev, reauth: '' }))

    try {
      await updateProfileWithReauth({
        profileId: profile.id,
        profileData: {
          name: formData.name,
          studentClass: formData.studentClass,
          rollno: formData.rollno,
          phone: formData.phone,
          whatsapp: formData.whatsapp,
          instagram: formData.instagram,
        },
        selectedInterests,
        currentPassword: password,
      })

      setBanner({ type: 'success', text: 'Profile and interests updated successfully.' })
      setShowReauth(false)
    } catch (error) {
      setErrors((prev) => ({ ...prev, reauth: error.message }))
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = async () => {
    try {
      await logoutUser()
      navigate('/auth', { replace: true })
    } catch (error) {
      setBanner({ type: 'error', text: error.message })
    }
  }

  if (loading) {
    return (
      <div className="mx-auto flex w-full max-w-3xl items-center justify-center rounded-3xl border border-indigo-100 bg-white/90 p-16 shadow-soft backdrop-blur-sm">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
      </div>
    )
  }

  if (errors.page) {
    return (
      <div className="mx-auto w-full max-w-3xl rounded-3xl border border-rose-200 bg-rose-50 px-6 py-5 text-sm text-rose-700">
        {errors.page}
      </div>
    )
  }

  return (
    <>
      <div className="mx-auto w-full max-w-3xl rounded-3xl border border-indigo-100 bg-white/90 p-6 shadow-soft backdrop-blur-sm sm:p-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-500 bg-clip-text text-3xl font-bold text-transparent sm:text-4xl">
              Edit Profile
            </h1>
            <p className="mt-2 text-sm text-slate-600 sm:text-base">
              Add interests, update details, and discover better matches
            </p>
          </div>

          <div className="flex gap-2">
            <Link
              to="/results"
              className="rounded-xl border border-indigo-200 bg-white px-4 py-2 text-sm font-medium text-indigo-600 transition hover:-translate-y-0.5 hover:bg-indigo-50"
            >
              View Matches
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Logout
            </button>
          </div>
        </div>

        {banner.text && (
          <p
            className={`mb-4 rounded-xl px-3 py-2 text-sm ${
              banner.type === 'success'
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-rose-50 text-rose-700'
            }`}
          >
            {banner.text}
          </p>
        )}

        <form onSubmit={requestSave} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
              />
              {errors.name && <p className="mt-1 text-xs text-rose-600">{errors.name}</p>}
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Email</label>
              <input
                type="email"
                value={formData.email}
                disabled
                className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-4 py-2.5 text-sm text-slate-500"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Class</label>
              <input
                type="text"
                value={formData.studentClass}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, studentClass: e.target.value }))
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Roll No</label>
              <input
                type="text"
                value={formData.rollno}
                onChange={(e) => setFormData((prev) => ({ ...prev, rollno: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Phone</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">WhatsApp</label>
              <input
                type="text"
                value={formData.whatsapp}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, whatsapp: e.target.value }))
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Instagram</label>
              <input
                type="text"
                value={formData.instagram}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, instagram: e.target.value }))
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
              />
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">Interests *</p>
            <div className="flex flex-wrap gap-2">
              {interests.map((interest) => {
                const selected = selectedInterests.includes(interest.id)
                return (
                  <button
                    key={interest.id}
                    type="button"
                    onClick={() => toggleInterest(interest.id)}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ${
                      selected
                        ? 'scale-[1.02] bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md'
                        : 'bg-slate-100 text-slate-700 hover:bg-indigo-50 hover:text-indigo-600'
                    }`}
                  >
                    {interest.name}
                  </button>
                )
              })}
            </div>
            {errors.interests && (
              <p className="mt-1 text-xs text-rose-600">{errors.interests}</p>
            )}
            <div className="mt-3 rounded-xl border border-dashed border-indigo-200 bg-indigo-50/40 p-3">
              <p className="text-xs text-slate-600">
                Existing interests do not match your interest?
              </p>
              {!showAddInterest ? (
                <button
                  type="button"
                  onClick={() => {
                    setShowAddInterest(true)
                    setErrors((prev) => ({ ...prev, addInterest: '' }))
                  }}
                  className="mt-2 rounded-lg border border-indigo-300 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100"
                >
                  + Add New Interest
                </button>
              ) : (
                <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                  <input
                    type="text"
                    value={newInterestName}
                    onChange={(e) => {
                      setNewInterestName(e.target.value)
                      setErrors((prev) => ({ ...prev, addInterest: '' }))
                    }}
                    placeholder="Type your interest"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 sm:max-w-xs"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleAddInterest}
                      disabled={addingInterest}
                      className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {addingInterest ? 'Adding...' : 'Add'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddInterest(false)
                        setNewInterestName('')
                        setErrors((prev) => ({ ...prev, addInterest: '' }))
                      }}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
              {errors.addInterest && (
                <p className="mt-1 text-xs text-rose-600">{errors.addInterest}</p>
              )}
            </div>
          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-indigo-300"
          >
            Save Changes
          </button>
        </form>
      </div>

      <ReauthModal
        open={showReauth}
        loading={saving}
        error={errors.reauth}
        onCancel={() => {
          if (!saving) {
            setShowReauth(false)
            setErrors((prev) => ({ ...prev, reauth: '' }))
          }
        }}
        onConfirm={confirmSave}
      />
    </>
  )
}

export default ProfilePage
