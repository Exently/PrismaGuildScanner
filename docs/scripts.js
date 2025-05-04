// scripts.js - Vanilla JS frontend for Prisma Guild Scanner

const apiBase = 'https://prismaguildscanner.onrender.com/api';
let token = null;
let trackedMembers = [];
let availableMembers = [];

// Helper: API-Call with Token-Auth
async function call(path, method = 'GET', body) {
  const opts = { method, headers: {} };
  if (token) opts.headers['Authorization'] = `Bearer ${token}`;
  if (body) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(`${apiBase}${path}`, opts);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// Login-Handler with loading state, spinner and hint
const loginBtn = document.getElementById('btnLogin');
loginBtn.onclick = async () => {
  const btn = loginBtn;
  const userInput = document.getElementById('user');
  const passInput = document.getElementById('pass');
  const originalHTML = btn.innerHTML;
  btn.disabled = true;
  // Insert spinner
  btn.innerHTML = `<svg class="animate-spin h-5 w-5 mr-2 inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
  </svg>Loading...`;
  // Show hint after 5s
  const hintTimer = setTimeout(() => {
    btn.innerHTML = `<svg class="animate-spin h-5 w-5 mr-2 inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
    </svg>Login can take time after long inactivity`;
  }, 5000);

  try {
    const u = userInput.value;
    const p = passInput.value;
    const data = await call('/auth/login', 'POST', { username: u, password: p });
    token = data.token;
    userInput.value = '';
    passInput.value = '';
    document.getElementById('login').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    refreshTracked();
  } catch {
    alert('Login fehlgeschlagen');
  } finally {
    clearTimeout(hintTimer);
    btn.innerHTML = originalHTML;
    btn.disabled = false;
  }
};

// Logout-Handler
document.getElementById('btnLogout').onclick = () => {
  const userInput = document.getElementById('user');
  const passInput = document.getElementById('pass');
  token = null;
  // Clear login fields
  userInput.value = '';
  passInput.value = '';
  document.getElementById('app').classList.add('hidden');
  document.getElementById('login').classList.remove('hidden');
};

// Load Level 80 Members
document.getElementById('btnLoad').onclick = async () => {
  try {
    availableMembers = await call('/members/scan', 'GET');
    renderAvailable(availableMembers);
  } catch (e) {
    alert('Load failed: ' + e.message);
  }
};

// Render Available-to-Track List
function renderAvailable(list) {
  const tbody = document.getElementById('availList');
  tbody.innerHTML = '';
  list.forEach(m => {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-gray-700';
    tr.innerHTML = `
      <td class="p-2">${m.name}</td>
      <td class="p-2 text-center">
        <button class="px-2 py-1 bg-green-600 rounded hover:bg-green-500"
                onclick="trackMember(${m.id})">
          Track
        </button>
      </td>`;
    tbody.appendChild(tr);
  });
}

// Track a member: POST & refresh
async function trackMember(id) {
  try {
    const member = availableMembers.find(m => m.id === id);
    await call('/members', 'POST', member);
    // Remove from available
    availableMembers = availableMembers.filter(m => m.id !== id);
    renderAvailable(availableMembers);
    refreshTracked();
  } catch (e) {
    alert('Track failed: ' + e.message);
  }
}

// Bind Refresh-Button
document.getElementById('btnRefresh').onclick = () => {
  refreshTracked();
};

// Refresh Tracked Members from API
async function refreshTracked() {
  try {
    trackedMembers = await call('/members', 'GET');
    renderMembers(trackedMembers);
  } catch {
    alert('Fehler beim Laden');
  }
}

// Render Tracked Members Table
function renderMembers(members) {
  const tbody = document.getElementById('memberList');
  tbody.innerHTML = '';
  members.forEach(m => {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-gray-700';
    tr.innerHTML = `
      <td class="p-2">${m.name}</td>
      <td class="p-2 text-center">${m.level}</td>
      <td class="p-2 text-center">${m.slot1}</td>
      <td class="p-2 text-center">${m.slot2}</td>
      <td class="p-2 text-center">${m.slot3}</td>
      <td class="p-2 text-center">
        <button onclick="deleteMember(${m.id})"
                class="px-2 py-1 bg-red-600 rounded hover:bg-red-500">
          ✕
        </button>
      </td>`;
    tbody.appendChild(tr);
  });
}

// Filter Available List
document.getElementById('searchAvail').addEventListener('input', e => {
  const term = e.target.value.toLowerCase();
  renderAvailable(
    availableMembers.filter(m =>
      m.name.toLowerCase().includes(term)
    )
  );
});

// Filter Tracked List
document.getElementById('searchTracked').addEventListener('input', e => {
  const term = e.target.value.toLowerCase();
  renderMembers(
    trackedMembers.filter(m =>
      m.name.toLowerCase().includes(term)
    )
  );
});

// Delete Tracked Member
async function deleteMember(id) {
  await call(`/members/${id}`, 'DELETE');
  refreshTracked();
}

// Secret Delete All Button
const deleteAllBtn = document.getElementById('btnDeleteAll');
const searchTrackedInput = document.getElementById('searchTracked');
searchTrackedInput.addEventListener('input', e => {
  if (e.target.value.toLowerCase() === 'deleteall') {
    deleteAllBtn.classList.remove('hidden');
  } else {
    deleteAllBtn.classList.add('hidden');
  }
});
deleteAllBtn.onclick = async () => {
  if (!confirm('Möchtest du wirklich alle getrackten Mitglieder löschen?')) return;
  for (const m of trackedMembers) {
    await call(`/members/${m.id}`, 'DELETE');
  }
  refreshTracked();
};

// Initial focus
document.getElementById('user').focus();
