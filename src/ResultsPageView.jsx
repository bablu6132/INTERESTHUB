import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  getCurrentProfile,
  getMatchesForUser,
  isSupabaseConfigured,
} from './supabaseClient'

function Spinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
    </div>
  )
}

function ResultsPageView() {
  const navigate = useNavigate()
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadMatches = async () => {
      setLoading(true)
      setError('')

      if (!isSupabaseConfigured) {
        setError(
          'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.',
        )
        setLoading(false)
        return
      }

      try {
        const profile = await getCurrentProfile()
        if (!profile) {
          navigate('/auth', { replace: true })
          return
        }

        const data = await getMatchesForUser(profile.id)
        setMatches(data)
      } catch (loadError) {
        setError(loadError.message)
      } finally {
        setLoading(false)
      }
    }

    loadMatches()
  }, [navigate])

  return (
    <div className="mx-auto w-full max-w-4xl rounded-3xl border border-indigo-100 bg-white/90 p-6 shadow-soft backdrop-blur-sm sm:p-8">
      <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-500 bg-clip-text text-3xl font-bold text-transparent sm:text-4xl">
            Your Matches
          </h1>
          <p className="mt-2 text-sm text-slate-600 sm:text-base">
            Students with similar interests, sorted by compatibility
          </p>
        </div>
        <Link
          to="/profile"
          className="rounded-xl border border-indigo-200 bg-white px-4 py-2 text-sm font-medium text-indigo-600 transition hover:-translate-y-0.5 hover:bg-indigo-50"
        >
          Back to Profile
        </Link>
      </div>

      {loading && <Spinner />}

      {!loading && error && (
        <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
      )}

      {!loading && !error && matches.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center text-slate-600">
          No matches found. Try adding more interests.
        </div>
      )}

      {!loading && !error && matches.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {matches.map((match, index) => (
            <article
              key={match.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
              style={{ animation: `fadeIn 280ms ease-out ${index * 80}ms both` }}
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-slate-800">{match.name}</h2>
                <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">
                  {match.common_interests} common interests
                </span>
              </div>

              <div className="space-y-1.5 text-sm text-slate-600">
                <p>
                  <span className="font-medium text-slate-700">Email:</span> {match.email}
                </p>
                {match.class && (
                  <p>
                    <span className="font-medium text-slate-700">Class:</span> {match.class}
                  </p>
                )}
                {match.rollno && (
                  <p>
                    <span className="font-medium text-slate-700">Roll No:</span> {match.rollno}
                  </p>
                )}
                {match.whatsapp && (
                  <p>
                    <span className="font-medium text-slate-700">WhatsApp:</span>{' '}
                    {match.whatsapp}
                  </p>
                )}
                {match.instagram && (
                  <p>
                    <span className="font-medium text-slate-700">Instagram:</span>{' '}
                    {match.instagram}
                  </p>
                )}

                {Array.isArray(match.common_interest_names) &&
                  match.common_interest_names.length > 0 && (
                    <div className="pt-2">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Common Interests
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {match.common_interest_names.map((interestName) => (
                          <span
                            key={`${match.id}-${interestName}`}
                            className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700"
                          >
                            {interestName}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

export default ResultsPageView
