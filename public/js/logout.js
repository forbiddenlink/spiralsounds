export async function logout() {
  try {
    const res = await fetch('/api/auth/logout/')
    if (res.ok) {
      window.location.href = '/'
    } else {
      console.error('Logout failed with status:', res.status)
      // Still redirect on server error to clear client state
      window.location.href = '/'
    }
  } catch (error) {
    console.error('Failed to log out:', error.message)
    // Clear any local storage and redirect anyway
    localStorage.clear()
    window.location.href = '/'
  }
}