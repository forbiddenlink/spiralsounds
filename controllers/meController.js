import { getDBConnection } from '../db/db.js'

export async function getCurrentUser(req, res) {
  try {
    const db = await getDBConnection()
    const userId = req.user?.userId || req.session?.userId

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const user = await db.get('SELECT name FROM users WHERE id = ?', [userId])

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    res.json({ isLoggedIn: true, name: user.name })

  } catch (err) {
    console.error('getCurrentUser error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
} 
// Update the signed-in user's display name (2 to 50 characters)
export async function updateCurrentUser(req, res) {
  const displayName = typeof req.body.displayName === 'string' ? req.body.displayName.trim() : ''
  if (displayName.length < 2 || displayName.length > 50) {
    return res.status(400).json({ error: 'Display name must be 2 to 50 characters' })
  }
  const db = await getDBConnection()
  try {
    await db.run('UPDATE users SET display_name = ? WHERE id = ?', [displayName, req.user.userId])
    res.json({ success: true, displayName })
  } catch (err) {
    console.error('updateCurrentUser error:', err)
    res.status(500).json({ error: 'Internal server error' })
  } finally {
    await db.close()
  }
}
