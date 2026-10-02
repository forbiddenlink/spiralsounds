import { getDBConnection } from '../db/db.js'

const round = (n) => Math.round(n * 100) / 100

// Turn the signed-in user's cart into an order: check stock, record the order
// and its items, take the copies out of stock, and empty the cart, all in one
// transaction. No payment is taken; this shop is a demo.
export async function placeOrder(req, res) {
  const userId = req.user.userId
  const db = await getDBConnection()
  try {
    await db.exec('BEGIN IMMEDIATE')
    const lines = await db.all(
      `SELECT ci.product_id, ci.quantity, p.title, p.artist, p.image, p.price, p.stock
       FROM cart_items ci JOIN products p ON p.id = ci.product_id WHERE ci.user_id = ?`,
      [userId]
    )
    if (!lines.length) {
      await db.exec('ROLLBACK')
      return res.status(400).json({ error: 'Your cart is empty' })
    }
    const short = lines.filter((l) => l.quantity > l.stock)
    if (short.length) {
      await db.exec('ROLLBACK')
      return res.status(409).json({
        error: short
          .map((l) =>
            l.stock === 0 ? `${l.title} is sold out` : `Only ${l.stock} of ${l.title} left`
          )
          .join('. '),
        items: short.map((l) => ({ productId: l.product_id, stock: l.stock })),
      })
    }

    const subtotal = round(lines.reduce((sum, l) => sum + l.price * l.quantity, 0))
    const order = await db.run(
      'INSERT INTO orders (user_id, subtotal, shipping, total) VALUES (?, ?, 0, ?)',
      [userId, subtotal, subtotal]
    )
    for (const l of lines) {
      await db.run(
        'INSERT INTO order_items (order_id, product_id, title, artist, image, price, quantity) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [order.lastID, l.product_id, l.title, l.artist, l.image, l.price, l.quantity]
      )
      await db.run('UPDATE products SET stock = stock - ? WHERE id = ?', [l.quantity, l.product_id])
    }
    await db.run('DELETE FROM cart_items WHERE user_id = ?', [userId])
    await db.exec('COMMIT')

    res
      .status(201)
      .json({
        order: {
          id: order.lastID,
          subtotal,
          shipping: 0,
          total: subtotal,
          itemCount: lines.reduce((n, l) => n + l.quantity, 0),
        },
      })
  } catch (err) {
    await db.exec('ROLLBACK').catch(() => {})
    console.error('placeOrder error:', err)
    res.status(500).json({ error: 'The order could not be placed' })
  } finally {
    await db.close()
  }
}

// The signed-in user's orders, newest first, with their items
export async function listOrders(req, res) {
  const db = await getDBConnection()
  try {
    const orders = await db.all(
      'SELECT id, subtotal, shipping, total, status, created_at FROM orders WHERE user_id = ? ORDER BY created_at DESC, id DESC',
      [req.user.userId]
    )
    const items = orders.length
      ? await db.all(
          `SELECT order_id, product_id AS productId, title, artist, image, price, quantity FROM order_items WHERE order_id IN (${orders.map(() => '?').join(',')})`,
          orders.map((o) => o.id)
        )
      : []
    res.json({
      orders: orders.map((o) => ({
        ...o,
        items: items.filter((i) => i.order_id === o.id).map(({ order_id, ...i }) => i),
      })),
    })
  } catch (err) {
    console.error('listOrders error:', err)
    res.status(500).json({ error: 'Internal server error' })
  } finally {
    await db.close()
  }
}
