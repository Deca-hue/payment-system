    // Change PIN Modal logic
    function showChangePinModal() {
      document.getElementById('oldPinInput').value = '';
      document.getElementById('newPinInput').value = '';
      document.getElementById('confirmNewPinInput').value = '';
      document.getElementById('changePinMsg').classList.add('hidden');
      document.getElementById('changePinModal').classList.remove('hidden');
    }

    function closeChangePinModal() {
      document.getElementById('changePinModal').classList.add('hidden');
    }

    function saveNewPin() {
      const oldPin = document.getElementById('oldPinInput').value.trim();
      const newPin = document.getElementById('newPinInput').value.trim();
      const confirmPin = document.getElementById('confirmNewPinInput').value.trim();
      const msg = document.getElementById('changePinMsg');
      msg.classList.add('hidden');
      msg.textContent = '';
      if (!oldPin || !newPin || !confirmPin) {
        msg.textContent = 'All fields are required.';
        msg.classList.remove('hidden');
        return;
      }
      if (oldPin !== (user.code || '')) {
        msg.textContent = 'Old PIN is incorrect.';
        msg.classList.remove('hidden');
        return;
      }
      if (newPin.length < 4 || newPin.length > 6) {
        msg.textContent = 'PIN must be 4-6 digits.';
        msg.classList.remove('hidden');
        return;
      }
      if (newPin !== confirmPin) {
        msg.textContent = 'New PINs do not match.';
        msg.classList.remove('hidden');
        return;
      }
      if (newPin === oldPin) {
        msg.textContent = 'New PIN must be different.';
        msg.classList.remove('hidden');
        return;
      }
      user.code = newPin;
      saveUser(user);
      closeChangePinModal();
      showToast('PIN changed successfully');
    }
 /* -------------------------
       Storage & boot
       ------------------------- */
    const CURRENT_USER_KEY = 'currentUser';
    const USERS_PREFIX = 'user_';
    let currentUserPhone = localStorage.getItem(CURRENT_USER_KEY);
    if (!currentUserPhone) {
      window.location.href = 'index.html';
    }

    function genId() { return 'a' + Math.random().toString(36).slice(2,9); }
    function now() { return new Date().toISOString(); }
    function formatCurrency(n) { return 'KES ' + Number(n).toLocaleString(); }
    function shortDate(s) { return new Date(s).toLocaleString(); }

    function loadUser() {
      const raw = localStorage.getItem(USERS_PREFIX + currentUserPhone);
      if (!raw) {
        const alt = localStorage.getItem(currentUserPhone);
        if (alt) {
          const parsed = JSON.parse(alt);
          const user = {
            name: parsed.name || 'User',
            phone: parsed.phone || currentUserPhone,
            code: parsed.code || '',
            accounts: [{
              id: genId(),
              name: 'Main',
              balance: parsed.balance || (parsed.balance === 0 ? 0 : 1000),
              transactions: parsed.transactions || []
            }],
            notifications: parsed.notifications || []
          };
          localStorage.setItem(USERS_PREFIX + currentUserPhone, JSON.stringify(user));
          localStorage.removeItem(currentUserPhone);
          return user;
        } else {
          window.location.href = 'index.html';
        }
      }
      return JSON.parse(raw);
    }

    function saveUser(u) { localStorage.setItem(USERS_PREFIX + currentUserPhone, JSON.stringify(u)); }

    /* -------------------------
       App state
       ------------------------- */
    let user = loadUser();
    if (!user.accounts || !user.accounts.length) {
      user.accounts = [{ id: genId(), name: 'Main', balance: 1000, transactions: [] }];
      saveUser(user);
    }
    let activeAccountId = user.accounts[0].id;
    let pendingAction = null;
    let pendingActionPayload = null; // form data waiting for PIN

    /* -------------------------
       Init UI
       ------------------------- */
    function init() {
      document.getElementById('animatedName').textContent = user.name || 'User';
      document.getElementById('navUserName').textContent = user.name || 'User';
      document.getElementById('avatarInitial').textContent = (user.name||'U').charAt(0).toUpperCase();
      renderAccounts();
      setActiveAccount(activeAccountId);
        renderNotifs(); // Call to render notifications
        document.getElementById('notifBtn').addEventListener('click', function(e) {
          e.stopPropagation();
          toggleNotifDropdown();
        });
      updateNotifBadge();
/* -------------------------
   MOBILE UI SYSTEM (settings, activity, drawer, bottom sheet)
------------------------- */

(function() {
  /* Helpers to show/hide bottom sheet panels */
  function showPanel(rootId, panelId) {
    const root = document.getElementById(rootId);
    const panel = document.getElementById(panelId);
    if (!root || !panel) return;
  // close other mobile sheets and any open action modals so panels don't stack
  if (typeof closeAllMobileSheets === 'function') closeAllMobileSheets();
  if (typeof closeAllActionModals === 'function') closeAllActionModals();
    root.classList.remove('hidden');
    // force reflow then slide up
    requestAnimationFrame(() => panel.classList.remove('translate-y-full', 'translate-x-full'));
    // allow clicking backdrop to close
    const backdrop = root.querySelector('div[id$="Backdrop"], div[id$="backdrop"], .absolute');
    if (backdrop) backdrop.onclick = () => closePanel(rootId, panelId);
  }
  function closePanel(rootId, panelId) {
    const root = document.getElementById(rootId);
    const panel = document.getElementById(panelId);
    if (!root || !panel) return;
    // slide down/back
    if (panelId.toLowerCase().includes('panel') && panel.classList.contains('translate-x-0')) {
      // right drawer
      panel.classList.add('translate-x-full');
    } else {
      panel.classList.add('translate-y-full');
    }
    // hide after transition
    setTimeout(() => root.classList.add('hidden'), 300);
  }

  // Close any mobile sheet panels (activity, settings, drawer, bottom sheet)
  function closeAllMobileSheets() {
    // Immediately hide any mobile sheet roots and ensure panels are translated off-screen
    const ids = ['mobileActivitySheet','mobileSettingsSheet','mobileDrawer','mobileBottomSheet'];
    ids.forEach(id => {
      const root = document.getElementById(id);
      if (!root) return;
      root.classList.add('hidden');
      // map to expected panel id
      let panelId = id === 'mobileDrawer' ? 'mobileDrawerPanel' : (id === 'mobileActivitySheet' ? 'mobileActivityPanel' : (id === 'mobileSettingsSheet' ? 'mobileSettingsPanel' : 'mobileBottomSheetPanel'));
      const panel = document.getElementById(panelId);
      if (!panel) return;
      if (panelId === 'mobileDrawerPanel') panel.classList.add('translate-x-full');
      else panel.classList.add('translate-y-full');
    });
    // extra drawer hide just in case
    if (typeof hideSlideUpDrawer === 'function') hideSlideUpDrawer();
  }

  /* MOBILE SETTINGS */
  window.openMobileSettings = function() {
    // make sure any action modals are closed before opening mobile settings
    if (typeof closeAllActionModals === 'function') closeAllActionModals();
    // fill user info
    document.getElementById('mobileSettingName').textContent = user.name || 'User';
    document.getElementById('mobileSettingPhone').textContent = user.phone || '';
    document.getElementById('mobileSettingAvatar').textContent = (user.name||'U').charAt(0).toUpperCase();
    document.getElementById('mobileThemeSelect').value = localStorage.getItem('ui_theme') || 'default';
    document.getElementById('mobileRecoveryQ').value = user.recovery_q || '';
    document.getElementById('mobileRecoveryA').value = user.recovery_a || '';
    showPanel('mobileSettingsSheet','mobileSettingsPanel');
  };

  window.closeMobileSettings = function() {
    closePanel('mobileSettingsSheet','mobileSettingsPanel');
  };

  window.mobileSavePin = function() {
    const v = (document.getElementById('mobileNewPin').value||'').trim();
    if (!v || v.length < 4) { alert('Enter PIN 4-6 digits'); return; }
    user.code = v;
    saveUser(user);
    showToast('Mobile PIN updated');
    document.getElementById('mobileNewPin').value = '';
  };

  // Save mobile settings (theme & recovery) when closing
  document.getElementById('mobileSettingsBackdrop').addEventListener('click', () => {
    // persist theme & recovery
    const theme = document.getElementById('mobileThemeSelect').value;
    localStorage.setItem('ui_theme', theme);
    applyTheme(theme);
    user.recovery_q = document.getElementById('mobileRecoveryQ').value || '';
    user.recovery_a = document.getElementById('mobileRecoveryA').value.trim() || '';
    saveUser(user);
    closeMobileSettings();
  });

  // mobile delete confirm (quick)
  window.mobileDeleteAccountConfirm = function() {
    const ok = confirm('Delete account? This cannot be undone.');
    if (!ok) return;
    // reuse your delete func
    confirmDeleteAccount();
  };

  /* MOBILE ACTIVITY */
  function createTxCard(tx) {
    const el = document.createElement('div');
    el.className = 'p-3 bg-white rounded-xl shadow-sm border flex items-start gap-3 transform transition-transform duration-150 hover:-translate-y-1';
    const icon = document.createElement('div');
    icon.className = 'w-12 h-12 rounded-lg flex items-center justify-center text-xl';
    icon.textContent = tx.amount < 0 ? '🔻' : '🔺';
    const body = document.createElement('div');
    body.className = 'flex-1';
    const title = document.createElement('div');
    title.className = 'font-semibold text-sm';
    title.textContent = tx.description || tx.type;
    const meta = document.createElement('div');
    meta.className = 'text-xs text-slate-400';
    meta.textContent = shortDate(tx.date);
    const amount = document.createElement('div');
    amount.className = (tx.amount < 0 ? 'text-red-600' : 'text-green-600') + ' font-semibold';
    amount.textContent = (tx.amount < 0 ? '-' : '+') + formatCurrency(Math.abs(tx.amount));
    body.appendChild(title);
    body.appendChild(meta);
    el.appendChild(icon);
    el.appendChild(body);
    el.appendChild(amount);
    el.onclick = () => openTxDetail(tx);
    return el;
  }

  window.openMobileActivity = function() {
    // ensure no action modal is left open under the activity sheet
    if (typeof closeAllActionModals === 'function') closeAllActionModals();
    populateMobileActivity();
    showPanel('mobileActivitySheet','mobileActivityPanel');
  };

  window.closeMobileActivity = function() {
    closePanel('mobileActivitySheet','mobileActivityPanel');
  };

  window.refreshMobileActivity = function() {
    populateMobileActivity(true);
  };

  function populateMobileActivity(animate) {
    const list = document.getElementById('mobileActivityList');
    list.innerHTML = '';
    const acc = user.accounts.find(a=>a.id === activeAccountId);
    if (!acc || !acc.transactions || acc.transactions.length === 0) {
      const el = document.createElement('div');
      el.className = 'p-4 text-slate-500 text-center';
      el.textContent = 'No transactions yet.';
      list.appendChild(el);
      return;
    }
    const items = acc.transactions.slice().reverse();
    items.forEach((tx, i) => {
      const card = createTxCard(tx);
      if (animate) {
        card.style.opacity = 0;
        list.appendChild(card);
        setTimeout(()=> card.style.opacity = 1, 40*i);
      } else list.appendChild(card);
    });
  }

  /* SLIDE-UP DRAWER (right) */
  window.showSlideUpDrawer = function() {
    // ensure no other mobile sheet or action modal is open
    if (typeof closeAllMobileSheets === 'function') closeAllMobileSheets();
    if (typeof closeAllActionModals === 'function') closeAllActionModals();
    const root = document.getElementById('mobileDrawer');
    const pnl = document.getElementById('mobileDrawerPanel');
    root.classList.remove('hidden');
    requestAnimationFrame(()=> pnl.classList.remove('translate-x-full'));
    document.getElementById('mobileDrawerBackdrop').onclick = hideSlideUpDrawer;
  };
  window.hideSlideUpDrawer = function() {
    const pnl = document.getElementById('mobileDrawerPanel');
    pnl.classList.add('translate-x-full');
    setTimeout(()=> document.getElementById('mobileDrawer').classList.add('hidden'), 250);
  };

  /* GENERIC BOTTOM SHEET */
  window.openBottomSheet = function(htmlContent, okCb) {
    // ensure no other mobile sheet or action modal is open
    if (typeof closeAllMobileSheets === 'function') closeAllMobileSheets();
    if (typeof closeAllActionModals === 'function') closeAllActionModals();
    const root = document.getElementById('mobileBottomSheet');
    const panel = document.getElementById('mobileBottomSheetPanel');
    const content = document.getElementById('mobileBottomSheetContent');
    const okBtn = document.getElementById('mobileBottomSheetOk');
    content.innerHTML = htmlContent || '';
    root.classList.remove('hidden');
    requestAnimationFrame(()=> panel.classList.remove('translate-y-full'));
    okBtn.onclick = () => {
      if (typeof okCb === 'function') okCb();
      closeBottomSheet();
    };
    document.getElementById('mobileBottomSheetBackdrop').onclick = closeBottomSheet;
  };
  window.closeBottomSheet = function() {
    const panel = document.getElementById('mobileBottomSheetPanel');
    panel.classList.add('translate-y-full');
    setTimeout(()=> document.getElementById('mobileBottomSheet').classList.add('hidden'), 220);
  };

  /* Wire to Bottom Nav by replacing mobileOpenSettings / mobileShowActivity names expected earlier */
  window.mobileOpenSettings = window.openMobileSettings;
  window.mobileShowActivity = window.openMobileActivity;

  /* Ensure bottom nav uses these new functions (in case nav set previously) */
  const mobileNavBtns = document.querySelectorAll('.nav-btn[data-nav]');
  mobileNavBtns.forEach(btn => {
    btn.removeEventListener && btn.removeEventListener('click', ()=>{}); // no-op safe detach attempt
    btn.addEventListener('click', (e) => {
      const nav = btn.getAttribute('data-nav');
      if (nav === 'settings') {
        // prevent double-run: let existing handler set active; only open mobile settings here
        openMobileSettings();
      }
      if (nav === 'activity') {
        openMobileActivity();
      }
    });
  });

  // accessibility: close sheets with ESC
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeMobileActivity();
      closeMobileSettings();
      hideSlideUpDrawer();
      closeBottomSheet();
    }
  });

  // expose helper for other code
  window.openMobileSettings = openMobileSettings;
  window.closeMobileSettings = closeMobileSettings;
  window.openMobileActivity = openMobileActivity;
  window.closeMobileActivity = closeMobileActivity;
  window.showSlideUpDrawer = showSlideUpDrawer;
  window.hideSlideUpDrawer = hideSlideUpDrawer;
  // expose closeAllMobileSheets so other modules can call it
  window.closeAllMobileSheets = closeAllMobileSheets;

})();
/* ✅ MOBILE NAV FUNCTIONALITY — CLEAN RESET */
(function () {

  const navBtns = document.querySelectorAll(".nav-btn");

  // highlight active nav
  function setActive(nav) {
    navBtns.forEach(b => b.classList.remove("text-indigo-600", "font-semibold"));
    const active = document.querySelector(`[data-nav="${nav}"]`);
    if (active) active.classList.add("text-indigo-600", "font-semibold");
  }

  navBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const nav = btn.getAttribute("data-nav");
      setActive(nav);

      // close any mobile sheets and action modals to avoid stacking
      if (typeof closeAllMobileSheets === 'function') closeAllMobileSheets();
      if (typeof closeAllActionModals === 'function') closeAllActionModals();

      if (nav === "home") window.scrollTo({ top: 0, behavior: "smooth" });
      if (nav === "send") startAction("send");
      if (nav === "activity") openMobileActivity();
      if (nav === "settings") openMobileSettings();
    });
  });

  setActive("home");

})();

    /* -------------------------
   SETTINGS MODAL LOGIC
------------------------- */
function openSettings() {
  // Fill current data
  document.getElementById('set_name').value = user.name;
  document.getElementById('set_phone').value = user.phone;
  document.getElementById('set_pin').value = '';

  document.getElementById('settingsModal').classList.remove('hidden');
}

