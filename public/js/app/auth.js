// Sign in, sign up, password reset, email verification, and 2FA code entry.
import * as api from './api.js'
import { fieldErrors } from './api.js'
import { initShell } from './shell.js'
import { esc } from './ui.js'

initShell({ active: 'account' })

const params = new URLSearchParams(location.search)
// Only same-origin destinations are allowed after sign-in. Resolving against
// this origin also catches tricks like "/\evil.com", which browsers read as "//evil.com".
const nextUrl = (() => {
  try {
    const target = new URL(params.get('next') || '/', location.origin)
    return target.origin === location.origin ? target.pathname + target.search + target.hash : '/'
  } catch {
    return '/'
  }
})()

document.querySelectorAll('[data-keep-next]').forEach(a => {
  if (params.get('next')) a.href += `?next=${encodeURIComponent(nextUrl)}`
})

const RULES = {
  length: v => v.length >= 8 && v.length <= 128,
  case: v => /[a-z]/.test(v) && /[A-Z]/.test(v),
  number: v => /\d/.test(v),
  symbol: v => /[@$!%*?&]/.test(v),
  allowed: v => v.length > 0 && /^[A-Za-z\d@$!%*?&]+$/.test(v)
}
const passwordOk = v => Object.values(RULES).every(r => r(v))

document.querySelectorAll('[data-rules-for]').forEach(list => {
  const input = document.getElementById(list.dataset.rulesFor)
  input.addEventListener('input', () => {
    list.querySelectorAll('[data-rule]').forEach(li => li.classList.toggle('is-met', RULES[li.dataset.rule](input.value)))
  })
})

function setBusy(form, busy, label) {
  const btn = form.querySelector('button[type=submit]')
  btn.dataset.label ??= btn.textContent
  btn.disabled = busy
  btn.innerHTML = busy ? `<span class="spinner" aria-hidden="true"></span>${esc(label)}` : esc(btn.dataset.label)
}

function showErrors(form, errors = {}, general = '') {
  form.querySelectorAll('[data-error-for]').forEach(p => {
    const msg = errors[p.dataset.errorFor]
    const input = form.querySelector(`[name="${p.dataset.errorFor}"]`)
    p.hidden = !msg
    p.textContent = msg || ''
    if (input) {
      input.setAttribute('aria-invalid', String(Boolean(msg)))
      if (msg) {
        p.id ||= `${p.dataset.errorFor}-error`
        input.setAttribute('aria-describedby', [input.getAttribute('aria-describedby'), p.id].filter(Boolean).join(' '))
      }
    }
  })
  const box = form.querySelector('[data-form-error]')
  box.hidden = !general
  box.textContent = general
  const first = form.querySelector('[aria-invalid=true]')
  if (first) first.focus()
  else if (general) box.focus?.()
}

function done(form, html) {
  form.hidden = true
  const box = document.querySelector('[data-form-done]')
  box.innerHTML = html
  box.hidden = false
  box.setAttribute('tabindex', '-1')
  box.focus()
}

