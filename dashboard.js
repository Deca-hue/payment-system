// dashboard.js - Complete and Fixed Version

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

function saveUser(u) { 
  localStorage.setItem(USERS_PREFIX + currentUserPhone, JSON.stringify(u)); 
}

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
let pendingActionPayload = null;

/* -------------------------
   Change PIN Modal logic
------------------------- */
function showChangePinModal() {
  document.getElementById('oldPinInput').value = '';
  document.getElementById('newPinInput').value = '';
  document.getElementById('confirmNewPinInput').value = '';
  document.getElementById('changePinMsg').classList.add('hidden');
  document.getElementById('changePinModal').classList.remove('hidden');

  const sheet = document.getElementById('mobileSettingsSheet');
  if (sheet) sheet.classList.add('hidden');
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
   Accounts Management
------------------------- */
function renderAccounts() {
  const container = document.getElementById('accountsList');
  if (!container) return;
  
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
    row.onclick = (e) => { 
      if (e.target.tagName.toLowerCase() === 'button') return; 
      setActiveAccount(acc.id); 
      // additionally hide drawer on mobile when selecting account
      if (typeof hideSlideUpDrawer === 'function') hideSlideUpDrawer();
    };
    container.appendChild(row);
  });
}

function setActiveAccount(id) {
  if (!id && user.accounts.length) id = user.accounts[0].id;
  activeAccountId = id;
  saveUser(user);
  const acc = user.accounts.find(a => a.id === activeAccountId);
  if (!acc) return;
  
  const activeAccountName = document.getElementById('activeAccountName');
  const activeBalance = document.getElementById('activeBalance');
  const balanceUpdated = document.getElementById('balanceUpdated');
  
  if (activeAccountName) activeAccountName.textContent = acc.name;
  if (activeBalance) activeBalance.textContent = formatCurrency(acc.balance);
  if (balanceUpdated) balanceUpdated.textContent = 'Updated: ' + shortDate(now());
}

function showAddAccount() {
  document.getElementById('acctModalTitle').textContent = 'Add Account';
  document.getElementById('acctNameInput').value = '';
  document.getElementById('acctInitInput').value = 0;
  document.getElementById('acctInitInput').disabled = false;
  document.getElementById('acctModal').classList.remove('hidden');
  document.getElementById('acctModal').dataset.mode = 'add';
}

function renameAccount(id) {
  const acc = user.accounts.find(a => a.id === id);
  document.getElementById('acctModalTitle').textContent = 'Rename Account';
  document.getElementById('acctNameInput').value = acc.name;
  document.getElementById('acctInitInput').value = acc.balance;
  document.getElementById('acctInitInput').disabled = true;
  document.getElementById('acctModal').classList.remove('hidden');
  document.getElementById('acctModal').dataset.mode = 'rename';
  document.getElementById('acctModal').dataset.id = id;
}

function removeAccount(id) {
  if (user.accounts.length === 1) { 
    alert('You must have at least one account'); 
    return; 
  }
  if (id !== user.accounts[0].id) {
    if (!confirm('Deleting this account funds will not be credited back to main.\nAre you sure you want to delete this account?')) return;
  } else {
    if (!confirm('Delete this account?')) return;
  }
  user.accounts = user.accounts.filter(a => a.id !== id);
  if (activeAccountId === id) activeAccountId = user.accounts[0].id;
  saveUser(user);
  renderAccounts();
  setActiveAccount(activeAccountId);
}

function closeAcctModal() { 
  document.getElementById('acctModal').classList.add('hidden'); 
}

function saveAccount() {
  const mode = document.getElementById('acctModal').dataset.mode;
  const name = document.getElementById('acctNameInput').value.trim() || 'Account';
  const init = Number(document.getElementById('acctInitInput').value || 0);
  
  if (mode === 'add') {
    const mainAcc = user.accounts[0];
    if (init > mainAcc.balance) {
      alert('Insufficient funds in main account for this initial balance.');
      return;
    }
    mainAcc.balance -= init;
    const newAcc = { id: genId(), name, balance: init, transactions: [] };
    user.accounts.push(newAcc);
    saveUser(user);
    setActiveAccount(newAcc.id);
    closeAcctModal();
  } else if (mode === 'rename') {
    const id = document.getElementById('acctModal').dataset.id;
    const acc = user.accounts.find(a => a.id === id);
    if (acc) {
      acc.name = name;
      saveUser(user);
      renderAccounts();
      setActiveAccount(activeAccountId);
    }
    closeAcctModal();
  }
}