function closeSettings() {
  document.getElementById('settingsModal').classList.add('hidden');
}

function saveSettings() {
  const newName = document.getElementById('set_name').value.trim();
  const newPhone = document.getElementById('set_phone').value.trim();
  const newPin = document.getElementById('set_pin').value.trim();

  if (!newName || !newPhone) {
    showToast("Name and Phone cannot be empty");
    return;
  }

  // Update user profile
  user.name = newName;
  user.phone = newPhone;

  // Update PIN if entered
  if (newPin && newPin.length >= 4) {
    user.code = newPin;
    showToast("PIN updated successfully");
  }

  saveUser(user);
  init(); // refresh UI
  closeSettings();
  showToast("Settings saved");
}

/* -------------------------
   DARK MODE TOGGLE (simple mock)
------------------------- */

let darkOn = false;

document.getElementById('darkToggle').addEventListener('click', () => {
  darkOn = !darkOn;
  document.getElementById('darkToggle').textContent = darkOn ? 'On' : 'Off';

  if (darkOn) {
    document.body.classList.add('bg-slate-900', 'text-white');
  } else {
    document.body.classList.remove('bg-slate-900', 'text-white');
  }
});

/* -------------------------
   DELETE ACCOUNT LOGIC
------------------------- */

function openDeleteAccountConfirm() {
  document.getElementById('deleteAccountModal').classList.remove('hidden');
}

