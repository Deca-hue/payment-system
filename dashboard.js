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
    function openSettings() { alert('Settings (demo)'); }

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