/* -------------------------
   Notifications & Transactions
------------------------- */
function renderNotifs() {
  const list = document.getElementById('notificationsList');
  if (!list) return;
  
  if (!user.notifications || user.notifications.length === 0) {
    list.textContent = 'No new notifications';
  } else {
    const notifs = [...user.notifications].reverse();
    list.innerHTML = notifs.map(n => `<div class="text-sm p-2 rounded ${n.important ? 'bg-yellow-50' : ''}">${n.text}</div>`).join('');
  }
}

function updateNotifBadge() {
  const b = document.getElementById('notifBadge');
  const bell = document.getElementById('bellIcon');
  if (!b || !bell) return;
  
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
  if (!list) return;
  
  if (!user.notifications || user.notifications.length === 0) {
    list.innerHTML = '<div class="p-4 text-slate-400 text-center">No new notifications</div>';
  } else {
    const notifs = [...user.notifications].reverse();
    list.innerHTML = notifs.map(n => `<div class="text-sm p-3 border-b last:border-b-0 ${n.important ? 'bg-yellow-50' : ''}">${n.text}</div>`).join('');
  }
}

function clearNotifs() {
  user.notifications = [];
  saveUser(user);
  renderNotifs();
  updateNotifBadge();
  
  const dd = document.getElementById('notifDropdown');
  if (dd) {
    dd.classList.add('hidden');
  }
  const list = document.getElementById('notifDropdownList');
  if (list) list.innerHTML = '<div class="p-4 text-slate-400 text-center">No new notifications</div>';
}

function populateTxContainer() {
  const container = document.getElementById('txContainer');
  if (!container) return;
  
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

function closeTxDetail() { 
  document.getElementById('txDetailModal').classList.add('hidden'); 
}

/* -------------------------
   Action Modals & PIN Flow
------------------------- */
function startAction(kind) {
  pendingAction = kind;
  pendingActionPayload = null;
  
  if (typeof closeAllMobileSheets === 'function') closeAllMobileSheets();
  closeAllActionModals();
  
  if (kind === 'bank') document.getElementById('bankModal').classList.remove('hidden');
  else if (kind === 'paypal') document.getElementById('paypalModal').classList.remove('hidden');
  else if (kind === 'agent') document.getElementById('agentModal').classList.remove('hidden');
  else if (kind === 'mpesa') document.getElementById('mpesaModal').classList.remove('hidden');
  else if (kind === 'bills') document.getElementById('billsModal').classList.remove('hidden');
  else if (kind === 'send') document.getElementById('sendModal').classList.remove('hidden');
  else if (kind === 'withdraw') document.getElementById('withdrawModal').classList.remove('hidden');
  else if (kind === 'deposit') document.getElementById('depositSourceModal').classList.remove('hidden');
  else if (kind === 'topup') {
    // Prefill phone in Top Up modal from current user and open
    const phoneEl = document.getElementById('topup_phone');
    if (phoneEl) phoneEl.value = user.phone || '';
    const topEl = document.getElementById('topUpModal');
    if (topEl) topEl.classList.remove('hidden');
  }
}

function closeAllActionModals() {
  ['bankModal','paypalModal','agentModal','mpesaModal','billsModal','sendModal','withdrawModal','actionModal','depositSourceModal','airtelModal','topUpModal'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  });
}

