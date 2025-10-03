export function addBtnListeners() {
  document.querySelectorAll('.add-btn').forEach(button => {
    button.addEventListener('click', async (event) => {
      const albumId = event.currentTarget.dataset.id

      try {
        const res = await fetch('/api/v1/cart/items', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
          },
          credentials: 'include',
          body: JSON.stringify({ product_id: parseInt(albumId) })
        })

        if (!res.ok) {
          return window.location.href = '/login.html'
        }

        await updateCartIcon()
      } catch (err) {
        console.error('Error adding to cart:', err)
      }
    })
  })
}

export async function updateCartIcon() {
  try {
    const res = await fetch('/api/v1/cart/count', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
      },
      credentials: 'include'
    })
    const obj = await res.json()
    const totalItems = obj.totalItems

    document.getElementById('cart-banner').innerHTML =
      totalItems > 0
        ? `<a href="/cart.html"><img src="images/cart.png" alt="cart">${totalItems}</a>`
        : ''
  } catch (err) {
    console.error('Error updating cart icon:', err)
  }
}

export async function loadCart(dom) {
  const { checkoutBtn, userMessage, cartList, cartTotal } = dom

  try {
    const items = await fetchCartItems(dom)
    renderCartItems(items, cartList)
    updateCartTotal(items, cartTotal, checkoutBtn)
  } catch (err) {
    console.error('Error loading cart:', err)
    cartList.innerHTML = '<li>Error loading cart data.</li>'
  }
}

async function fetchCartItems({ userMessage, checkoutBtn }) {
  const res = await fetch('/api/v1/cart/', { 
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
    },
    credentials: 'include' 
  })

  if (!res.ok) {
    window.location.href = '/'
    checkoutBtn.disabled = true
    checkoutBtn.classList.add('disabled')
    userMessage.innerHTML = 'Please <a href="login.html">log in</a>.'
    return []
  }

  const { items } = await res.json()
  return items
}

function renderCartItems(items, cartList) {
  cartList.innerHTML = ''

  if (items.length === 0) {
    const emptyCart = document.getElementById('empty-cart')
    if (emptyCart) emptyCart.classList.remove('hidden')
    return
  }

  const emptyCart = document.getElementById('empty-cart')
  if (emptyCart) emptyCart.classList.add('hidden')

  items.forEach(item => {
    const li = document.createElement('li')
    li.className = 'cart-item'

    const itemTotal = item.price * item.quantity

    li.innerHTML = `
      <div class="cart-item-image">
        <img src="./images/${item.title.toLowerCase().replace(/\s+/g, '')}.png" alt="${item.title}">
      </div>
      <div class="cart-item-details">
        <h4 class="cart-item-title">${item.title}</h4>
        <p class="cart-item-artist">${item.artist}</p>
        <div class="cart-item-meta">
          <span class="cart-item-quantity">Qty: ${item.quantity}</span>
          <span class="cart-item-price">$${item.price}</span>
        </div>
      </div>
      <div class="cart-item-actions">
        <button class="btn btn-outline remove-btn" data-id="${item.cartItemId}">
          <span>🗑️</span> Remove
        </button>
      </div>
    `

    cartList.appendChild(li)
  })
}

function updateCartTotal(items, cartTotal, checkoutBtn) {
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  cartTotal.innerHTML = `$${total.toFixed(2)}`
  
  const cartSubtotal = document.getElementById('cart-subtotal')
  if (cartSubtotal) cartSubtotal.innerHTML = `$${total.toFixed(2)}`
  
  const cartItemCount = document.getElementById('cart-item-count')
  if (cartItemCount) cartItemCount.innerHTML = `${items.length} item${items.length !== 1 ? 's' : ''}`

  if (total <= 0) {
    checkoutBtn.disabled = true
    checkoutBtn.classList.add('disabled')
  } else {
    checkoutBtn.disabled = false
    checkoutBtn.classList.remove('disabled')
  }
}

export async function removeItem(itemId, dom) {
  try {
    const res = await fetch(`/api/v1/cart/items/${itemId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
      },
      credentials: 'include',
    })

    if (res.status === 204) {
      await loadCart(dom)
    } else {
      console.error('Error removing item:', await res.text())
    }
  } catch (err) {
    console.error('Error removing item:', err)
  }
}

export async function removeAll(dom) {
  try {
    const res = await fetch(`/api/v1/cart/items`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
      },
      credentials: 'include',
    })

    if (res.status === 204) {
      await loadCart(dom)
    } else {
      console.error('Error clearing cart:', await res.text())
    }
  } catch (err) {
    console.error('Error clearing cart:', err)
  }
}
