const apiBase = 'https://prismaguildscanner.onrender.com/';
let token = null;

// Hilfsfunktion für API-Calls
async function call(path, method='GET', body) {
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

// Login
document.getElementById('btnLogin').onclick = async () => {
  try {
    const u = document.getElementById('user').value;
    const p = document.getElementById('pass').value;
    const data = await call('/auth/login', 'POST', { username: u, password: p });
    token = data.token;
    document.getElementById('login').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    refreshMembers();
  } catch {
    alert('Login fehlgeschlagen');
  }
};

// Logout
document.getElementById('btnLogout').onclick = () => {
  token = null;
  document.getElementById('app').classList.add('hidden');
  document.getElementById('login').classList.remove('hidden');
};

// Scan & Refresh
document.getElementById('btnScan').onclick = async () => {
  await call('/members/scan', 'POST');
  refreshMembers();
};
document.getElementById('btnRefresh').onclick = refreshMembers;

// Liste neu laden
async function refreshMembers() {
  try {
    const members = await call('/members');
    const tbody = document.getElementById('memberList');
    tbody.innerHTML = '';
    members.forEach(m => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="p-2">${m.name}</td>
        <td class="p-2 text-center">${m.level}</td>
        <td class="p-2 text-center">${m.class}</td>
        <td class="p-2 text-center">
          <button onclick="deleteMember(${m.id})"
                  class="px-2 py-1 bg-red-600 rounded">✕</button>
        </td>`;
      tbody.appendChild(tr);
    });
  } catch {
    alert('Fehler beim Laden');
  }
}

// Member löschen
async function deleteMember(id) {
  await call(`/members/${id}`, 'DELETE');
  refreshMembers();
}
