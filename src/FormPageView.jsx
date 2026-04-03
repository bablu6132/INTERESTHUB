import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { isSupabaseConfigured, supabase } from './supabaseClient'

const initialForm = {
  name: '',
  email: '',
  phone: '',
  whatsapp: '',
  instagram: '',
}

function FormPageView() {
  const [formData, setFormData] = useState(initialForm)
  const [interests, setInterests] = useState([])
  const [selectedInterests, setSelectedInterests] = useState([])
  const [showAddInterest, setShowAddInterest] = useState(false)
  const [newInterestName, setNewInterestName] = useState('')
  const [addingInterest, setAddingInterest] = useState(false)
  const [errors, setErrors] = useState({})
  const [loadingInterests, setLoadingInterests] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const navigate = useNavigate()

  const emailIsValid = useMemo(() => {
    return /^[A-Za-z0-9._%+-]+@kitsw\.ac\.in$/i.test(formData.email.trim())
  }, [formData.email])

  const canSubmit =
    formData.name.trim().length > 0 && emailIsValid && selectedInterests.length > 0

  useEffect(() => {
    const loadInterests = async () => {
      if (!isSupabaseConfigured || !supabase) {
        setErrors((prev) => ({
          ...prev,
          api: 'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.',
        }))
        setLoadingInterests(false)
        return
      }

      const { data, error } = await supabase
        .from('interests')
        .select('id, name')
        .order('name', { ascending: true })

      if (error) {
        setErrors((prev) => ({
          ...prev,
          api: 'Unable to load interests. Please try again in a moment.',
        }))
      } else {
        setInterests(data || [])
      }

      setLoadingInterests(false)
    }

    loadInterests()
  }, [])

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => ({ ...prev, [field]: '', submit: '', api: '' }))
  }

  const toggleInterest = (interestId) => {
    setSelectedInterests((prev) => {
      if (prev.includes(interestId)) {
        return prev.filter((id) => id !== interestId)
      }
      return [...prev, interestId]
    })
    setErrors((prev) => ({ ...prev, interests: '', submit: '' }))
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

  const validate = () => {
    const nextErrors = {}

    if (!formData.name.trim()) {
      nextErrors.name = 'Name is required.'
    }

    if (!formData.email.trim()) {
      nextErrors.email = 'Email is required.'
    } else if (!emailIsValid) {
      nextErrors.email = 'Use your institute email ending with @kitsw.ac.in.'
    }

    if (selectedInterests.length === 0) {
      nextErrors.interests = 'Select at least one interest.'
    }

    setErrors((prev) => ({ ...prev, ...nextErrors }))
    return Object.keys(nextErrors).length === 0
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!isSupabaseConfigured || !supabase) {
      setErrors((prev) => ({
        ...prev,
        submit:
          'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.',
      }))
      return
    }

    if (!validate()) {
      return
    }

    setSubmitting(true)
    setErrors((prev) => ({ ...prev, submit: '' }))

    const payload = {
      name: formData.name.trim(),
      email: formData.email.trim().toLowerCase(),
      phone: formData.phone.trim() || null,
      whatsapp: formData.whatsapp.trim() || null,
      instagram: formData.instagram.trim() || null,
    }

    const { data: user, error: userError } = await supabase
      .from('users')
      .insert([payload])
      .select('id')
      .single()

    if (userError || !user) {
      setErrors((prev) => ({
        ...prev,
        submit: 'We could not save your profile. Please try again.',
      }))
      setSubmitting(false)
      return
    }

    const interestRows = selectedInterests.map((interestId) => ({
      user_id: user.id,
      interest_id: interestId,
    }))

    const { error: interestError } = await supabase
      .from('user_interests')
      .insert(interestRows)

    if (interestError) {
      setErrors((prev) => ({
        ...prev,
        submit: 'Profile saved, but interests failed to sync. Please retry.',
      }))
      setSubmitting(false)
      return
    }

    navigate(`/results/${user.id}`)
  }

  return (
    <div className="mx-auto w-full max-w-3xl rounded-3xl border border-indigo-100 bg-white/90 p-6 shadow-soft backdrop-blur-sm sm:p-8">
      <div className="mb-8 text-center">
        <h1 className="bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-500 bg-clip-text text-3xl font-bold text-transparent sm:text-4xl">
          Find Your Perfect Match
        </h1>
        <p className="mt-3 text-sm text-slate-600 sm:text-base">
          Connect with students who share your interests
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => updateField('name', e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
              placeholder="Enter your full name"
            />
            {errors.name && <p className="mt-1 text-xs text-rose-600">{errors.name}</p>}
          </div>

          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Email *</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => updateField('email', e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
              placeholder="you@kitsw.ac.in"
            />
            {errors.email && <p className="mt-1 text-xs text-rose-600">{errors.email}</p>}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Phone</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => updateField('phone', e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
              placeholder="Optional"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">WhatsApp</label>
            <input
              type="text"
              value={formData.whatsapp}
              onChange={(e) => updateField('whatsapp', e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
              placeholder="Optional"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Instagram</label>
            <input
              type="text"
              value={formData.instagram}
              onChange={(e) => updateField('instagram', e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
              placeholder="Optional"
            />
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-slate-700">Interests *</p>

          {loadingInterests ? (
            <p className="text-sm text-slate-500">Loading interests...</p>
          ) : (
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
                        ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md scale-[1.02]'
                        : 'bg-slate-100 text-slate-700 hover:bg-indigo-50 hover:text-indigo-600'
                    }`}
                  >
                    {interest.name}
                  </button>
                )
              })}
            </div>
          )}

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
          {errors.api && <p className="mt-1 text-xs text-rose-600">{errors.api}</p>}
        </div>

        {errors.submit && (
          <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {errors.submit}
          </p>
        )}

        <button
          type="submit"
          disabled={!canSubmit || submitting}
          className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-indigo-300 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
        >
          {submitting ? 'Submitting...' : 'Find Matches'}
        </button>
      </form>
    </div>
  )
}

export default FormPageView
