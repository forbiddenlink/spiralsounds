// Account: profile, two-step sign in (2FA), and sign out.
import * as api from './api.js'
import { initShell, session, signOut, toast } from './shell.js'
import { esc } from './ui.js'

const root = document.getElementById('account')
const sub = document.getElementById('account-sub')
const dateFmt = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

let user
let twofa

function profileHtml() {
  return `<section class="panel" id="profile" aria-labelledby="profile-title">
    <h2 id="profile-title">Profile</h2>
    <p>Your display name appears on reviews you write.</p>
    <form id="profile-form" novalidate>
      <div class="field"><label for="displayName">Display name</label>
        <input class="input" id="displayName" name="displayName" value="${esc(session().me.name)}" minlength="2" maxlength="50" required>
        <p class="field-error" id="displayName-error" hidden></p></div>
      <div class="field"><label for="acct-email">Email</label>
        <input class="input" id="acct-email" value="${esc(user.email)}" readonly aria-describedby="email-hint">
        <p class="hint" id="email-hint">${user.verified ? '<span class="badge badge--on">Confirmed</span>' : '<span class="badge">Not confirmed yet</span> Look for the confirmation email we sent when you signed up.'}</p></div>
      <div class="field"><label for="acct-username">Username</label>
        <input class="input" id="acct-username" value="${esc(user.username)}" readonly></div>
      <button class="btn btn--primary" type="submit" style="margin-top:24px">Save name</button>
    </form>
  </section>`
}

function securityHtml() {
  const on = twofa.enabled
  return `<section class="panel" id="security" aria-labelledby="security-title">
    <h2 id="security-title">Sign-in and security</h2>
    <p>Keep your account yours.</p>
    <h3 style="font-size:var(--t-l)">Password</h3>
    <p class="muted" style="margin:8px 0 16px">To change your password, we email you a secure link.</p>
    <a class="btn" href="/forgot-password.html">Email me a reset link</a>
    <hr style="border:0;border-top:1px solid var(--rule);margin:32px 0">
    <h3 style="font-size:var(--t-l)">Two-step sign in <span class="badge ${on ? 'badge--on' : ''}">${on ? 'On' : 'Off'}</span></h3>
    <div id="twofa">${
      on
        ? `<p class="muted" style="margin:8px 0 16px">${twofa.setupAt ? `Turned on ${esc(dateFmt.format(new Date(twofa.setupAt)))}. ` : ''}${twofa.remainingBackupCodes ?? 0} backup code${twofa.remainingBackupCodes === 1 ? '' : 's'} left.</p>
           <div style="display:flex;gap:12px;flex-wrap:wrap"><button class="btn" type="button" id="new-codes">Make new backup codes</button><button class="btn" type="button" id="twofa-off">Turn off</button></div>`
        : `<p class="muted" style="margin:8px 0 16px">Add a code from an authenticator app (like 1Password, Authy, or Google Authenticator) on top of your password.</p>
           <button class="btn btn--primary" type="button" id="twofa-setup">Set up two-step sign in</button>`
    }</div>
  </section>`
}

function codesHtml(codes) {
  return `<div class="notice notice--ok" style="margin-top:16px"><strong>Save these backup codes somewhere safe.</strong> Each one works once if you lose your phone. They will not be shown again.
    <ul class="codes">${codes.map(c => `<li>${esc(c)}</li>`).join('')}</ul>
    <button class="btn btn--small" type="button" data-copy="${esc(codes.join('\n'))}">Copy codes</button></div>`
}

async function render() {
  try {
    ;[{ user }, twofa] = await Promise.all([api.getAuthStatus(), api.api('/auth/2fa/status')])
  } catch (err) {
    root.innerHTML = `<div class="state"><h2>Your account would not load</h2><p>${esc(err.message)}</p></div>`
    return
  }
  // roles that carry the analytics:view permission (middleware/rbac.js)
  const isStaff = ['admin', 'super_admin', 'moderator'].includes(session().me.role)
  sub.textContent = `Signed in as ${user.username}.`
  root.removeAttribute('aria-busy')
  root.innerHTML = `<div class="account-grid">
    <nav class="side-nav" aria-label="Account sections">
      <a href="#profile">Profile</a><a href="#security">Sign-in and security</a>
      <a href="/saved.html">Saved records</a><a href="/cart.html">Cart</a>
      ${isStaff ? '<a href="/admin.html">Shop dashboard</a>' : ''}
      <button type="button" class="btn btn--small" id="sign-out" style="margin-top:16px;justify-self:start">Sign out</button>
    </nav>
    <div>${profileHtml()}${securityHtml()}</div></div>`
  bind()
}

