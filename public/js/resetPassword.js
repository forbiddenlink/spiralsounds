// Get token from URL
const urlParams = new URLSearchParams(window.location.search)
const token = urlParams.get('token')

if (!token) {
  const messageDiv = document.getElementById('message')
  messageDiv.className = 'message error'
  messageDiv.textContent = 'Invalid reset link. Please request a new password reset.'
  messageDiv.classList.remove('hidden')
}

document.getElementById('reset-password-form').addEventListener('submit', async (e) => {
  e.preventDefault()

  const submitBtn = document.getElementById('submit-btn')
  const btnText = submitBtn.querySelector('.btn-text')
  const spinner = submitBtn.querySelector('.btn-spinner')
  const messageDiv = document.getElementById('message')

  // Get form data
  const formData = new FormData(e.target)
  const password = formData.get('password')
  const confirmPassword = formData.get('confirmPassword')

  // Client-side validation
  if (password !== confirmPassword) {
    messageDiv.className = 'message error'
    messageDiv.textContent = 'Passwords do not match'
    messageDiv.classList.remove('hidden')
    return
  }

  // Password strength validation
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/
  if (!passwordRegex.test(password)) {
    messageDiv.className = 'message error'
    messageDiv.textContent = 'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character'
    messageDiv.classList.remove('hidden')
    return
  }

  // Show loading state
  submitBtn.disabled = true
  btnText.textContent = 'Resetting...'
  spinner.classList.remove('hidden')
  messageDiv.classList.add('hidden')

  try {
    const response = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ token, password })
    })

    const data = await response.json()

    if (response.ok) {
      messageDiv.className = 'message success'
      messageDiv.textContent = data.message + ' Redirecting to login...'
      messageDiv.classList.remove('hidden')

      // Redirect to login after 2 seconds
      setTimeout(() => {
        window.location.href = '/login.html'
      }, 2000)
    } else {
      throw new Error(data.error || 'Failed to reset password')
    }

  } catch (error) {
    console.error('Password reset error:', error)
    messageDiv.className = 'message error'
    messageDiv.textContent = error.message || 'Failed to reset password. Please try again.'
    messageDiv.classList.remove('hidden')
  } finally {
    // Reset button state
    submitBtn.disabled = false
    btnText.textContent = 'Reset Password'
    spinner.classList.add('hidden')
  }
})