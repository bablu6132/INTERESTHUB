import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getCurrentSessionUserId,
  getInterests,
  isSupabaseConfigured,
  loginUser,
  registerUser,
  supabase,
} from './supabaseClient'

const initialRegister = {
  name: '',
  studentClass: '',
  rollno: '',
  email: '',
  password: '',
  confirmPassword: '',
  phone: '',
  whatsapp: '',
  instagram: '',
}

const initialLogin = {
  email: '',
  password: '',
}

function AuthPage() {
  const [mode, setMode] = useState('register')
  const [registerForm, setRegisterForm] = useState(initialRegister)
  const [loginForm, setLoginForm] = useState(initialLogin)
  const [interests, setInterests] = useState([])
  const [selectedInterests, setSelectedInterests] = useState([])
  const [showAddInterest, setShowAddInterest] = useState(false)
  const [newInterestName, setNewInterestName] = useState('')
  const [addingInterest, setAddingInterest] = useState(false)
  const [loadingInterests, setLoadingInterests] = useState(true)
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('')
  const navigate = useNavigate()

  const registerEmailValid = useMemo(
    () => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(registerForm.email.trim()),
    [registerForm.email],
  )

  useEffect(() => {
    const existingUserId = getCurrentSessionUserId()
    if (existingUserId) {
      navigate('/profile', { replace: true })
    }
  }, [navigate])

  useEffect(() => {
    const loadInterests = async () => {
      if (!isSupabaseConfigured) {
        setErrors((prev) => ({
          ...prev,
          auth:
            'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.',
        }))
        setLoadingInterests(false)
        return
      }

      try {
        const data = await getInterests()
        setInterests(data)
      } catch (error) {
        setErrors((prev) => ({ ...prev, auth: error.message }))
      } finally {
        setLoadingInterests(false)
      }
    }

    loadInterests()
  }, [])

  const toggleInterest = (interestId) => {
    setSelectedInterests((prev) => {
      if (prev.includes(interestId)) {
        return prev.filter((id) => id !== interestId)
      }
      return [...prev, interestId]
    })
    setErrors((prev) => ({ ...prev, interests: '' }))
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

  const validateRegister = () => {
    const nextErrors = {}

    if (!registerForm.name.trim()) {
      nextErrors.name = 'Name is required.'
    }

    if (!registerForm.studentClass.trim()) {
      nextErrors.studentClass = 'Class is required.'
    }

    if (!registerForm.rollno.trim()) {
      nextErrors.rollno = 'Roll no is required.'
    }

    if (!registerForm.email.trim()) {
      nextErrors.email = 'Email is required.'
    } else if (!registerEmailValid) {
      nextErrors.email = 'Enter a valid email address.'
    }

    if (registerForm.password.length < 6) {
      nextErrors.password = 'Password must be at least 6 characters.'
    }

    if (registerForm.password !== registerForm.confirmPassword) {
      nextErrors.confirmPassword = 'Passwords do not match.'
    }

    if (selectedInterests.length === 0) {
      nextErrors.interests = 'Select at least one interest.'
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleRegister = async (event) => {
    event.preventDefault()
    setMessage('')
    setMessageType('')

    if (!validateRegister()) return

    setSubmitting(true)

    try {
      await registerUser({
        name: registerForm.name,
        studentClass: registerForm.studentClass,
        rollno: registerForm.rollno,
        email: registerForm.email,
        password: registerForm.password,
        phone: registerForm.phone,
        whatsapp: registerForm.whatsapp,
        instagram: registerForm.instagram,
        selectedInterests,
      })

      setMessage('Registration successful. You are now logged in.')
      setMessageType('success')
      navigate('/profile')
    } catch (error) {
      setMessage(error.message)
      setMessageType('error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleLogin = async (event) => {
    event.preventDefault()
    setMessage('')
    setMessageType('')

    if (!loginForm.email.trim() || !loginForm.password) {
      setErrors({ login: 'Enter email and password.' })
      return
    }

    setErrors({})
    setSubmitting(true)

    try {
      await loginUser(loginForm)
      setMessage('Login successful.')
      setMessageType('success')
      navigate('/profile')
    } catch (error) {
      setMessage(error.message)
      setMessageType('error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl rounded-3xl border border-indigo-100 bg-white/90 p-6 shadow-soft backdrop-blur-sm sm:p-8">
      <div className="mb-8 text-center">
        <h1 className="bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-500 bg-clip-text text-3xl font-bold text-transparent sm:text-4xl">
          Student Interest Matcher
        </h1>
        <p className="mt-3 text-sm text-slate-600 sm:text-base">
          Register once, then update your profile and interests anytime
        </p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
        <button
          type="button"
          onClick={() => {
            setMode('register')
            setErrors({})
          }}
          className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
            mode === 'register' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600'
          }`}
        >
          Register
        </button>
        <button
          type="button"
          onClick={() => {
            setMode('login')
            setErrors({})
          }}
          className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
            mode === 'login' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600'
          }`}
        >
          Login
        </button>
      </div>

      {message && (
        <p
          className={`mb-4 rounded-xl px-3 py-2 text-sm ${
            messageType === 'success'
              ? 'bg-emerald-50 text-emerald-700'
              : 'bg-rose-50 text-rose-700'
          }`}
        >
          {message}
        </p>
      )}

      {errors.auth && (
        <p className="mb-4 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {errors.auth}
        </p>
      )}

      {mode === 'register' ? (
        <form onSubmit={handleRegister} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Name *</label>
              <input
                type="text"
                value={registerForm.name}
                onChange={(e) =>
                  setRegisterForm((prev) => ({ ...prev, name: e.target.value }))
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
              />
              {errors.name && <p className="mt-1 text-xs text-rose-600">{errors.name}</p>}
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Email *</label>
              <input
                type="email"
                value={registerForm.email}
                onChange={(e) =>
                  setRegisterForm((prev) => ({ ...prev, email: e.target.value }))
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                placeholder="you@example.com"
              />
              {errors.email && <p className="mt-1 text-xs text-rose-600">{errors.email}</p>}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Class *</label>
              <input
                type="text"
                value={registerForm.studentClass}
                onChange={(e) =>
                  setRegisterForm((prev) => ({ ...prev, studentClass: e.target.value }))
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
              />
              {errors.studentClass && (
                <p className="mt-1 text-xs text-rose-600">{errors.studentClass}</p>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Roll No *</label>
              <input
                type="text"
                value={registerForm.rollno}
                onChange={(e) =>
                  setRegisterForm((prev) => ({ ...prev, rollno: e.target.value }))
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
              />
              {errors.rollno && <p className="mt-1 text-xs text-rose-600">{errors.rollno}</p>}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Password *</label>
              <input
                type="password"
                value={registerForm.password}
                onChange={(e) =>
                  setRegisterForm((prev) => ({ ...prev, password: e.target.value }))
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
              />
              {errors.password && (
                <p className="mt-1 text-xs text-rose-600">{errors.password}</p>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Confirm Password *
              </label>
              <input
                type="password"
                value={registerForm.confirmPassword}
                onChange={(e) =>
                  setRegisterForm((prev) => ({ ...prev, confirmPassword: e.target.value }))
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-xs text-rose-600">{errors.confirmPassword}</p>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Phone</label>
              <input
                type="text"
                value={registerForm.phone}
                onChange={(e) =>
                  setRegisterForm((prev) => ({ ...prev, phone: e.target.value }))
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">WhatsApp</label>
              <input
                type="text"
                value={registerForm.whatsapp}
                onChange={(e) =>
                  setRegisterForm((prev) => ({ ...prev, whatsapp: e.target.value }))
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Instagram</label>
              <input
                type="text"
                value={registerForm.instagram}
                onChange={(e) =>
                  setRegisterForm((prev) => ({ ...prev, instagram: e.target.value }))
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
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
                          ? 'scale-[1.02] bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md'
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
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-indigo-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? 'Creating account...' : 'Register'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Email</label>
            <input
              type="email"
              value={loginForm.email}
              onChange={(e) => setLoginForm((prev) => ({ ...prev, email: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Password</label>
            <input
              type="password"
              value={loginForm.password}
              onChange={(e) =>
                setLoginForm((prev) => ({ ...prev, password: e.target.value }))
              }
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
            />
          </div>

          {errors.login && <p className="text-xs text-rose-600">{errors.login}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-indigo-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? 'Signing in...' : 'Login'}
          </button>
        </form>
      )}
    </div>
  )
}

export default AuthPage
