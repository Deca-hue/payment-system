/* -------------------------
Data model & persistence
------------------------- */
    const CURRENT_USER_KEY = 'currentUser';  // phone set by login
    const USERS_PREFIX = 'user_'; // per-user key: user_<phone>
    let currentUserPhone = localStorage.getItem(CURRENT_USER_KEY);
    if (!currentUserPhone) {
      // Not logged in — go back
      window.location.href = 'index.html';
    }

    // fetch user object from storage
    function loadUser() {
      const raw = localStorage.getItem(USERS_PREFIX + currentUserPhone);
      if (!raw) {
        // fallback: older format where user was saved at phone directly
        const alt = localStorage.getItem(currentUserPhone);
        if (alt) {
          const parsed = JSON.parse(alt);
          // migrate to new shape
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
            notifications: []
          };
          localStorage.setItem(USERS_PREFIX + currentUserPhone, JSON.stringify(user));
          localStorage.removeItem(currentUserPhone);
          return user;
        } else {
          // nothing: redirect
          window.location.href = 'index.html';
        }
      }
      return JSON.parse(raw);
    }

    function saveUser(user) {
      localStorage.setItem(USERS_PREFIX + currentUserPhone, JSON.stringify(user));
    }

    // helpers
    function genId() { return 'a' + Math.random().toString(36).slice(2,9); }
    function now() { return new Date().toISOString(); }
    function formatCurrency(n) { return 'KES ' + Number(n).toLocaleString(); }
    function shortDate(s) { const d = new Date(s); return d.toLocaleString(); }

    /* -------------------------
       App state
       ------------------------- */
    let user = loadUser();
    let activeAccountId = user.accounts && user.accounts.length ? user.accounts[0].id : null;
    let pendingAction = null; // 'send'|'withdraw' etc
    let pendingActionData = {}; // hold form details if needed

    /* -------------------------
       Initial UI wiring
       ------------------------- */
    const animatedNameEl = document.getElementById('animatedName');
    const navUserName = document.getElementById('navUserName');
    const avatarInitial = document.getElementById('avatarInitial');

    function init() {
      // show name with animation
      typeWriter(user.name || 'User', animatedNameEl, 60);
      navUserName.textContent = user.name || 'User';
      avatarInitial.textContent = (user.name || 'U').charAt(0).toUpperCase();

      // populate accounts list
      renderAccounts();
      setActiveAccount(activeAccountId);

      // notif sample
      renderNotifs();
    }
    init();

    /* -------------------------
       Animated typewriter (one-time)
       ------------------------- */
    function typeWriter(text, el, speed=80) {
      el.textContent = '';
      let i = 0;
      const t = setInterval(() => {
        el.textContent += text[i] ?? '';
        i++;
        if (i >= text.length) clearInterval(t);
      }, speed);
    }

    /* -------------------------
       Accounts UI
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
        row.onclick = (e) => { 
          // prevent when clicking inner buttons
          if (e.target.tagName.toLowerCase() === 'button') return;
          setActiveAccount(acc.id);
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
      document.getElementById('activeAccountName').textContent = acc.name;
      document.getElementById('activeBalance').textContent = formatCurrency(acc.balance);
      document.getElementById('balanceUpdated').textContent = 'Updated: ' + shortDate(now());
      document.getElementById('txCount').textContent = acc.transactions.length;
      renderTxList(acc.transactions);
      renderSpark(acc.transactions);
      renderAccounts();
    }

    /* -------------------------
       Add / Rename / Delete account
       ------------------------- */
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
      if (!confirm('Delete this account? This cannot be undone.')) return;
      if (user.accounts.length === 1) { alert('You must have at least one account'); return; }
      user.accounts = user.accounts.filter(a => a.id !== id);
      if (activeAccountId === id) activeAccountId = user.accounts[0].id;
      saveUser(user);
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
        // optionally update balance:
        acc.balance = init;
        saveUser(user);
        setActiveAccount(id);
        closeAcctModal();
      }
    }

    /* -------------------------
       Transactions UI
       ------------------------- */
    function renderTxList(transactions) {
      const container = document.getElementById('txList');
      container.innerHTML = '';
      if (!transactions || transactions.length === 0) {
        container.innerHTML = '<p class="text-slate-500">No transactions yet.</p>';
        return;
      }
      const recent = transactions.slice().reverse().slice(0, 20);
      recent.forEach(tx => {
        const row = document.createElement('div');
        row.className = 'flex items-center justify-between p-2 rounded hover:bg-slate-50';
        row.innerHTML = `
          <div>
            <div class="text-sm">${tx.type === 'credit' ? 'Received' : tx.type === 'deposit' ? 'Deposit' : tx.type} ${tx.to ? '→ ' + (tx.toName || tx.to) : ''}</div>
            <div class="text-xs text-slate-400">${shortDate(tx.date)} — ${tx.note || ''}</div>
          </div>
          <div class="text-right">
            <div class="font-medium ${tx.type === 'credit' || tx.type === 'deposit' ? 'text-green-600' : 'text-red-600'}">
              ${tx.type === 'credit' || tx.type === 'deposit' ? '+' : '-'}${formatCurrency(tx.amount).replace('KES ', '')}
            </div>
            <div class="text-xs text-slate-400">${tx.status || 'done'}</div>
          </div>
        `;
        container.appendChild(row);
      });
    }

    /* -------------------------
       Sparkline (very simple)
       ------------------------- */
    function renderSpark(transactions=[]) {
      const svg = document.getElementById('spark');
      svg.innerHTML = '';
      const data = transactions.slice(-12).map(t => t.amount * (t.type === 'credit' || t.type==='deposit' ? 1 : -1));
      if (!data.length) {
        // placeholder
        svg.innerHTML = `<polyline points="0,30 20,20 40,22 60,12 80,18 100,14 120,16" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"></polyline>`;
        return;
      }
      const w = 120, h = 36;
      const min = Math.min(...data), max = Math.max(...data);
      const range = (max - min) || 1;
      const step = w / Math.max(1, data.length - 1);
      const pts = data.map((v,i) => {
        const x = i * step;
        const y = h - ((v - min) / range) * (h - 6) - 3;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      }).join(' ');
      svg.innerHTML = `<polyline points="${pts}" fill="none" stroke="#0f172a" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"></polyline>`;
    }

    /* -------------------------
       Notifications
       ------------------------- */
    function renderNotifs() {
      const list = document.getElementById('notificationsList');
      if (!user.notifications || user.notifications.length === 0) {
        list.textContent = 'No new notifications';
      } else {
        list.innerHTML = user.notifications.map(n => `<div class="text-sm p-2 rounded ${n.important ? 'bg-yellow-50' : ''}">${n.text}</div>`).join('');
      }
    }
    function clearNotifs() { user.notifications = []; saveUser(user); renderNotifs(); }

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
       Small toast
       ------------------------- */
    function showToast(msg) {
      const el = document.createElement('div');
      el.className = 'fixed bottom-6 right-6 bg-black text-white px-4 py-2 rounded shadow';
      el.textContent = msg;
      document.body.appendChild(el);
      setTimeout(()=> el.classList.add('opacity-0'), 2000);
      setTimeout(()=> el.remove(), 2600);
    }

    /* -------------------------
       Misc UI actions
       ------------------------- */
    function openProfile() {
      const d = document.getElementById('profileDrawer');
      d.classList.remove('hidden');
      document.getElementById('profileName').textContent = user.name;
      document.getElementById('profilePhone').textContent = user.phone;
    }

    function closeProfile() {
      const d = document.getElementById('profileDrawer');
      d.classList.add('hidden');
      document.getElementById('profilePhone').textContent = user.phone;
    }
    function showChangeCode() {
      const newPin = prompt('Enter new PIN (4-6 digits):');
      if (!newPin) return;
      user.code = newPin;
      saveUser(user);
      showToast('PIN updated');
    }
    function openSupport() { alert('Support: demo@moneyapp.example'); }
    function openQrMock() { alert('QR pay (mock) — paste recipient phone to Send'); }
    function openBills() { alert('Bills module (coming soon)'); }

    function logout() {
      localStorage.removeItem(CURRENT_USER_KEY);
      window.location.href = 'index.html';
    }

    /* -------------------------
       Mobile sidebar toggle
       ------------------------- */
    document.getElementById('mobileToggle').addEventListener('click', () => {
      const s = document.getElementById('sidebar');
      s.classList.toggle('hidden');
    });

    /* -------------------------
       Simple helpers for settings etc
       ------------------------- */
    function openSettings() { alert('Settings (demo)'); }

    /* -------------------------
       small UX helpers: rename from UI events
       ------------------------- */
    window.showAddAccount = showAddAccount;
    window.renameAccount = renameAccount;
    window.removeAccount = removeAccount;
    window.openDeposit = openDeposit;
    window.openQrMock = openQrMock;
    window.openBills = openBills;
    window.openSupport = openSupport;
    window.logout = logout;
    window.showChangeCode = showChangeCode;
    window.openProfile = openProfile;
    window.closeAcctModal = closeAcctModal;
    window.saveAccount = saveAccount;
    window.openActionModal = openActionModal;
    window.closeActionModal = closeActionModal;
    window.requirePinAndOpen = requirePinAndOpen;

    // Expose confirmAction for button
    window.confirmAction = confirmAction;

    // Transaction deletion functions
    let transactionToDelete = null;

    function renderTransaction(tx, index) {
      const amount = tx.type === 'withdraw' ? `-KES ${tx.amount}` : `+KES ${tx.amount}`;
      const amountColor = tx.type === 'withdraw' ? 'text-red-600' : 'text-green-600';
      return `
        <div class="flex items-center justify-between p-2 hover:bg-slate-50 rounded" id="tx-${index}">
          <div>
            <div class="font-medium">${tx.recipient || 'Cash Withdrawal'}</div>
            <div class="text-xs text-slate-500">${tx.note || ''}</div>
          </div>
          <div class="flex items-center gap-3">
            <div class="${amountColor} font-medium">${amount}</div>
            <button onclick="showDeleteTransaction(${index})" class="text-red-600 opacity-0 hover:opacity-100 transition-opacity">
              🗑️
            </button>
          </div>
        </div>
      `;
    }

    function showDeleteTransaction(index) {
      transactionToDelete = index;
      document.getElementById('deleteTransactionModal').classList.remove('hidden');
    }

    function closeDeleteTransactionModal() {
      document.getElementById('deleteTransactionModal').classList.add('hidden');
      transactionToDelete = null;
    }

    function confirmDeleteTransaction() {
      if (transactionToDelete === null) return;
      
      // Get current user's transactions
      const userData = JSON.parse(localStorage.getItem(USERS_PREFIX + currentUserPhone));
      const transactions = userData.transactions || [];
      
      // Remove the transaction
      transactions.splice(transactionToDelete, 1);
      
      // Update storage
      userData.transactions = transactions;
      localStorage.setItem(USERS_PREFIX + currentUserPhone, JSON.stringify(userData));
      
      // Update UI
      updateTransactions();
      closeDeleteTransactionModal();
    }

    function updateTransactions() {
      const txList = document.getElementById('txList');
      const userData = JSON.parse(localStorage.getItem(USERS_PREFIX + currentUserPhone));
      const transactions = userData.transactions || [];

      if (transactions.length === 0) {
        txList.innerHTML = '<p class="text-slate-500">No transactions yet.</p>';
        return;
      }

      txList.innerHTML = transactions
        .slice()
        .reverse()
        .slice(0, 20)
        .map((tx, i) => renderTransaction(tx, i))
        .join('');
    }

    // Expose functions to window
    window.showDeleteTransaction = showDeleteTransaction;
    window.closeDeleteTransactionModal = closeDeleteTransactionModal;
    window.confirmDeleteTransaction = confirmDeleteTransaction;

    // init done