function closeDeleteAccountConfirm() {
  document.getElementById('deleteAccountModal').classList.add('hidden');
}

function confirmDeleteAccount() {
  localStorage.removeItem(USERS_PREFIX + currentUserPhone);
  localStorage.removeItem(CURRENT_USER_KEY);
  window.location.href = "index.html";
}
/* -------------------------
  USER ENHANCEMENTS MODULE
  - Avatar upload (base64)
  - Security log
  - PIN lockout with attempts
  - Recovery question PIN reset
  - Edit/remove notifications
  - Theme selector & persistence
  - Small transition helper
------------------------- */

const PIN_MAX_ATTEMPTS = 3;
const PIN_LOCK_MINUTES = 10; // lockout duration

/* ---------- AVATAR UPLOAD ---------- */
const avatarInput = document.getElementById('avatarInput');
const avatarPreview = document.getElementById('avatarPreview');
if (avatarInput) {
  avatarInput.addEventListener('change', async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    // limit file size ~300KB to keep base64 small
    if (f.size > 350 * 1024) {
      alert('Please choose a smaller image (max 350KB)');
      return;
    }
    const b64 = await fileToBase64(f);
    // store on user object
    user.avatar = b64;
    saveUser(user);
    avatarPreview.src = b64;
    showToast('Avatar updated');
  });
}
// show existing avatar when settings open - ensure openSettings fills preview:
const origOpenSettings = window.openSettings || openSettings;
function openSettings_withAvatar() {
  origOpenSettings();
  if (user.avatar) avatarPreview.src = user.avatar;
  else avatarPreview.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"></svg>';
  // populate recovery fields
  document.getElementById('recovery_q').value = user.recovery_q || '';
  document.getElementById('recovery_a').value = user.recovery_a || '';
  // theme select
  const currentTheme = localStorage.getItem('ui_theme') || 'default';
  const themeEl = document.getElementById('themeSelect'); if (themeEl) themeEl.value = currentTheme;
}
window.openSettings = openSettings_withAvatar;

