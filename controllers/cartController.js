import { getDBConnection } from '../db/db.js'

export async function addToCart(req, res) {
 const db = await getDBConnection()

 const productId = parseInt(req.body.product_id, 10)

 if (isNaN(productId)) {
  return res.status(400).json({ error: 'Invalid product ID'})
 }

 const userId = req.user?.userId

 const existing = await db.get('SELECT * FROM cart_items WHERE user_id = ? AND product_id = ?', [userId, productId])

 if (existing) {
  await db.run('UPDATE cart_items SET quantity = quantity + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [existing.id])
 } else {
  await db.run('INSERT INTO cart_items (user_id, product_id, quantity, created_at, updated_at) VALUES (?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)', [userId, productId])
 }

 res.json({ message: 'Added to cart' })

}

export async function getCartCount(req, res) {
  const db = await getDBConnection()

  const result = await db.get(`SELECT SUM(quantity) AS totalItems FROM cart_items WHERE user_id = ?`, [req.user?.userId])

  res.json({ totalItems: result.totalItems || 0 })
}  


export async function getAll(req, res) {

  const db = await getDBConnection()

  const items = await db.all(`SELECT ci.id AS cartItemId, ci.quantity, p.title, p.artist, p.price FROM cart_items ci JOIN products p ON p.id = ci.product_id WHERE ci.user_id = ?`, [req.user?.userId]) 

  res.json({ items: items})
}  


export async function deleteItem(req, res) {

    const db = await getDBConnection()

    const itemId = parseInt(req.params.itemId, 10)

    if (isNaN(itemId)) {
      return res.status(400).json({error: 'Invalid item ID'})
    }

    const item = await db.get('SELECT quantity FROM cart_items WHERE id = ? AND user_id = ?', [itemId, req.user?.userId])

    if (!item) {
      return res.status(400).json({error: 'Item not found'})
    }

    await db.run('DELETE FROM cart_items WHERE id = ? AND user_id = ?', [itemId, req.user?.userId])

    res.status(204).send()
  
}

export async function deleteAll(req, res) {

  const db = await getDBConnection()

  await db.run('DELETE FROM cart_items WHERE user_id = ?', [req.user?.userId])

  res.status(204).send()
  
}