function bind() {
  document.getElementById('sign-out').addEventListener('click', signOut)

  document.getElementById('profile-form').addEventListener('submit', async e => {
    e.preventDefault()
    const input = e.target.displayName
    const err = document.getElementById('displayName-error')
    const name = input.value.trim()
    if (name.length < 2 || name.length > 50) {
      err.textContent = 'Use 2 to 50 characters.'
      err.hidden = false
      input.setAttribute('aria-invalid', 'true')
      input.focus()
      return
    }
    err.hidden = true
    input.removeAttribute('aria-invalid')
    try {
      await api.api('/me', { method: 'PUT', body: { displayName: name } })
      session().me.name = name
      toast('Name saved')
    } catch (e2) {
      toast(e2.message, { tone: 'error' })
    }
  })

  const box = document.getElementById('twofa')
  box.addEventListener('click', async e => {
    if (e.target.closest('[data-copy]')) {
      try {
        await navigator.clipboard.writeText(e.target.closest('[data-copy]').dataset.copy)
        toast('Backup codes copied')
      } catch {
        toast('Copy did not work here. Select the codes and copy them by hand.', { tone: 'error' })
      }
    }
    if (e.target.id === 'twofa-setup') {
      e.target.disabled = true
      try {
        const setup = await api.api('/auth/2fa/setup', { method: 'POST' })
        box.innerHTML = `<ol class="prose" style="margin:16px 0;padding-left:20px;display:grid;gap:8px">
            <li>Scan this code with your authenticator app, or type the key by hand.</li>
            <li>Enter the 6-digit code the app shows to finish.</li></ol>
          <div class="qr"><img src="${esc(setup.qrCode)}" alt="QR code for Spiral Sounds two-step sign in" width="180" height="180">
            <div><p class="label">Key</p><p style="font-weight:700;letter-spacing:.08em;word-break:break-all">${esc(setup.manualEntryKey)}</p></div></div>
          <form id="twofa-enable" novalidate style="display:flex;gap:12px;flex-wrap:wrap;align-items:end">
            <div class="field" style="flex:1;min-width:200px"><label for="enable-code">6-digit code</label>
              <input class="input code-input" id="enable-code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" required></div>
            <button class="btn btn--primary" type="submit">Turn on</button></form>
          <p class="field-error" id="enable-error" role="alert" hidden></p>
          <div hidden id="pending-codes">${codesHtml(setup.backupCodes || [])}</div>`
        document.getElementById('twofa-enable').addEventListener('submit', async ev => {
          ev.preventDefault()
          const code = document.getElementById('enable-code').value.trim()
          const errEl = document.getElementById('enable-error')
          try {
            const r = await api.api('/auth/2fa/enable', { method: 'POST', body: { token: code } })
            if (r.success === false) throw new Error(r.message)
            twofa = await api.api('/auth/2fa/status')
            const codes = document.getElementById('pending-codes').innerHTML
            document.getElementById('security').outerHTML = securityHtml()
            bind()
            document.getElementById('twofa').insertAdjacentHTML('beforeend', codes)
            toast('Two-step sign in is on')
          } catch (e3) {
            errEl.textContent = /invalid/i.test(e3.message) ? 'That code did not match. Codes change every 30 seconds; try the current one.' : e3.message
            errEl.hidden = false
          }
        })
      } catch (e2) {
        toast(e2.message, { tone: 'error' })
        e.target.disabled = false
      }
    }
    if (e.target.id === 'new-codes') {
      try {
        const r = await api.api('/auth/2fa/backup-codes', { method: 'POST' })
        twofa = await api.api('/auth/2fa/status')
        document.getElementById('security').outerHTML = securityHtml()
        bind()
        document.getElementById('twofa').insertAdjacentHTML('beforeend', codesHtml(r.backupCodes || []))
      } catch (e2) {
        toast(e2.message, { tone: 'error' })
      }
    }
    if (e.target.id === 'twofa-off') {
      box.insertAdjacentHTML(
        'beforeend',
        `<form id="twofa-disable" novalidate style="margin-top:16px;display:flex;gap:12px;flex-wrap:wrap;align-items:end">
          <div class="field" style="flex:1;min-width:200px"><label for="off-password">Confirm with your password</label>
          <input class="input" id="off-password" type="password" autocomplete="current-password" required></div>
          <button class="btn" type="submit">Turn off two-step sign in</button></form>`
      )
      e.target.remove()
      document.getElementById('twofa-disable').addEventListener('submit', async ev => {
        ev.preventDefault()
        const password = document.getElementById('off-password').value
        if (!password) return document.getElementById('off-password').focus()
        try {
          const r = await api.api('/auth/2fa/disable', { method: 'POST', body: { password } })
          if (r.success === false) throw new Error(r.message)
          twofa = await api.api('/auth/2fa/status')
          document.getElementById('security').outerHTML = securityHtml()
          bind()
          toast('Two-step sign in is off')
        } catch (e3) {
          toast(/invalid password/i.test(e3.message) ? 'That password is not right.' : e3.message, { tone: 'error' })
        }
      })
    }
  })
}

initShell({ active: 'account' }).then(state => {
  if (!state.me) {
    location.replace('/login.html?next=%2Faccount-settings.html')
    return
  }
  render()
})