const handlers = {
  async login(form) {
    const username = form.username.value.trim()
    const password = form.password.value
    const errs = {}
    if (!username) errs.username = 'Enter your username or email.'
    if (!password) errs.password = 'Enter your password.'
    if (Object.keys(errs).length) return showErrors(form, {}, Object.values(errs).join(' '))
    setBusy(form, true, 'Signing in…')
    try {
      const res = await api.login({ username, password })
      if (res?.requires2FA) {
        // Password was right; the code page finishes the sign-in with this short-lived challenge
        sessionStorage.setItem('pending2FA', res.challengeToken)
        location.href = `/verify-2fa.html?next=${encodeURIComponent(nextUrl)}`
        return
      }
      location.href = nextUrl
    } catch (err) {
      setBusy(form, false)
      const msg = err.status === 401 ? 'That username and password do not match an account.' : err.status === 429 ? 'Too many attempts. Wait 15 minutes and try again.' : err.message
      showErrors(form, {}, msg)
    }
  },

  async signup(form) {
    const data = Object.fromEntries(new FormData(form))
    const errs = {}
    if (data.name.trim().length < 2) errs.name = 'Enter at least 2 characters.'
    if (!/^\S+@\S+\.\S+$/.test(data.email)) errs.email = 'Enter an email address like name@example.com.'
    if (!/^[A-Za-z0-9_-]{3,20}$/.test(data.username)) errs.username = 'Use 3 to 20 letters, numbers, underscores, or dashes.'
    if (!passwordOk(data.password)) errs.password = 'The password does not meet every rule above.'
    if (data.confirmPassword !== data.password) errs.confirmPassword = 'The two passwords do not match.'
    if (Object.keys(errs).length) return showErrors(form, errs)
    setBusy(form, true, 'Creating account…')
    try {
      await api.register(data)
      location.href = nextUrl
    } catch (err) {
      setBusy(form, false)
      const fields = fieldErrors(err)
      const dup = err.status === 409 || /exists|taken|already/i.test(err.message)
      showErrors(form, fields, Object.keys(fields).length ? '' : dup ? 'An account already uses that email or username. Sign in instead, or pick another.' : err.message)
    }
  },

  async forgot(form) {
    const email = form.email.value.trim()
    if (!/^\S+@\S+\.\S+$/.test(email)) return showErrors(form, { email: 'Enter an email address like name@example.com.' })
    setBusy(form, true, 'Sending…')
    try {
      await api.requestReset(email)
      done(form, `<strong>Check your inbox.</strong> If an account uses ${esc(email)}, a reset link is on its way. It expires in one hour.`)
    } catch (err) {
      setBusy(form, false)
      showErrors(form, fieldErrors(err), err.status === 429 ? 'Too many requests. Wait 15 minutes and try again.' : err.message)
    }
  },

  async reset(form) {
    const token = params.get('token')
    const password = form.password.value
    const errs = {}
    if (!passwordOk(password)) errs.password = 'The password does not meet every rule above.'
    if (form.confirmPassword.value !== password) errs.confirmPassword = 'The two passwords do not match.'
    if (!token) return showErrors(form, {}, 'This page needs the link from your reset email. Request a new link below.')
    if (Object.keys(errs).length) return showErrors(form, errs)
    setBusy(form, true, 'Saving…')
    try {
      await api.resetPassword(token, password)
      done(form, '<strong>Password saved.</strong> <a href="/login.html">Sign in with your new password</a>.')
    } catch (err) {
      setBusy(form, false)
      showErrors(form, fieldErrors(err), err.status === 400 ? 'This reset link has expired or was already used. Request a new one below.' : err.message)
    }
  },

  async twofa(form) {
    const challengeToken = sessionStorage.getItem('pending2FA')
    const code = form.code.value.replace(/\s+/g, '')
    if (!challengeToken) return showErrors(form, {}, 'There is no sign-in waiting for a code. Start again from the sign-in page.')
    if (!code) return showErrors(form, {}, 'Enter the code from your authenticator app.')
    setBusy(form, true, 'Checking…')
    try {
      await api.api('/auth/2fa/verify', { method: 'POST', body: { challengeToken, token: code } })
      sessionStorage.removeItem('pending2FA')
      location.href = nextUrl
    } catch (err) {
      setBusy(form, false)
      if (err.status === 401 || err.status === 429) {
        // The challenge is spent; only a fresh password sign-in can continue
        sessionStorage.removeItem('pending2FA')
        return showErrors(form, {}, err.message)
      }
      const left = err.body?.attemptsLeft
      showErrors(form, {}, `That code did not match. Codes change every 30 seconds; try the current one.${left != null && left <= 2 ? ` ${left} ${left === 1 ? 'try' : 'tries'} left.` : ''}`)
    }
  }
}

document.querySelectorAll('form[data-form]').forEach(form => {
  form.addEventListener('submit', e => {
    e.preventDefault()
    handlers[form.dataset.form](form)
  })
})

// Email verification runs as soon as the page opens
const verifyBox = document.querySelector('[data-verify]')
if (verifyBox) {
  const token = params.get('token')
  if (!token) {
    verifyBox.innerHTML = '<p class="lede">This page needs the link from your confirmation email. Open the email and select the link again.</p><a class="btn" href="/">Go to the shop</a>'
  } else {
    api
      .verifyEmail(token)
      .then(() => {
        verifyBox.innerHTML = '<div class="notice notice--ok"><strong>Email confirmed.</strong> Thanks, your account is all set.</div><p style="margin-top:24px"><a class="btn btn--primary" href="/">Start browsing</a></p>'
      })
      .catch(err => {
        verifyBox.innerHTML = `<div class="notice notice--error">${err.status === 400 ? 'This confirmation link has expired or was already used.' : esc(err.message)}</div><p style="margin-top:24px"><a class="btn" href="/account-settings.html">Go to your account</a></p>`
      })
  }
}