function openPinFromModal(kind) {
  let payload = { kind, description: '' };
  
  if (kind === 'bank') {
    payload.bank = document.getElementById('bank_name').value.trim();
    payload.account = document.getElementById('bank_account').value.trim();
    payload.bank_code = document.getElementById('bank_code').value.trim();
    payload.amount = Number(document.getElementById('bank_amount').value || 0);
    payload.note = document.getElementById('bank_note').value.trim();
    payload.description = `Bank transfer to ${payload.bank} ${payload.account}`;
  }
  else if (kind === 'paypal') {
    payload.email = document.getElementById('paypal_email').value.trim();
    payload.amount = Number(document.getElementById('paypal_amount').value || 0);
    payload.note = document.getElementById('paypal_note').value.trim();
    payload.description = `PayPal transfer to ${payload.email}`;
  }
  else if (kind === 'agent') {
    const sel = document.getElementById('agent_select').value;
    payload.agent = sel ? sel.split('|')[0] : '';
    payload.agentName = sel ? sel.split('|')[1] : '';
    payload.amount = Number(document.getElementById('agent_amount').value || 0);
    payload.recipient = document.getElementById('agent_name').value.trim();
    payload.description = `Withdraw at agent ${payload.agent} ${payload.agentName}`;
  }
  else if (kind === 'mpesa') {
    payload.business = document.getElementById('mpesa_biz').value.trim();
    payload.ref = document.getElementById('mpesa_ref').value.trim();
    payload.amount = Number(document.getElementById('mpesa_amount').value || 0);
    payload.description = `Lipa na M-Pesa to ${payload.business}`;
  }
  else if (kind === 'bills') {
    payload.billType = document.getElementById('bill_type').value;
    payload.ref = document.getElementById('bill_ref').value.trim();
    payload.amount = Number(document.getElementById('bill_amount').value || 0);
    payload.description = `Bill payment: ${payload.billType}`;
  }
  else if (kind === 'send') {
    payload.recipient = document.getElementById('send_recipient').value.trim();
    payload.amount = Number(document.getElementById('send_amount').value || 0);
    payload.note = document.getElementById('send_note').value.trim();
    payload.description = `Send to ${payload.recipient}`;
  }
  else if (kind === 'withdraw') {
    payload.target = document.getElementById('withdraw_target').value.trim();
    payload.amount = Number(document.getElementById('withdraw_amount').value || 0);
    payload.note = document.getElementById('withdraw_note').value.trim();
    payload.description = `Withdraw to ${payload.target}`;
  }
  else if (kind === 'deposit') {
    payload.amount = Number(document.getElementById('amountInput').value || 0);
    payload.note = document.getElementById('noteInput').value.trim();
    payload.description = `Deposit`;
  }

  else if (kind === 'topup') {
    payload.amount = Number(document.getElementById('topup_amount').value || 0);
    payload.note = document.getElementById('topup_note').value.trim();
    payload.method = document.getElementById('topup_method') ? document.getElementById('topup_method').value : '';
    payload.phone = document.getElementById('topup_phone') ? document.getElementById('topup_phone').value.trim() : '';
    payload.description = `Top Up${payload.method ? ' — ' + payload.method.toUpperCase() : ''}`;
  }

  if (!payload.amount || payload.amount <= 0) { 
    alert('Enter valid amount'); 
    return; 
  }
  
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
  if (!v) { 
    showPinMsg('Enter PIN'); 
    return; 
  }
  if (v !== (user.code || '')) { 
    showPinMsg('Incorrect PIN'); 
    return; 
  }

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

  if (kind === 'mpesa') {
    showToast('Sending STK push... (mock)');
    setTimeout(() => finalizeTx(-p.amount, p, 'mpesa'), 1400);
  } else if (kind === 'topup') {
    // top-up adds funds (incoming)
    finalizeTx(Number(p.amount), p, 'topup');
  } else {
    finalizeTx(-p.amount, p, kind);
  }
}

