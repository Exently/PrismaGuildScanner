const apiBase = 'https://prismaguildscanner.onrender.com/api';
let token = null;
let trackedMembers = [];
let availableMembers = [];

// Helper: API-Call mit Token-Auth
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

// Login-Handler
document.getElementById('btnLogin').onclick = async () => {
  try {
    const u = document.getElementById('user').value;
    const p = document.getElementById('pass').value;
    const data = await call('/auth/login', 'POST', { username: u, password: p });
    token = data.token;
    document.getElementById('login').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    refreshTracked();
  } catch {
    alert('Login fehlgeschlagen');
  }
};

// Logout-Handler
document.getElementById('btnLogout').onclick = () => {
  token = null;
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
  const container = document.getElementById('availList');
  container.innerHTML = '';
  list.forEach(m => {
    const btn = document.createElement('button');
    btn.textContent = `${m.name} (${m.class})`;
    btn.className = 'w-full text-left p-2 bg-gray-700 rounded hover:bg-gray-600';
    btn.onclick = async () => {
      await call('/members', 'POST', m);
      availableMembers = availableMembers.filter(x => x.id !== m.id);
      renderAvailable(availableMembers);
      refreshTracked();
    };
    container.appendChild(btn);
  });
}

// Filter Available List
document.getElementById('searchAvail').addEventListener('input', e => {
  const term = e.target.value.toLowerCase();
  renderAvailable(
    availableMembers.filter(m =>
      m.name.toLowerCase().includes(term) ||
      m.class.toLowerCase().includes(term) ||
      String(m.level).includes(term)
    )
  );
});

// Refresh Tracked Members from DB
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
    tr.className = 'hover:bg-gray-700 transition-colors';
    tr.innerHTML = `
      <td class="p-2">${m.name}</td>
      <td class="p-2 text-center">${m.level}</td>
      <td class="p-2 text-center">${m.slot1}</td>
      <td class="p-2 text-center">${m.slot2}</td>
      <td class="p-2 text-center">${m.slot3}</td>
      <td class="p-2 text-center">
        <button onclick="deleteMember(${m.id})"
                class="px-2 py-1 bg-red-600 rounded">✕</button>
      </td>`;
    tbody.appendChild(tr);
  });
}

// Filter Tracked List
document.getElementById('searchTracked').addEventListener('input', e => {
  const term = e.target.value.toLowerCase();
  renderMembers(
    trackedMembers.filter(m =>
      m.name.toLowerCase().includes(term) ||
      m.class.toLowerCase().includes(term) ||
      String(m.level).includes(term)
    )
  );
});

// Delete Tracked Member
async function deleteMember(id) {
  await call(`/members/${id}`, 'DELETE');
  refreshTracked();
}

// Optional: initial focus
document.getElementById('user').focus();

const deleteAllBtn = document.getElementById('btnDeleteAll');

document.getElementById('searchTracked').addEventListener('input', e => {
  const term = e.target.value.toLowerCase();
  if (term === 'deleteall') {
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