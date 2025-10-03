// Get token from URL
const urlParams = new URLSearchParams(window.location.search)
const token = urlParams.get('token')

const statusDiv = document.getElementById('verification-status')

if (!token) {
  statusDiv.innerHTML = `
    <div class="error-icon">❌</div>
    <h2>Invalid Verification Link</h2>
    <p>The verification link is invalid or missing. Please check your email for the correct link.</p>
  `
} else {
  // Verify email automatically
  verifyEmail(token)
}

async function verifyEmail(token) {
  try {
    const response = await fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`, {
      method: 'GET'
    })

    const data = await response.json()

    if (response.ok) {
      statusDiv.innerHTML = `
        <div class="success-icon">✅</div>
        <h2>Email Verified Successfully!</h2>
        <p>${data.message}</p>
        <p>You can now enjoy all features of Spiral Sounds. Redirecting to home...</p>
      `

      // Redirect to home after 3 seconds
      setTimeout(() => {
        window.location.href = '/'
      }, 3000)

    } else {
      throw new Error(data.error || 'Verification failed')
    }

  } catch (error) {
    console.error('Email verification error:', error)
    statusDiv.innerHTML = `
      <div class="error-icon">❌</div>
      <h2>Verification Failed</h2>
      <p>${error.message || 'Failed to verify email. The link may be expired or invalid.'}</p>
      <p>Please try signing up again or contact support if the problem persists.</p>
    `
  }
}