function finalizeTx(amountSigned, payload, kind) {
  const acc = user.accounts.find(a => a.id === activeAccountId);
  if (!acc) return;
  const amt = Math.abs(Number(payload.amount || 0));
  
  if (amountSigned < 0 && acc.balance < amt) { 
    alert('Insufficient balance'); 
    pendingAction = null; 
    pendingActionPayload = null; 
    return; 
  }

  acc.balance = Math.round((acc.balance + amountSigned) * 100) / 100;
  
  let txType = kind;
  if (kind === 'mpesa') txType = 'mpesa';
  else if (kind === 'agent' || kind === 'withdraw') txType = 'withdraw';
  else if (kind === 'bills') txType = 'bill';
  else if (kind === 'bank') txType = 'bank';
  else if (kind === 'paypal') txType = 'paypal';
  else if (kind === 'send') txType = 'send';
  else if (kind === 'deposit' || kind === 'topup') txType = 'deposit';

  const tx = {
    id: genId(),
    type: txType,
    description: payload.description || kind,
    amount: amountSigned,
    note: payload.note || payload.ref || '',
    to: payload.email || payload.account || payload.agent || payload.business || payload.ref || payload.recipient || payload.target || '',
    date: now(),
    status: 'done'
  };
  
  acc.transactions = acc.transactions || [];
  acc.transactions.push(tx);

  const notifText = (() => {
    if (kind === 'mpesa') return `M-Pesa payment of ${formatCurrency(amt)} initiated (mock)`;
    if (kind === 'agent' || kind === 'withdraw') return `Withdrawal ${formatCurrency(amt)} requested at ${payload.agentName || payload.agent || payload.target}`;
    if (kind === 'bank') return `Bank transfer ${formatCurrency(amt)} to ${payload.bank} ${payload.account}`;
    if (kind === 'paypal') return `PayPal transfer ${formatCurrency(amt)} to ${payload.email}`;
    if (kind === 'bills') return `Bill paid ${formatCurrency(amt)} — ${payload.billType}`;
    if (kind === 'send') return `Sent ${formatCurrency(amt)} to ${payload.recipient}`;
    if (kind === 'deposit') return `Deposit ${formatCurrency(amt)} received`;
    if (kind === 'topup') return `Top up ${formatCurrency(amt)} received${payload.method ? ' via ' + payload.method.toUpperCase() : ''}`;
    return `Transaction: ${formatCurrency(amt)}`;
  })();

  user.notifications = user.notifications || [];
  user.notifications.push({ id: genId(), text: notifText, read: false, date: now() });

  saveUser(user);
  setActiveAccount(acc.id);
  renderNotifs();
  updateNotifBadge();

  pendingAction = null; 
  pendingActionPayload = null;
  showToast('Transaction successful');

  // If this was a top-up, clear the top-up modal fields and ensure modal is closed
  if (kind === 'topup') {
    const phoneEl = document.getElementById('topup_phone'); if (phoneEl) phoneEl.value = '';
    const amtEl = document.getElementById('topup_amount'); if (amtEl) amtEl.value = '';
    const noteEl = document.getElementById('topup_note'); if (noteEl) noteEl.value = '';
    const methodEl = document.getElementById('topup_method'); if (methodEl) methodEl.selectedIndex = 0;
    const topEl = document.getElementById('topUpModal'); if (topEl) topEl.classList.add('hidden');
  }
}

/* -------------------------
   Settings Modal
------------------------- */
function openSettings() {
  document.getElementById('set_name').value = user.name;
  document.getElementById('set_phone').value = user.phone;
  document.getElementById('set_pin').value = '';
  
  if (user.avatar) {
    document.getElementById('avatarPreview').src = user.avatar;
  }
  
  document.getElementById('recovery_q').value = user.recovery_q || '';
  document.getElementById('recovery_a').value = user.recovery_a || '';
  
  const currentTheme = localStorage.getItem('ui_theme') || 'default';
  const themeEl = document.getElementById('themeSelect'); 
  if (themeEl) themeEl.value = currentTheme;
  
  document.getElementById('settingsModal').classList.remove('hidden');
}

function closeSettings() {
  document.getElementById('settingsModal').classList.add('hidden');
}

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

  if (newPhone !== user.phone) {
    showToast("Sorry, you can't change your phone number.");
    document.getElementById('set_phone').value = user.phone;
    return;
  }

  user.name = newName;
  user.phone = newPhone;

  if (newPin && newPin.length >= 4) {
    user.code = newPin;
  }

  if (recQ && recA) {
    user.recovery_q = recQ;
    user.recovery_a = recA;
  }

  localStorage.setItem('ui_theme', theme);
  applyTheme(theme);

  saveUser(user);
  init();
  closeSettings();
  showToast("Settings saved");
}

/* -------------------------
   Delete Account
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
   Theme System
------------------------- */
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
      break;
  }
  localStorage.setItem('ui_theme', theme);
}

