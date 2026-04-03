import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://yzzpclcattnhurzpjuwb.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_Xz5huOcWp86CF5iJGr4EQg_FeZJWKDg'
const SESSION_KEY = 'sim_user_id'

export const isSupabaseConfigured =
  Boolean(supabaseUrl) && Boolean(supabaseAnonKey)

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

const ensureClient = () => {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error(
      'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.',
    )
  }
}

const getStorage = () => {
  if (typeof window === 'undefined') return null
  return window.localStorage
}

const setSessionUserId = (userId) => {
  const storage = getStorage()
  if (!storage) return
  storage.setItem(SESSION_KEY, String(userId))
}

export const getCurrentSessionUserId = () => {
  const storage = getStorage()
  if (!storage) return null
  const value = storage.getItem(SESSION_KEY)
  if (!value) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const clearSessionUserId = () => {
  const storage = getStorage()
  if (!storage) return
  storage.removeItem(SESSION_KEY)
}

export const getInterests = async () => {
  ensureClient()
  const { data, error } = await supabase
    .from('interests')
    .select('id, name')
    .order('name', { ascending: true })

  if (error) throw new Error(error.message)
  return data || []
}

export const registerUser = async ({
  name,
  studentClass,
  rollno,
  email,
  password,
  phone,
  whatsapp,
  instagram,
  selectedInterests,
}) => {
  ensureClient()

  const normalizedEmail = email.trim().toLowerCase()

  const { data: existingUser, error: existingUserError } = await supabase
    .from('users')
    .select('id')
    .eq('email', normalizedEmail)
    .maybeSingle()

  if (existingUserError) {
    throw new Error(existingUserError.message)
  }

  if (existingUser) {
    throw new Error('Account already exists. Please log in.')
  }

  const payload = {
    name: name.trim(),
    class: studentClass?.trim() || null,
    rollno: rollno?.trim() || null,
    email: normalizedEmail,
    password: password.trim(),
    phone: phone?.trim() || null,
    whatsapp: whatsapp?.trim() || null,
    instagram: instagram?.trim() || null,
  }

  const { data: profile, error: profileError } = await supabase
    .from('users')
    .insert([payload])
    .select('id')
    .single()

  if (profileError || !profile) {
    throw new Error(profileError?.message || 'Could not create profile row.')
  }

  await syncUserInterests(profile.id, selectedInterests)
  setSessionUserId(profile.id)
  return { profileId: profile.id }
}

export const loginUser = async ({ email, password }) => {
  ensureClient()

  const normalizedEmail = email.trim().toLowerCase()
  const { data: row, error } = await supabase
    .from('users')
    .select('id, password')
    .eq('email', normalizedEmail)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!row || row.password !== password) {
    throw new Error('Invalid email or password.')
  }

  setSessionUserId(row.id)
  return { userId: row.id }
}

export const logoutUser = async () => {
  clearSessionUserId()
}

export const getCurrentProfile = async () => {
  ensureClient()

  const userId = getCurrentSessionUserId()
  if (!userId) return null

  const { data: resolvedProfile, error: profileError } = await supabase
    .from('users')
    .select('id, name, class, rollno, email, phone, whatsapp, instagram')
    .eq('id', userId)
    .maybeSingle()

  if (profileError) throw new Error(profileError.message)
  if (!resolvedProfile) {
    clearSessionUserId()
    return null
  }

  const { data: userInterests, error: interestsError } = await supabase
    .from('user_interests')
    .select('interest_id')
    .eq('user_id', resolvedProfile.id)

  if (interestsError) throw new Error(interestsError.message)

  return {
    ...resolvedProfile,
    selectedInterests: (userInterests || []).map((row) => row.interest_id),
  }
}

export const syncUserInterests = async (userId, selectedInterestIds = []) => {
  ensureClient()

  const nextIds = [...new Set((selectedInterestIds || []).map(Number))]

  const { data: existingRows, error: existingError } = await supabase
    .from('user_interests')
    .select('interest_id')
    .eq('user_id', userId)

  if (existingError) throw new Error(existingError.message)

  const existingIds = (existingRows || []).map((row) => Number(row.interest_id))
  const toAdd = nextIds.filter((id) => !existingIds.includes(id))
  const toDelete = existingIds.filter((id) => !nextIds.includes(id))

  if (toAdd.length > 0) {
    const insertRows = toAdd.map((interestId) => ({ user_id: userId, interest_id: interestId }))
    const { error: insertError } = await supabase.from('user_interests').insert(insertRows)
    if (insertError) throw new Error(insertError.message)
  }

  if (toDelete.length > 0) {
    const { error: deleteError } = await supabase
      .from('user_interests')
      .delete()
      .eq('user_id', userId)
      .in('interest_id', toDelete)

    if (deleteError) throw new Error(deleteError.message)
  }
}

