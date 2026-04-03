import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { getCurrentSessionUserId, isSupabaseConfigured } from './supabaseClient'

function ProtectedRoute({ children }) {
  const [state, setState] = useState({ loading: true, hasSession: false, error: '' })

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setState({
        loading: false,
        hasSession: false,
        error:
          'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.',
      })
      return
    }

    const existingUserId = getCurrentSessionUserId()
    setState({ loading: false, hasSession: Boolean(existingUserId), error: '' })
   }, [])

   if (state.loading) {
     return (
       <div className="mx-auto flex w-full max-w-3xl items-center justify-center rounded-3xl border border-indigo-100 bg-white/90 p-16 shadow-soft backdrop-blur-sm">
         <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
       </div>
     )
   }

   if (state.error) {
     return (
       <div className="mx-auto w-full max-w-3xl rounded-3xl border border-rose-200 bg-rose-50 px-6 py-5 text-sm text-rose-700">
         {state.error}
       </div>
     )
   }

   if (!state.hasSession) {
     return <Navigate to="/auth" replace />
   }

   return children
}

export default ProtectedRoute