/* utility */
function fileToBase64(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

/* ---------- SECURITY LOG on login ---------- */
/* call this from your login routine (after successful login) OR we attach here */
function recordLoginEvent() {
  user.securityLog = user.securityLog || [];
  const ua = navigator.userAgent || 'unknown';
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  const ipHint = 'local'; // no external IP fetch — keep privacy, could call geo API
  const entry = { id: genId(), ts: now(), ua, tz, ipHint };
  user.securityLog.push(entry);
  // keep last 10 entries
  if (user.securityLog.length > 10) user.securityLog = user.securityLog.slice(-10);
  saveUser(user);
}
/* record on init (login time) */
recordLoginEvent();

/* ---------- PIN attempts & lockout ---------- */
function getLockInfo() {
  user.pinAttempts = user.pinAttempts || 0;
  user.pinLockedUntil = user.pinLockedUntil || null;
  saveUser(user);
}
getLockInfo();

function isPinLocked() {
  if (!user.pinLockedUntil) return false;
  const until = new Date(user.pinLockedUntil);
  return new Date() < until;
}

function registerFailedPinAttempt() {
  user.pinAttempts = (user.pinAttempts || 0) + 1;
  if (user.pinAttempts >= PIN_MAX_ATTEMPTS) {
    const until = new Date(Date.now() + PIN_LOCK_MINUTES * 60000);
    user.pinLockedUntil = until.toISOString();
    user.pinAttempts = 0; // reset attempts after lock
    showToast(`Too many attempts — PIN locked until ${until.toLocaleTimeString()}`);
  } else {
    showToast(`Incorrect PIN — ${PIN_MAX_ATTEMPTS - user.pinAttempts} attempts left`);
  }
  saveUser(user);
}

function resetPinAttempts() {
  user.pinAttempts = 0;
  user.pinLockedUntil = null;
  saveUser(user);
}

/* modify verifyPin to consider lockout — wrap the original verifyPin */
const origVerifyPin = window.verifyPin || verifyPin;
function verifyPin_withLock() {
  if (isPinLocked()) {
    const until = new Date(user.pinLockedUntil);
    alert(`PIN locked until ${until.toLocaleString()}`);
    return;
  }
  const v = (document.getElementById('pinInput').value || '').trim();
  if (!v) { showPinMsg('Enter PIN'); return; }
  if (v !== (user.code || '')) {
    registerFailedPinAttempt();
    showPinMsg('Incorrect PIN');
    return;
  }
  // success
  resetPinAttempts();
  // proceed with original action flow
  origVerifyPin();
}
window.verifyPin = verifyPin_withLock;

/* ---------- PIN Recovery via security question ---------- */
function attemptPinRecovery() {
  const q = user.recovery_q;
  if (!q) { alert('No recovery question set. Go to Settings to set one.'); return; }
  const answer = prompt(`Recovery question: ${q}\nEnter the answer:`)?.trim();
  if (!answer) return;
  if (answer === user.recovery_a) {
    const newPin = prompt('Enter new PIN (4-6 digits):')?.trim();
    if (!newPin || newPin.length < 4) { alert('Invalid PIN'); return; }
    user.code = newPin;
    resetPinAttempts();
    saveUser(user);
    showToast('PIN reset successfully');
  } else {
    alert('Incorrect answer');
  }
}
window.attemptPinRecovery = attemptPinRecovery;

/* When saving settings, also store recovery values and avatar (modify saveSettings) */
/* If you used my earlier saveSettings, replace its body with this call: */
function saveSettings() {
  const newName = document.getElementById('set_name').value.trim();
  const newPhone = document.getElementById('set_phone').value.trim();
  const newPin = document.getElementById('set_pin').value.trim();
  const recQ = document.getElementById('recovery_q').value;
  const recA = document.getElementById('recovery_a').value.trim();
  const theme = document.getElementById('themeSelect')?.value || 'default';

  if (!newName || !newPhone) {
    showToast("Name and Phone cannot be empty");
    return;
  }

  // ✅ Save basic info
  user.name = newName;
  user.phone = newPhone;

  // ✅ Save PIN if given
  if (newPin && newPin.length >= 4) {
    user.code = newPin;
    showToast("PIN updated successfully");
  }

  // ✅ Save recovery question & answer
  // VERY IMPORTANT — this is what was missing before
  if (recQ && recA) {
    user.recovery_q = recQ;
    user.recovery_a = recA;
  }

  // ✅ Save theme
  localStorage.setItem('ui_theme', theme);
  applyTheme(theme);

  // ✅ Re-save entire user object
  saveUser(user);

  // ✅ Refresh UI after saving
  init();
  document.getElementById('settingsModal').classList.add('hidden');
  showToast("Settings saved");
}

const saveSettings_enhanced = saveSettings;
window.saveSettings = saveSettings_enhanced;

/* ---------- Edit / Remove Notifications ---------- */
function renderNotifs_withEdit() {
  const listEl = document.getElementById('notificationsList');
  if (!listEl) return;
  if (!user.notifications || user.notifications.length === 0) {
    listEl.textContent = 'No new notifications';
    return;
  }
  listEl.innerHTML = '';
  user.notifications.forEach(n => {
    const row = document.createElement('div');
    row.className = 'flex items-start justify-between gap-2 p-2 rounded hover:bg-slate-50';
    const left = document.createElement('div');
    left.innerHTML = `<div class="font-medium text-sm">${n.text}</div><div class="text-xs text-slate-400">${new Date(n.date||now()).toLocaleString()}</div>`;
    const right = document.createElement('div');
    const viewBtn = document.createElement('button');
    viewBtn.className = 'text-xs text-indigo-600 mr-2';
    viewBtn.textContent = 'View';
    viewBtn.onclick = () => {
      // if this notification relates to a tx id, try to find it
      if (n.txId) {
        // find tx in accounts
        for (const a of user.accounts) {
          const tx = (a.transactions||[]).find(t=>t.id===n.txId);
          if (tx) { openTxDetail(tx); break; }
        }
      } else {
        alert(n.text);
      }
    };
    const delBtn = document.createElement('button');
    delBtn.className = 'text-xs text-red-500';
    delBtn.textContent = 'Delete';
    delBtn.onclick = () => {
      if (!confirm('Delete this notification?')) return;
      user.notifications = user.notifications.filter(x=>x.id !== n.id);
      saveUser(user);
      renderNotifs_withEdit();
      updateNotifBadge();
    };
    right.appendChild(viewBtn); right.appendChild(delBtn);
    row.appendChild(left); row.appendChild(right);
    listEl.appendChild(row);
  });
}
// replace old renderNotifs usage
window.renderNotifs = renderNotifs_withEdit;
renderNotifs_withEdit();

/* ---------- THEME SELECTOR & APPLY ---------- */
function applyTheme(theme) {
  document.body.classList.remove('theme-purple','theme-blue','theme-dark','theme-amoled');
  switch(theme) {
    case 'purple':
      document.body.classList.add('theme-purple');
      break;
    case 'blue':
      document.body.classList.add('theme-blue');
      break;
    case 'dark':
      document.body.classList.add('theme-dark');
      break;
    case 'amoled':
      document.body.classList.add('theme-amoled');
      break;
    default:
      // default style - remove extra classes
      break;
  }
  localStorage.setItem('ui_theme', theme);
}
/* small theme CSS appended via <style> injection for convenience */
(function addThemeStyles(){
  const s = document.createElement('style');
  s.innerHTML = `
  .theme-purple header { background: linear-gradient(90deg,#6d28d9,#7c3aed)!important; color:white;}
  .theme-blue header { background: linear-gradient(90deg,#0ea5e9,#0369a1)!important; color:white;}
  .theme-dark { background: #0b1220 !important; color: #e6eef8 !important; }
  .theme-amoled { background: #000000 !important; color: #d0f0ff !important; }
  `;
  document.head.appendChild(s);
})();
applyTheme(localStorage.getItem('ui_theme') || 'default');

/* ---------- Smooth transition helper (used by slides) ---------- */
function simpleTransition(el, clsAdd, clsRemove) {
  if (!el) return;
  if (clsRemove) el.classList.remove(clsRemove);
  if (clsAdd) el.classList.add(clsAdd);
}
window.simpleTransition = simpleTransition;

/* ---------- expose additional functions globally ---------- */
window.attemptPinRecovery = attemptPinRecovery;
window.registerFailedPinAttempt = registerFailedPinAttempt;
window.resetPinAttempts = resetPinAttempts;
window.applyTheme = applyTheme;
window.openSettings = window.openSettings || openSettings_withAvatar;

/* -------------------------
   EXPOSE SETTINGS FUNCTIONS
------------------------- */
window.openSettings = openSettings;
window.closeSettings = closeSettings;
window.saveSettings = saveSettings;

window.openDeleteAccountConfirm = openDeleteAccountConfirm;
window.closeDeleteAccountConfirm = closeDeleteAccountConfirm;
window.confirmDeleteAccount = confirmDeleteAccount;

      // Notification Dropdown logic
      function toggleNotifDropdown() {
        const dd = document.getElementById('notifDropdown');
        if (dd.classList.contains('hidden')) {
          renderNotifDropdownList();
          dd.classList.remove('hidden');
          setTimeout(() => {
            document.addEventListener('mousedown', notifDropdownOutsideClick);
          }, 0);
        } else {
          dd.classList.add('hidden');
          document.removeEventListener('mousedown', notifDropdownOutsideClick);
        }
      }
    
      function notifDropdownOutsideClick(e) {
        const wrap = document.getElementById('notifDropdownWrap');
        if (!wrap.contains(e.target)) {
          document.getElementById('notifDropdown').classList.add('hidden');
          document.removeEventListener('mousedown', notifDropdownOutsideClick);
        }
      }
    
      function renderNotifDropdownList() {
        const list = document.getElementById('notifDropdownList');
        if (!user.notifications || user.notifications.length === 0) {
          list.innerHTML = '<div class="p-4 text-slate-400 text-center">No new notifications</div>';
        } else {
          // Show most recent first
          const notifs = [...user.notifications].reverse();
          list.innerHTML = notifs.map(n => `<div class="text-sm p-3 border-b last:border-b-0 ${n.important ? 'bg-yellow-50' : ''}">${n.text}</div>`).join('');
        }
      }
      document.getElementById('notifBtn').addEventListener('click', onNotifClicked);
    }
    init();

    /* -------------------------
       Accounts
       ------------------------- */
    function renderAccounts() {
      const container = document.getElementById('accountsList');
      container.innerHTML = '';
      user.accounts.forEach(acc => {
        const active = acc.id === activeAccountId;
        const row = document.createElement('div');
        row.className = `flex items-center justify-between p-2 rounded ${active ? 'bg-indigo-50 border-l-4 border-indigo-600' : 'hover:bg-slate-50'}`;
        row.innerHTML = `
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded bg-indigo-100 text-indigo-700 flex items-center justify-center font-semibold">${(acc.name||'A').charAt(0)}</div>
            <div>
              <div class="text-sm font-medium">${acc.name}</div>
              <div class="text-xs text-slate-500">${formatCurrency(acc.balance)}</div>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <button class="text-xs text-slate-500" onclick="renameAccount('${acc.id}')">Rename</button>
            <button class="text-xs text-red-500" onclick="removeAccount('${acc.id}')">Delete</button>
          </div>
        `;
        row.onclick = (e) => { if (e.target.tagName.toLowerCase() === 'button') return; setActiveAccount(acc.id); };
        container.appendChild(row);
      });
    }

    function setActiveAccount(id) {
      if (!id && user.accounts.length) id = user.accounts[0].id;
      activeAccountId = id;
      saveUser(user);
      const acc = user.accounts.find(a => a.id === activeAccountId);
      if (!acc) return;
      document.getElementById('activeAccountName').textContent = acc.name;
      document.getElementById('activeBalance').textContent = formatCurrency(acc.balance);
      document.getElementById('balanceUpdated').textContent = 'Updated: ' + shortDate(now());
    }

    function showAddAccount() {
      document.getElementById('acctModalTitle').textContent = 'Add Account';
      document.getElementById('acctNameInput').value = '';
      document.getElementById('acctInitInput').value = 0;
      document.getElementById('acctModal').classList.remove('hidden');
      document.getElementById('acctModal').dataset.mode = 'add';
    }
    function renameAccount(id) {
      const acc = user.accounts.find(a => a.id === id);
      document.getElementById('acctModalTitle').textContent = 'Rename Account';
      document.getElementById('acctNameInput').value = acc.name;
      document.getElementById('acctInitInput').value = acc.balance;
      document.getElementById('acctModal').classList.remove('hidden');
      document.getElementById('acctModal').dataset.mode = 'rename';
      document.getElementById('acctModal').dataset.id = id;
    }
    function removeAccount(id) {
      if (!confirm('Delete this account?')) return;
      if (user.accounts.length === 1) { alert('You must have at least one account'); return; }
      user.accounts = user.accounts.filter(a => a.id !== id);
      if (activeAccountId === id) activeAccountId = user.accounts[0].id;
      saveUser(user);
      renderAccounts();
      setActiveAccount(activeAccountId);
    }
    function closeAcctModal() { document.getElementById('acctModal').classList.add('hidden'); }
    function saveAccount() {
      const mode = document.getElementById('acctModal').dataset.mode;
      const name = document.getElementById('acctNameInput').value.trim() || 'Account';
      const init = Number(document.getElementById('acctInitInput').value || 0);
      if (mode === 'add') {
        const newAcc = { id: genId(), name, balance: init, transactions: [] };
        user.accounts.push(newAcc);
        saveUser(user);
        setActiveAccount(newAcc.id);
        closeAcctModal();
      } else {
        const id = document.getElementById('acctModal').dataset.id;
        const acc = user.accounts.find(a => a.id === id);
        acc.name = name;
        acc.balance = init;
        saveUser(user);
        setActiveAccount(id);
        closeAcctModal();
      }
      renderAccounts();
    }

    /* -------------------------
       Notifications & transactions view behavior
       ------------------------- */
    function renderNotifs() {
      const list = document.getElementById('notificationsList');
      if (!user.notifications || user.notifications.length === 0) {
        list.textContent = 'No new notifications';
      } else {
        // Show most recent first
        const notifs = [...user.notifications].reverse();
        list.innerHTML = notifs.map(n => `<div class="text-sm p-2 rounded ${n.important ? 'bg-yellow-50' : ''}">${n.text}</div>`).join('');
      }
    }

    function updateNotifBadge() {
      const b = document.getElementById('notifBadge');
      const bell = document.getElementById('bellIcon');
      const unread = (user.notifications || []).filter(n => !n.read).length;
      if (unread > 0) {
        b.textContent = unread;
        b.classList.remove('hidden');
        bell.classList.add('pulse');
      } else {
        b.classList.add('hidden');
        bell.classList.remove('pulse');
      }
    }

    function onNotifClicked() {
      // mark all read
      (user.notifications || []).forEach(n => n.read = true);
      saveUser(user);
      renderNotifs();
      updateNotifBadge();

      // slide actions out left and notifications in from right
      const actions = document.getElementById('actionsView');
      const notes = document.getElementById('notificationsView');
      actions.classList.remove('slide-in'); actions.classList.add('slide-out-left');
      notes.classList.remove('slide-out-right'); notes.classList.add('slide-in');

      // populate tx list (transactions from active account)
      populateTxContainer();
    }

    function showActionsFromNotif() {
      const actions = document.getElementById('actionsView');
      const notes = document.getElementById('notificationsView');
      notes.classList.remove('slide-in'); notes.classList.add('slide-out-right');
      actions.classList.remove('slide-out-left'); actions.classList.add('slide-in');
    }

    function populateTxContainer() {
      const container = document.getElementById('txContainer');
      container.innerHTML = '';
      const acc = user.accounts.find(a => a.id === activeAccountId);
      if (!acc || !acc.transactions || acc.transactions.length === 0) {
        container.innerHTML = '<p class="text-slate-500">No transactions yet.</p>';
        return;
      }
      const list = acc.transactions.slice().reverse();
      list.forEach(tx => {
        const el = document.createElement('div');
        el.className = 'p-3 border rounded mb-2 cursor-pointer hover:bg-slate-50';
        el.innerHTML = `<div class="flex justify-between items-start">
                          <div>
                            <div class="font-medium">${tx.description || tx.type}</div>
                            <div class="text-xs text-slate-500">${shortDate(tx.date)}</div>
                          </div>
                          <div class="${tx.amount > 0 ? 'text-green-600' : 'text-red-600'} font-medium">${tx.amount>0?'+':''}${formatCurrency(Math.abs(tx.amount))}</div>
                        </div>
                        <div class="text-xs text-slate-400 mt-1">${tx.note || ''}</div>`;
        el.onclick = () => openTxDetail(tx);
        container.appendChild(el);
      });
    }

    function openTxDetail(tx) {
      document.getElementById('txDetailTitle').textContent = tx.description || tx.type;
      document.getElementById('txDetailBody').innerHTML = `
        <div><strong>Amount:</strong> ${formatCurrency(tx.amount)}</div>
        <div><strong>Type:</strong> ${tx.type}</div>
        <div><strong>Date:</strong> ${shortDate(tx.date)}</div>
        <div><strong>To / Details:</strong> ${tx.to || '—'}</div>
        <div><strong>Note:</strong> ${tx.note || '—'}</div>
        <div><strong>Status:</strong> ${tx.status || 'done'}</div>
      `;
      document.getElementById('txDetailModal').classList.remove('hidden');
    }
    function closeTxDetail() { document.getElementById('txDetailModal').classList.add('hidden'); }

    function clearNotifs() {
      user.notifications = [];
      saveUser(user);
      renderNotifs();
      updateNotifBadge();
      // also update/hide dropdown if open
      const dd = document.getElementById('notifDropdown');
      if (dd) {
        dd.classList.add('hidden');
      }
      const list = document.getElementById('notifDropdownList');
      if (list) list.innerHTML = '<div class="p-4 text-slate-400 text-center">No new notifications</div>';
    }
