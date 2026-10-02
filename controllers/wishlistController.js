import { getDBConnection } from '../db/db.js'

// Saved records ("wishlist") for the signed-in user, backed by the wishlists table

export async function getWishlist(req, res) {
  const db = await getDBConnection()
  try {
    const items = await db.all(
      `SELECT w.id, w.created_at AS savedAt, p.id AS productId, p.title, p.artist, p.genre, p.price, p.image, p.year
       FROM wishlists w JOIN products p ON p.id = w.product_id
       WHERE w.user_id = ?
       ORDER BY w.created_at DESC, w.id DESC`,
      [req.user.userId]
    )
    res.json({ success: true, data: { items } })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch saved records', details: err.message })
  } finally {
    await db.close()
  }
}

export async function addToWishlist(req, res) {
  const productId = Number.parseInt(req.body.product_id, 10)
  if (Number.isNaN(productId)) {
    return res.status(400).json({ success: false, error: 'Invalid product ID' })
  }

  const db = await getDBConnection()
  try {
    const product = await db.get('SELECT id FROM products WHERE id = ?', [productId])
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' })
    }
    const existing = await db.get('SELECT id FROM wishlists WHERE user_id = ? AND product_id = ?', [
      req.user.userId,
      productId
    ])
    if (!existing) {
      await db.run('INSERT INTO wishlists (user_id, product_id) VALUES (?, ?)', [req.user.userId, productId])
    }
    res.status(201).json({ success: true, message: 'Saved' })
  } catch (err) {
    res.status(500).json({ error: 'Failed to save record', details: err.message })
  } finally {
    await db.close()
  }
}

export async function removeFromWishlist(req, res) {
  const productId = Number.parseInt(req.params.productId, 10)
  if (Number.isNaN(productId)) {
    return res.status(400).json({ success: false, error: 'Invalid product ID' })
  }

  const db = await getDBConnection()
  try {
    await db.run('DELETE FROM wishlists WHERE user_id = ? AND product_id = ?', [req.user.userId, productId])
    res.status(204).send()
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove saved record', details: err.message })
  } finally {
    await db.close()
  }
}