export const updateProfileWithReauth = async ({
  profileId,
  profileData,
  selectedInterests,
  currentPassword,
}) => {
  ensureClient()

  const { data: verifiedUser, error: verifyError } = await supabase
    .from('users')
    .select('id')
    .eq('id', profileId)
    .eq('password', currentPassword)
    .maybeSingle()

  if (verifyError) throw new Error(verifyError.message)
  if (!verifiedUser) {
    throw new Error('Current password is incorrect.')
  }

  const payload = {
    name: profileData.name.trim(),
    class: profileData.studentClass?.trim() || null,
    rollno: profileData.rollno?.trim() || null,
    phone: profileData.phone?.trim() || null,
    whatsapp: profileData.whatsapp?.trim() || null,
    instagram: profileData.instagram?.trim() || null,
  }

  const { error: updateError } = await supabase
    .from('users')
    .update(payload)
    .eq('id', profileId)

  if (updateError) throw new Error(updateError.message)

  await syncUserInterests(profileId, selectedInterests)
}

const attachCommonInterestNames = async (userId, matches) => {
  if (!matches || matches.length === 0) return []

  const matchIds = matches.map((match) => Number(match.id)).filter((id) => Number.isFinite(id))
  if (matchIds.length === 0) {
    return matches.map((match) => ({ ...match, common_interest_names: [] }))
  }

  const { data: myInterests, error: myInterestError } = await supabase
    .from('user_interests')
    .select('interest_id')
    .eq('user_id', userId)

  if (myInterestError) throw new Error(myInterestError.message)

  const myInterestIds = (myInterests || []).map((row) => Number(row.interest_id))
  if (myInterestIds.length === 0) {
    return matches.map((match) => ({ ...match, common_interest_names: [] }))
  }

  const { data: overlapRows, error: overlapError } = await supabase
    .from('user_interests')
    .select('user_id, interest_id')
    .in('user_id', matchIds)
    .in('interest_id', myInterestIds)

  if (overlapError) throw new Error(overlapError.message)

  const overlapInterestIds = [
    ...new Set((overlapRows || []).map((row) => Number(row.interest_id))),
  ]

  if (overlapInterestIds.length === 0) {
    return matches.map((match) => ({ ...match, common_interest_names: [] }))
  }

  const { data: interestRows, error: interestError } = await supabase
    .from('interests')
    .select('id, name')
    .in('id', overlapInterestIds)

  if (interestError) throw new Error(interestError.message)

  const interestNameById = {}
  ;(interestRows || []).forEach((row) => {
    interestNameById[Number(row.id)] = row.name
  })

  const namesByUserId = {}
  ;(overlapRows || []).forEach((row) => {
    const uid = Number(row.user_id)
    const iid = Number(row.interest_id)
    const name = interestNameById[iid]
    if (!name) return

    if (!namesByUserId[uid]) namesByUserId[uid] = new Set()
    namesByUserId[uid].add(name)
  })

  return matches.map((match) => {
    const names = Array.from(namesByUserId[Number(match.id)] || [])
    return {
      ...match,
      common_interest_names: names,
      common_interests:
        typeof match.common_interests === 'number' ? match.common_interests : names.length,
    }
  })
}

export const getMatchesForUser = async (userId) => {
  ensureClient()

  const { data: rpcData, error: rpcError } = await supabase.rpc('get_student_matches', {
    target_user_id: userId,
  })

  if (rpcError) {
    const { data: myInterests, error: myInterestError } = await supabase
      .from('user_interests')
      .select('interest_id')
      .eq('user_id', userId)

    if (myInterestError) throw new Error(myInterestError.message)

    const interestIds = (myInterests || []).map((row) => row.interest_id)
    if (interestIds.length === 0) return []

    const { data: overlapRows, error: overlapError } = await supabase
      .from('user_interests')
      .select('user_id, interest_id')
      .in('interest_id', interestIds)
      .neq('user_id', userId)

    if (overlapError) throw new Error(overlapError.message)

    const scoreMap = {}
    ;(overlapRows || []).forEach((row) => {
      scoreMap[row.user_id] = (scoreMap[row.user_id] || 0) + 1
    })

    const matchUserIds = Object.keys(scoreMap)
    if (matchUserIds.length === 0) return []

    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, name, class, rollno, email, phone, whatsapp, instagram')
      .in('id', matchUserIds)

    if (usersError) throw new Error(usersError.message)

    const baseMatches = (users || [])
      .map((user) => ({
        ...user,
        common_interests: Number(scoreMap[user.id] || 0),
      }))
      .sort((a, b) => b.common_interests - a.common_interests)

    return attachCommonInterestNames(userId, baseMatches)
  }

  const baseMatches = (rpcData || []).map((row) => ({
    ...row,
    common_interests: Number(row.common_interest_count || 0),
  }))

  return attachCommonInterestNames(userId, baseMatches)
}
