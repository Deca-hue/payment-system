const CURRENT_USER_KEY = 'currentUser';
const USERS_PREFIX = 'user_';

// Load the user based on the phone number typed in the login field
let user = null;

function loadLoginUser(phone) {
    // Always use USERS_PREFIX constant
    const raw = localStorage.getItem(USERS_PREFIX + phone);
    if (!raw) return null;
    return JSON.parse(raw);
}


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

  if (localStorage.getItem(USERS_PREFIX + phone)) {
    showRegisterMessage('Account already exists. Please login.', true);
    return;
  }

  const user = { name, phone, code, balance: 1000, transactions: [] };
  // store under the USERS_PREFIX so loadLoginUser can find it
  localStorage.setItem(USERS_PREFIX + phone, JSON.stringify(user));

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
  // login form uses ids `loginPhone` and `loginCode` in index.html
  const phone = document.getElementById('loginPhone').value.trim();
  const code = document.getElementById('loginCode').value.trim();

  if (!phone || !code) {
    showLoginMessage('Enter phone and special code');
    return;
  }

  user = loadLoginUser(phone);

  if (!user) {
    showLoginMessage('Account not found. Please create an account first.');
    return;
  }

  if (user.code !== code) {
    showLoginMessage('Invalid special code');
    return;
  }

  // Successful login — store current user and go to dashboard
  localStorage.setItem(CURRENT_USER_KEY, phone);
  window.location.href = 'dashboard.html';
}

function showLoginMessage(msg) {
  const el = document.getElementById('loginMessage');
  el.textContent = msg;
}


/* ---------- FORGOT PIN FLOW UI ---------- */

  // Set the question text
  function openForgotPinModal() {
    const phone = document.getElementById('loginPhone').value.trim();

    if (!phone) {
        alert("Enter your phone number first.");
        return;
    }

    user = loadLoginUser(phone);

    if (!user) {
        alert("No account found with that phone number.");
        return;
    }

    if (!user.recovery_q || !user.recovery_a || !user.recovery_a.trim()) {
        alert("Recovery not set. Open Settings > Security to set a recovery question.");
        return;
    }

    document.getElementById('fp_question_box').textContent =
        "Question: " + recoveryQuestionLabel(user.recovery_q);

    document.getElementById('fp_answer').value = "";
    document.getElementById('forgotPinModal').classList.remove('hidden');
}



function closeForgotPinModal() {
  document.getElementById('forgotPinModal').classList.add('hidden');
}

function openNewPinModal() {
  document.getElementById('newPinModal').classList.remove('hidden');
}

function closeNewPinModal() {
  document.getElementById('newPinModal').classList.add('hidden');
}
function recoveryQuestionLabel(key) {
  switch (key) {
    case "mother_maiden": return "What is your mother's maiden name?";
    case "first_school": return "What was your first school's name?";
    case "fav_teacher": return "What is your favorite teacher's name?";
    default: return key;
  }
}

function submitForgotPin() {
  const ans = document.getElementById('fp_answer').value.trim();

  // Validate answer presence
  if (!ans) {
    showToast("Enter your answer.");
    return;
  }
  
  // Ensure user and recovery answer exist and match (case insensitive)
  if (!user || !user.recovery_a || ans.toLowerCase() !== user.recovery_a.toLowerCase()) {
    showToast("Incorrect answer.");
    return;
  }

  // Success → proceed to new PIN modal
  closeForgotPinModal();
  openNewPinModal();
}

function saveNewPin() {
  const pin1 = document.getElementById('reset_newpin').value.trim();
  const pin2 = document.getElementById('reset_newpin_confirm').value.trim();

  if (pin1.length < 4 || pin1.length > 6) {
    alert("PIN must be 4–6 digits.");
    return;
  }
  if (pin1 !== pin2) {
    alert("PINs do not match.");
    return;
  }

  // Save new PIN locally (index.html doesn't have dashboard helpers)
  user.code = pin1;
  // clear any lock info if present
  user.pinAttempts = 0;
  user.pinLockedUntil = null;
  try {
    localStorage.setItem(USERS_PREFIX + user.phone, JSON.stringify(user));
  } catch (e) {
    console.error('Failed saving user:', e);
  }

  closeNewPinModal();
  showToast("PIN reset successfully");
}

// lightweight toast for the login page (small copy of dashboard toast)
function showToast(msg) {
  // clear any existing toasts
  const existing = document.getElementById('login_toast_wrap');
  if (existing) {
    existing.remove();
  }
  
  // create wrapper if needed
  const wrap = document.createElement('div');
  wrap.id = 'login_toast_wrap';
  wrap.style.position = 'fixed';
  wrap.style.left = '50%';
  wrap.style.transform = 'translateX(-50%)';
  wrap.style.bottom = '20px';
  wrap.style.zIndex = 9999;
  document.body.appendChild(wrap);
  
  // create toast element
  const el = document.createElement('div');
  el.style.background = 'rgba(0,0,0,0.85)';
  el.style.color = 'white';
  el.style.padding = '8px 12px';
  el.style.borderRadius = '6px';
  el.style.marginTop = '6px';
  el.style.transition = 'opacity 0.3s ease-out';
  el.textContent = msg;
  wrap.appendChild(el);
  
  // handle cleanup with single timer
  const timer = setTimeout(() => {
    el.style.opacity = '0';
    setTimeout(() => wrap.remove(), 300);
  }, 2000);
}