/* -------------------------
   Mobile UI System
------------------------- */
(function() {
  function showPanel(rootId, panelId) {
    const root = document.getElementById(rootId);
    const panel = document.getElementById(panelId);
    if (!root || !panel) return;
    
    if (typeof closeAllMobileSheets === 'function') closeAllMobileSheets();
    if (typeof closeAllActionModals === 'function') closeAllActionModals();
    
    root.classList.remove('hidden');
    requestAnimationFrame(() => panel.classList.remove('translate-y-full', 'translate-x-full'));
    
    const backdrop = root.querySelector('div[id$="Backdrop"], div[id$="backdrop"], .absolute');
    if (backdrop) backdrop.onclick = () => closePanel(rootId, panelId);
  }
  
  function closePanel(rootId, panelId) {
    const root = document.getElementById(rootId);
    const panel = document.getElementById(panelId);
    if (!root || !panel) return;
    
    if (panelId.toLowerCase().includes('panel') && panel.classList.contains('translate-x-0')) {
      panel.classList.add('translate-x-full');
    } else {
      panel.classList.add('translate-y-full');
    }
    
    setTimeout(() => root.classList.add('hidden'), 300);
  }

  function closeAllMobileSheets() {
    const ids = ['mobileActivitySheet','mobileSettingsSheet','mobileDrawer','mobileBottomSheet'];
    ids.forEach(id => {
      const root = document.getElementById(id);
      if (!root) return;
      root.classList.add('hidden');
      
      let panelId = id === 'mobileDrawer' ? 'mobileDrawerPanel' : 
                   (id === 'mobileActivitySheet' ? 'mobileActivityPanel' : 
                   (id === 'mobileSettingsSheet' ? 'mobileSettingsPanel' : 'mobileBottomSheetPanel'));
      const panel = document.getElementById(panelId);
      if (!panel) return;
      
      if (panelId === 'mobileDrawerPanel') panel.classList.add('translate-x-full');
      else panel.classList.add('translate-y-full');
    });
    
    if (typeof hideSlideUpDrawer === 'function') hideSlideUpDrawer();
  }

  window.openMobileSettings = function() {
    if (typeof closeAllActionModals === 'function') closeAllActionModals();
    document.getElementById('mobileSettingName').textContent = user.name || 'User';
    document.getElementById('mobileSettingPhone').textContent = user.phone || '';
    
    const avatarEl = document.getElementById('mobileSettingAvatar');
    if (user.avatar) {
      avatarEl.innerHTML = `<img src="${user.avatar}" class="w-full h-full rounded-full object-cover" />`;
    } else {
      avatarEl.textContent = (user.name||'U').charAt(0).toUpperCase();
    }
    
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

  document.getElementById('mobileSettingsBackdrop').addEventListener('click', () => {
    const theme = document.getElementById('mobileThemeSelect').value;
    localStorage.setItem('ui_theme', theme);
    applyTheme(theme);
    user.recovery_q = document.getElementById('mobileRecoveryQ').value || '';
    user.recovery_a = document.getElementById('mobileRecoveryA').value.trim() || '';
    saveUser(user);
    closeMobileSettings();
  });

  window.mobileDeleteAccountConfirm = function() {
    const ok = confirm('Delete account? This cannot be undone.');
    if (!ok) return;
    confirmDeleteAccount();
  };

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
    if (!list) return;
    
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

  window.showSlideUpDrawer = function() {
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

  window.openBottomSheet = function(htmlContent, okCb) {
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

  window.mobileOpenSettings = window.openMobileSettings;
  window.mobileShowActivity = window.openMobileActivity;

  const mobileNavBtns = document.querySelectorAll('.nav-btn[data-nav]');
  mobileNavBtns.forEach(btn => {
    btn.removeEventListener && btn.removeEventListener('click', ()=>{});
    btn.addEventListener('click', (e) => {
      const nav = btn.getAttribute('data-nav');
      if (nav === 'settings') {
        openMobileSettings();
      }
      if (nav === 'activity') {
        openMobileActivity();
      }
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeMobileActivity();
      closeMobileSettings();
      hideSlideUpDrawer();
      closeBottomSheet();
    }
  });

  window.closeAllMobileSheets = closeAllMobileSheets;
})();

/* -------------------------
   Mobile Navigation
------------------------- */
(function () {
  const navBtns = document.querySelectorAll(".nav-btn");

  function setActive(nav) {
    navBtns.forEach(b => b.classList.remove("text-indigo-600", "font-semibold"));
    const active = document.querySelector(`[data-nav="${nav}"]`);
    if (active) active.classList.add("text-indigo-600", "font-semibold");
  }

  navBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const nav = btn.getAttribute("data-nav");
      setActive(nav);

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
   Avatar Upload
------------------------- */
const avatarInput = document.getElementById('avatarInput');
const avatarPreview = document.getElementById('avatarPreview');
if (avatarInput) {
  avatarInput.addEventListener('change', async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > 350 * 1024) {
      alert('Please choose a smaller image (max 350KB)');
      return;
    }
    const b64 = await fileToBase64(f);
    user.avatar = b64;
    saveUser(user);
    avatarPreview.src = b64;
    showToast('Avatar updated');
  });
}

function fileToBase64(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

/* -------------------------
   Toast Function
------------------------- */
function showToast(msg) {
  const wrap = document.getElementById('toastWrap');
  if (!wrap) return;
  
  const el = document.createElement('div');
  el.className = 'bg-black text-white px-4 py-2 rounded shadow mb-2';
  el.textContent = msg;
  wrap.appendChild(el);
  setTimeout(()=> el.classList.add('opacity-0'), 2000);
  setTimeout(()=> el.remove(), 2600);
}

/* -------------------------
   Utility Functions
------------------------- */
function openQrMock() { startAction('mpesa'); }
function openBills() { startAction('bills'); }
function openSupport() { alert('Support: demo@moneyapp.example'); }

function logout() {
  localStorage.removeItem(CURRENT_USER_KEY);
  window.location.href = 'index.html';
}

/* -------------------------
   Initialize App
------------------------- */
function init() {
  document.getElementById('animatedName').textContent = user.name || 'User';
  document.getElementById('navUserName').textContent = user.name || 'User';
  document.getElementById('avatarInitial').textContent = (user.name||'U').charAt(0).toUpperCase();
  
  renderAccounts();
  renderMobileAccounts();
  setActiveAccount(activeAccountId);
  renderNotifs();
  
  const notifBtn = document.getElementById('notifBtn');
  if (notifBtn) {
    notifBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      toggleNotifDropdown();
    });
  }

  // Add event listeners for action modal buttons
  const confirmActionBtn = document.getElementById('confirmActionBtn');
  if (confirmActionBtn) {
    confirmActionBtn.addEventListener('click', () => {
      if (pendingAction) {
        openPinFromModal(pendingAction);
      }
    });
  }

  const closeActionModalBtn = document.getElementById('closeActionModalBtn');
  if (closeActionModalBtn) {
    closeActionModalBtn.addEventListener('click', () => {
      closeAllActionModals();
    });
  }

  // Deposit source buttons (from depositSourceModal)
  const depositMpesaBtn = document.getElementById('depositMpesaBtn');
  if (depositMpesaBtn) {
    depositMpesaBtn.addEventListener('click', () => {
      closeAllActionModals();
      const el = document.getElementById('mpesaModal');
      if (el) el.classList.remove('hidden');
    });
  }

  const depositAirtelBtn = document.getElementById('depositAirtelBtn');
  if (depositAirtelBtn) {
    depositAirtelBtn.addEventListener('click', () => {
      closeAllActionModals();
      const el = document.getElementById('airtelModal');
      if (el) el.classList.remove('hidden');
    });
  }

  const depositBankBtn = document.getElementById('depositBankBtn');
  if (depositBankBtn) {
    depositBankBtn.addEventListener('click', () => {
      closeAllActionModals();
      const el = document.getElementById('bankModal');
      if (el) el.classList.remove('hidden');
    });
  }
  
  updateNotifBadge();
  
  // Apply saved theme
  applyTheme(localStorage.getItem('ui_theme') || 'default');
  
  // Seed sample notifications if none
  if (!user.notifications) user.notifications = [];
  if (user.notifications.length === 0) {
    user.notifications.push({ id: genId(), text: 'You received KES 500 from Alice', read: false, important: false, date: now() });
    user.notifications.push({ id: genId(), text: 'Security: New device login detected', read: false, important: true, date: now() });
    saveUser(user);
  }
  updateNotifBadge();
  renderNotifs();
}

function renderMobileAccounts() {
  const container = document.getElementById('mobileAccountsList');
  if (!container) return;

  container.innerHTML = '';
  user.accounts.forEach(acc => {
    const active = acc.id === activeAccountId;
    const btn = document.createElement('button');
    btn.className = `w-full text-left py-2 rounded ${active ? 'bg-indigo-100 font-semibold' : 'hover:bg-indigo-50'}`;
    btn.textContent = `${acc.name} (${formatCurrency(acc.balance)})`;
    btn.onclick = () => {
      setActiveAccount(acc.id);
      if (typeof hideSlideUpDrawer === 'function') hideSlideUpDrawer();
    };
    container.appendChild(btn);
  });
}

// Initialize the application
init();
renderMobileAccounts();

// Expose functions globally
window.startAction = startAction;
window.openPinFromModal = openPinFromModal;
window.closeAllActionModals = closeAllActionModals;
window.verifyPin = verifyPin;
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
window.openSettings = openSettings;
window.closeSettings = closeSettings;
window.saveSettings = saveSettings;
window.openDeleteAccountConfirm = openDeleteAccountConfirm;
window.closeDeleteAccountConfirm = closeDeleteAccountConfirm;
window.confirmDeleteAccount = confirmDeleteAccount;
window.openQrMock = openQrMock;
window.openBills = openBills;
window.openSupport = openSupport;
window.logout = logout;