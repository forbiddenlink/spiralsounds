document.getElementById('reset-form').addEventListener('submit', async (e) => {
  e.preventDefault()

  const submitBtn = document.getElementById('submit-btn')
  const btnText = submitBtn.querySelector('.btn-text')
  const spinner = submitBtn.querySelector('.btn-spinner')
  const messageDiv = document.getElementById('message')

  // Get form data
  const formData = new FormData(e.target)
  const email = formData.get('email')

  // Show loading state
  submitBtn.disabled = true
  btnText.textContent = 'Sending...'
  spinner.classList.remove('hidden')
  messageDiv.classList.add('hidden')

  try {
    const response = await fetch('/api/auth/request-password-reset', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email })
    })

    const data = await response.json()

    if (response.ok) {
      messageDiv.className = 'message success'
      messageDiv.textContent = data.message
      messageDiv.classList.remove('hidden')

      // Clear form
      e.target.reset()
    } else {
      throw new Error(data.error || 'Failed to send reset email')
    }

  } catch (error) {
    console.error('Password reset error:', error)
    messageDiv.className = 'message error'
    messageDiv.textContent = error.message || 'Failed to send reset email. Please try again.'
    messageDiv.classList.remove('hidden')
  } finally {
    // Reset button state
    submitBtn.disabled = false
    btnText.textContent = 'Send Reset Link'
    spinner.classList.add('hidden')
  }
})