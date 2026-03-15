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