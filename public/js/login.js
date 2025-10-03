const signinForm = document.getElementById('signin-form')
const errorMessage = document.getElementById('error-message')
const submitBtn = document.getElementById('login-btn')
const btnText = submitBtn.querySelector('.btn-text')
const spinner = submitBtn.querySelector('.btn-spinner')

signinForm.addEventListener('submit', async (e) => {
  e.preventDefault()

  const username = document.getElementById('signin-username').value.trim()
  const password = document.getElementById('signin-password').value.trim()

  // Clear previous messages
  errorMessage.classList.add('hidden')

  // Show loading state
  submitBtn.disabled = true
  btnText.textContent = 'Signing In...'
  spinner.classList.remove('hidden')

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({ username, password })
    })

    const data = await res.json()

    if (res.ok) {
      // Show success briefly before redirect
      btnText.textContent = 'Success! Redirecting...'
      spinner.classList.add('hidden')

      // Store user info and tokens
      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user))
      }
      if (data.accessToken) {
        localStorage.setItem('accessToken', data.accessToken)
      }

      setTimeout(() => {
        window.location.href = '/'
      }, 1000)
    } else {
      throw new Error(data.error?.message || 'Login failed. Please try again.')
    }
  } catch (err) {
    console.error('Login error:', err)
    errorMessage.className = 'message error'
    errorMessage.textContent = err.message || 'Unable to connect. Please try again.'
    errorMessage.classList.remove('hidden')
  } finally {
    // Reset button state
    submitBtn.disabled = false
    btnText.textContent = 'Sign In'
    spinner.classList.add('hidden')
  }
})