/* -------------------------
       ACTIONS: deposit/send/withdraw
       ------------------------- */
    function requirePinAndOpen(action) {
      pendingAction = action;
      document.getElementById('pinInput').value = '';
      document.getElementById('pinMsg').classList.add('hidden');
      document.getElementById('pinModal').classList.remove('hidden');
    }
    function closePinModal() { document.getElementById('pinModal').classList.add('hidden'); pendingAction = null; }
    function verifyPin() {
      const v = (document.getElementById('pinInput').value || '').trim();
      if (!v) { showPinMsg('Enter PIN'); return; }
      if (v !== (user.code || '')) { showPinMsg('Incorrect PIN'); return; }
      // success: open proper modal
      document.getElementById('pinModal').classList.add('hidden');
      openActionModal(pendingAction);
    }
    function showPinMsg(m) { const el = document.getElementById('pinMsg'); el.textContent = m; el.classList.remove('hidden'); }

    function openActionModal(actionType) {
      pendingAction = actionType;
      document.getElementById('actionModal').classList.remove('hidden');
      document.getElementById('actionTitle').textContent = actionTitle(actionType);
      document.getElementById('recipientField').style.display = actionType === 'deposit' ? 'none' : 'block';
      document.getElementById('amountInput').value = '';
      document.getElementById('noteInput').value = '';
      document.getElementById('recipientInput').value = '';
    }
    function actionTitle(t) {
      if (t === 'send') return 'Send Money';
      if (t === 'withdraw') return 'Withdraw';
      if (t === 'deposit') return 'Deposit';
      return 'Action';
    }
    function closeActionModal() { document.getElementById('actionModal').classList.add('hidden'); pendingAction = null; }

    function openDeposit() {
      pendingAction = 'deposit';
      openActionModal('deposit');
    }

    function confirmAction() {
      const amt = Number(document.getElementById('amountInput').value || 0);
      if (!amt || amt <= 0) { alert('Enter valid amount'); return; }
      const note = document.getElementById('noteInput').value.trim();
      const recipient = document.getElementById('recipientInput').value.trim();

      const acc = user.accounts.find(a => a.id === activeAccountId);
      if (!acc) return;

      if (pendingAction === 'withdraw' || pendingAction === 'send') {
        if (acc.balance < amt) { alert('Insufficient balance'); return; }
        acc.balance -= amt;
      } else if (pendingAction === 'deposit') {
        acc.balance += amt;
      }

      const tx = {
        id: genId(),
        type: pendingAction === 'deposit' ? 'deposit' : (pendingAction === 'send' ? 'send' : 'withdraw'),
        amount: amt,
        note,
        to: recipient || null,
        toName: null,
        date: now(),
        status: 'done'
      };

      // if sending to another account in same user, credit it
      if (pendingAction === 'send' && recipient) {
        // try match account name
        const target = user.accounts.find(a => a.name.toLowerCase() === recipient.toLowerCase());
        if (target) {
          target.balance += amt;
          tx.toName = target.name;
          target.transactions.push({ ...tx, type: 'credit', status: 'done', date: now() });
        } else {
          // if recipient is phone (simulate external) do nothing except note
        }
      }

      acc.transactions.push(tx);
      saveUser(user);
      setActiveAccount(acc.id);
      closeActionModal();
      showToast('Transaction completed');
    }
    /* -------------------------
       Money Action flow: open modal -> proceed -> pin -> process tx
       ------------------------- */
    function startAction(kind) {
      pendingAction = kind;
      pendingActionPayload = null;
      // open respective modal
      // close any mobile sheets so action modal isn't hidden behind them
      if (typeof closeAllMobileSheets === 'function') closeAllMobileSheets();
      closeAllActionModals();
      if (kind === 'bank') document.getElementById('bankModal').classList.remove('hidden');
      else if (kind === 'paypal') document.getElementById('paypalModal').classList.remove('hidden');
      else if (kind === 'agent') document.getElementById('agentModal').classList.remove('hidden');
      else if (kind === 'mpesa') document.getElementById('mpesaModal').classList.remove('hidden');
      else if (kind === 'bills') document.getElementById('billsModal').classList.remove('hidden');
      else if (kind === 'send') document.getElementById('sendModal').classList.remove('hidden');
      else if (kind === 'withdraw') document.getElementById('withdrawModal').classList.remove('hidden');
      else if (kind === 'deposit') document.getElementById('actionModal').classList.remove('hidden');
    }

    function closeAllActionModals() {
      ['bankModal','paypalModal','agentModal','mpesaModal','billsModal','sendModal','withdrawModal'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
      });
    }

    // Called when user presses "Proceed" in a action modal
    function openPinFromModal(kind) {
      // collect form data based on kind
      let payload = { kind, description: '' };
      if (kind === 'bank') {
        payload.bank = document.getElementById('bank_name').value.trim();
        payload.account = document.getElementById('bank_account').value.trim();
        payload.bank_code = document.getElementById('bank_code').value.trim();
        payload.amount = Number(document.getElementById('bank_amount').value || 0);
        payload.note = document.getElementById('bank_note').value.trim();
        payload.description = `Bank transfer to ${payload.bank} ${payload.account}`;
      }
      if (kind === 'paypal') {
        payload.email = document.getElementById('paypal_email').value.trim();
        payload.amount = Number(document.getElementById('paypal_amount').value || 0);
        payload.note = document.getElementById('paypal_note').value.trim();
        payload.description = `PayPal transfer to ${payload.email}`;
      }
      if (kind === 'agent') {
        const sel = document.getElementById('agent_select').value;
        payload.agent = sel ? sel.split('|')[0] : '';
        payload.agentName = sel ? sel.split('|')[1] : '';
        payload.amount = Number(document.getElementById('agent_amount').value || 0);
        payload.recipient = document.getElementById('agent_name').value.trim();
        payload.description = `Withdraw at agent ${payload.agent} ${payload.agentName}`;
      }
      if (kind === 'mpesa') {
        payload.business = document.getElementById('mpesa_biz').value.trim();
        payload.ref = document.getElementById('mpesa_ref').value.trim();
        payload.amount = Number(document.getElementById('mpesa_amount').value || 0);
        payload.description = `Lipa na M-Pesa to ${payload.business}`;
      }
      if (kind === 'bills') {
        payload.billType = document.getElementById('bill_type').value;
        payload.ref = document.getElementById('bill_ref').value.trim();
        payload.amount = Number(document.getElementById('bill_amount').value || 0);
        payload.description = `Bill payment: ${payload.billType}`;
      }
      // send (quick) modal
      if (kind === 'send') {
        payload.recipient = document.getElementById('send_recipient').value.trim();
        payload.amount = Number(document.getElementById('send_amount').value || 0);
        payload.note = document.getElementById('send_note').value.trim();
        payload.description = `Send to ${payload.recipient}`;
      }
      // withdraw (quick) modal
      if (kind === 'withdraw') {
        payload.target = document.getElementById('withdraw_target').value.trim();
        payload.amount = Number(document.getElementById('withdraw_amount').value || 0);
        payload.note = document.getElementById('withdraw_note').value.trim();
        payload.description = `Withdraw to ${payload.target}`;
      }

      // basic validation
      if (!payload.amount || payload.amount <= 0) { alert('Enter valid amount'); return; }
      // stash and show PIN modal
      pendingActionPayload = payload;
      closeAllActionModals();
      document.getElementById('pinInput').value = '';
      document.getElementById('pinMsg').classList.add('hidden');
      document.getElementById('pinModal').classList.remove('hidden');
    }

    function cancelPin() {
      document.getElementById('pinModal').classList.add('hidden');
      pendingAction = null;
      pendingActionPayload = null;
    }

    function verifyPin() {
      const v = (document.getElementById('pinInput').value || '').trim();
      if (!v) { showPinMsg('Enter PIN'); return; }
      if (v !== (user.code || '')) { showPinMsg('Incorrect PIN'); return; }

      // PIN ok -> process transaction
      document.getElementById('pinModal').classList.add('hidden');
      processPendingAction();
    }

    function showPinMsg(m) {
      const el = document.getElementById('pinMsg');
      el.textContent = m;
      el.classList.remove('hidden');
      document.getElementById('pinBox').style.animation = 'shake 300ms';
      setTimeout(()=> document.getElementById('pinBox').style.animation = '', 300);
    }

    function processPendingAction() {
      if (!pendingAction || !pendingActionPayload) return;
      const kind = pendingAction;
      const p = pendingActionPayload;
      const acc = user.accounts.find(a => a.id === activeAccountId);
      if (!acc) return;

      // simulate different flows; STK mock shows a short loader
      if (kind === 'mpesa') {
        // show simple loader in modal style
        showToast('Sending STK push... (mock)');
        setTimeout(() => finalizeTx(-p.amount, p, 'mpesa'), 1400);
      } else {
        // immediate process
        finalizeTx(-p.amount, p, kind);
      }
    }

    function finalizeTx(amountSigned, payload, kind) {
      const acc = user.accounts.find(a => a.id === activeAccountId);
      if (!acc) return;
      const amt = Math.abs(Number(payload.amount || 0));
      if (acc.balance < amt) { alert('Insufficient balance'); pendingAction = null; pendingActionPayload = null; return; }

      // create tx
      acc.balance = Math.round((acc.balance - amt) * 100) / 100;
      let txType = kind;
      if (kind === 'mpesa') txType = 'mpesa';
      else if (kind === 'agent' || kind === 'withdraw') txType = 'withdraw';
      else if (kind === 'bills') txType = 'bill';
      else if (kind === 'bank') txType = 'bank';
      else if (kind === 'paypal') txType = 'paypal';
      else if (kind === 'send') txType = 'send';

      const tx = {
        id: genId(),
        type: txType,
        description: payload.description || kind,
        amount: -amt,
        note: payload.note || payload.ref || '',
        to: payload.email || payload.account || payload.agent || payload.business || payload.ref || payload.recipient || payload.target || '',
        date: now(),
        status: 'done'
      };
      acc.transactions = acc.transactions || [];
      acc.transactions.push(tx);

      // create notification (incoming/outgoing)
      const notifText = (() => {
        if (kind === 'mpesa') return `M-Pesa payment of ${formatCurrency(amt)} initiated (mock)`;
        if (kind === 'agent' || kind === 'withdraw') return `Withdrawal ${formatCurrency(amt)} requested at ${payload.agentName || payload.agent || payload.target}`;
        if (kind === 'bank') return `Bank transfer ${formatCurrency(amt)} to ${payload.bank} ${payload.account}`;
        if (kind === 'paypal') return `PayPal transfer ${formatCurrency(amt)} to ${payload.email}`;
        if (kind === 'bills') return `Bill paid ${formatCurrency(amt)} — ${payload.billType}`;
        if (kind === 'send') return `Sent ${formatCurrency(amt)} to ${payload.recipient}`;
        return `Transaction: ${formatCurrency(amt)}`;
      })();

      user.notifications = user.notifications || [];
      user.notifications.push({ id: genId(), text: notifText, read: false, date: now() });

      saveUser(user);
      setActiveAccount(acc.id);
      renderNotifs();
      updateNotifBadge();

      // reset pending
      pendingAction = null; pendingActionPayload = null;

      showToast('Transaction successful');
    }

    /* -------------------------
       Small UI helpers & toast
       ------------------------- */
    function showToast(msg) {
      const wrap = document.getElementById('toastWrap');
      const el = document.createElement('div');
      el.className = 'bg-black text-white px-4 py-2 rounded shadow mb-2';
      el.textContent = msg;
      wrap.appendChild(el);
      setTimeout(()=> el.classList.add('opacity-0'), 2000);
      setTimeout(()=> el.remove(), 2600);
    }

  function openQrMock() { startAction('mpesa'); }
  function openBills() { startAction('bills'); }
  function openSupport() { alert('Support: demo@moneyapp.example'); } // can replace with modal later

    function logout() {
      localStorage.removeItem(CURRENT_USER_KEY);
      window.location.href = 'index.html';
    }

    /* -------------------------
       seed sample notifications if none
       ------------------------- */
    if (!user.notifications) user.notifications = [];
    if (user.notifications.length === 0) {
      user.notifications.push({ id: genId(), text: 'You received KES 500 from Alice', read: false, important: false, date: now() });
      user.notifications.push({ id: genId(), text: 'Security: New device login detected', read: false, important: true, date: now() });
      saveUser(user);
    }
    updateNotifBadge();
    renderNotifs();

    /* -------------------------
       Expose some functions globally for buttons
       ------------------------- */
  window.startAction = startAction;
  window.openPinFromModal = openPinFromModal;
  window.closeAllActionModals = closeAllActionModals;
  // keep any previously-wrapped verifyPin (lock wrapper) if present
  window.verifyPin = window.verifyPin || verifyPin;
  window.cancelPin = cancelPin;
  window.closeTxDetail = closeTxDetail;
  window.showAddAccount = showAddAccount;
  window.saveAccount = saveAccount;
  window.closeAcctModal = closeAcctModal;
  window.renameAccount = renameAccount;
  window.removeAccount = removeAccount;
  window.showChangePinModal = showChangePinModal;
  window.closeChangePinModal = closeChangePinModal;
  window.saveNewPin = saveNewPin;
  window.clearNotifs = clearNotifs;
  // expose settings & delete account functions
  // preserve enhanced versions (avatar/recovery/theme) if already set
  window.openSettings = window.openSettings || openSettings;
  window.closeSettings = window.closeSettings || closeSettings;
  window.saveSettings = window.saveSettings || saveSettings;
  window.openDeleteAccountConfirm = openDeleteAccountConfirm;
  window.closeDeleteAccountConfirm = closeDeleteAccountConfirm;
  window.confirmDeleteAccount = confirmDeleteAccount;
