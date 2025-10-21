function toggleSection() {
  const login = document.getElementById('loginSection');
  const register = document.getElementById('registerSection');
  login.classList.toggle('hidden');
  register.classList.toggle('hidden');
}

// ✅ Registration logic
function registerUser() {
  const name = document.getElementById('regName').value.trim();
  const phone = document.getElementById('regPhone').value.trim();
  const code = document.getElementById('regCode').value.trim();

  if (!name || !phone || !code) {
    showRegisterMessage('All fields are required', true);
    return;
  }

  if (localStorage.getItem(phone)) {
    showRegisterMessage('Account already exists. Please login.', true);
    return;
  }

  const user = { name, phone, code, balance: 1000, transactions: [] };
  localStorage.setItem(phone, JSON.stringify(user));

  showRegisterMessage('Account created successfully ✅');
  setTimeout(() => {
    toggleSection();
  }, 1000);
}

function showRegisterMessage(msg, error = false) {
  const el = document.getElementById('registerMessage');
  el.textContent = msg;
  el.className = `text-center mt-2 text-sm ${error ? 'text-red-500' : 'text-green-600'}`;
}

// ✅ Login logic
function loginUser() {
  const phone = document.getElementById('loginPhone').value.trim();
  const code = document.getElementById('loginCode').value.trim();

  if (!phone || !code) {
    showLoginMessage('Enter phone number and special code');
    return;
  }

  const data = localStorage.getItem(phone);
  if (!data) {
    alert('Account not found. Please create an account.');
    showLoginMessage('Account does not exist. Register below.');
    return;
  }

  const user = JSON.parse(data);
  if (user.code !== code) {
    showLoginMessage('Invalid special code');
    return;
  }

  localStorage.setItem('currentUser', phone);
  window.location.href = 'dashboard.html';
}

function showLoginMessage(msg) {
  const el = document.getElementById('loginMessage');
  el.textContent = msg;
}

