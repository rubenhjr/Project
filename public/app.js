const qs = sel => document.querySelector(sel);
const listEl = qs('#list');
const qInput = qs('#q');
const searchBtn = qs('#searchBtn');
const idInput = qs('#id');
const titleInput = qs('#title');
const yearInput = qs('#year');
const plotInput = qs('#plot');
const saveBtn = qs('#saveBtn');
const deleteBtn = qs('#deleteBtn');
const msgEl = qs('#msg');
const errTitle = qs('#err-title');
const errYear = qs('#err-year');

// Auth elements
const userInfoEl = qs('#user-info');
const loginSectionEl = qs('#login-section');
const userNameEl = qs('#user-name');
const logoutBtn = qs('#logoutBtn');
const authRequiredEl = qs('#auth-required');
const editorFormEl = qs('#editor-form');

// Current user state
let currentUser = null;

function clearFieldErrors() {
  errTitle.textContent = '';
  errYear.textContent = '';
}

function validate() {
  clearFieldErrors();
  let ok = true;
  const title = titleInput.value.trim();
  const year = yearInput.value.trim();
  if (!title) { errTitle.textContent = 'Title is required'; ok = false; }
  if (year && Number.isNaN(Number(year))) { errYear.textContent = 'Year must be a number'; ok = false; }
  saveBtn.classList.toggle('disabled', !ok);
  return ok;
}

titleInput.addEventListener('input', validate);
yearInput.addEventListener('input', validate);

async function graphqlFetch(query, variables = {}) {
  
  const url = (location.hostname === 'localhost' && location.port === '5500')
    ? 'http://localhost:3000/graphql'
    : '/graphql';

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    credentials: 'include', // Include cookies for authentication
    body: JSON.stringify({ query, variables })
  });

  let data;
  try {
    data = await res.json();
  } catch {
    const text = await res.text();
    throw new Error(`Non-JSON response (${res.status}): ${text.slice(0, 200)}`);
  }
  if (!res.ok || data.errors) {
    const msg = data?.errors?.map(e => e.message).join('; ') || res.statusText;
    throw new Error(msg);
  }
  return data.data;
}

// Check authentication status
async function checkAuth() {
  try {
    const data = await graphqlFetch(`query { me { id name email picture } }`);
    currentUser = data.me;
    updateAuthUI();
  } catch (err) {
    currentUser = null;
    updateAuthUI();
  }
}

// Update UI based on authentication status
function updateAuthUI() {
  if (currentUser) {
    userInfoEl.style.display = 'block';
    loginSectionEl.style.display = 'none';
    userNameEl.textContent = `Welcome, ${currentUser.name}!`;
    authRequiredEl.style.display = 'none';
    editorFormEl.style.display = 'block';
  } else {
    userInfoEl.style.display = 'none';
    loginSectionEl.style.display = 'block';
    authRequiredEl.style.display = 'block';
    editorFormEl.style.display = 'none';
  }
}

// Logout function
async function logout() {
  try {
    await fetch('/auth/logout', {
      method: 'POST',
      credentials: 'include'
    });
    currentUser = null;
    updateAuthUI();
    msgEl.textContent = 'Logged out successfully';
    msgEl.className = 'msg-ok';
  } catch (err) {
    console.error('Logout failed:', err);
    msgEl.textContent = 'Logout failed';
    msgEl.className = 'msg-error';
  }
}

async function search() {
  try {
    const q = (qInput?.value || '').trim();
    const data = await graphqlFetch(
      `query Search($q:String,$limit:Int){
        movies(q:$q,limit:$limit){ _id title year plot }
      }`,
      { q: q || undefined, limit: 50 }
    );

    listEl.innerHTML = '';
    const items = data.movies || [];
    if (items.length === 0) {
      listEl.innerHTML = '<li>No results found</li>';
      return;
    }

    items.forEach(m => {
      const li = document.createElement('li');
      li.innerHTML = `
        <div class="movie-result">
          <div><strong>${m.title}</strong> (${m.year ?? '?'})</div>
          <div class="movie-plot">${m.plot || 'No plot available'}</div>
          <small>ID: ${m._id}</small>
        </div>
      `;
      li.onclick = () => {
        if (idInput) idInput.value = m._id || '';
        if (titleInput) titleInput.value = m.title || '';
        if (yearInput) yearInput.value = m.year || '';
        if (plotInput) plotInput.value = m.plot || '';
      };
      listEl.appendChild(li);
    });
  } catch (err) {
    console.error('Search failed:', err);
    listEl.innerHTML = `<li style="color:#b00;">Search error: ${err.message}</li>`;
  }
}

// Hook up events
if (searchBtn) searchBtn.addEventListener('click', search);
if (qInput) qInput.addEventListener('keydown', e => { if (e.key === 'Enter') search(); });
if (logoutBtn) logoutBtn.addEventListener('click', logout);

// Check URL parameters for auth status
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('auth') === 'success') {
  // Remove the parameter from URL
  window.history.replaceState({}, document.title, window.location.pathname);
  msgEl.textContent = 'Successfully logged in!';
  msgEl.className = 'msg-ok';
} else if (urlParams.get('error') === 'auth_failed') {
  window.history.replaceState({}, document.title, window.location.pathname);
  msgEl.textContent = 'Authentication failed. Please try again.';
  msgEl.className = 'msg-error';
}

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
  await checkAuth();
  if (listEl) search();
});

saveBtn.onclick = async () => {
  const id = idInput.value.trim();
  const payload = {
    title: titleInput.value.trim(),
    year: yearInput.value ? Number(yearInput.value) : undefined,
    plot: plotInput.value.trim()
  };
  if (!validate()) { msgEl.textContent = 'Fix form errors'; msgEl.className = 'msg-error'; return; }
  if (id) {
    const mutation = `mutation UpdateMovie($id:ID!,$input:MovieInput!){ updateMovie(id:$id,input:$input){ matchedCount modifiedCount } }`;
    try {
      const data = await graphqlFetch(mutation, { id, input: payload });
      msgEl.textContent = 'Updated';
      msgEl.className = 'msg-ok';
    } catch (err) {
      console.error('GraphQL update error', err);
      msgEl.textContent = err.message.includes('Authentication required') ? 
        'Please login to update movies' : 'Update failed';
      msgEl.className = 'msg-error';
    }
  } else {
    const mutation = `mutation CreateMovie($input:MovieInput!){ createMovie(input:$input) }`;
    try {
      const data = await graphqlFetch(mutation, { input: payload });
      msgEl.textContent = 'Created';
      msgEl.className = 'msg-ok';
      idInput.value = data.createMovie || '';
    } catch (err) {
      console.error('GraphQL create error', err);
      msgEl.textContent = err.message.includes('Authentication required') ? 
        'Please login to create movies' : 'Create failed';
      msgEl.className = 'msg-error';
      // show field errors if available (GraphQL errors may contain validation info)
      if (Array.isArray(err)) {
        // try to map validation errors
        err.forEach(e => {
          if (e.extensions && e.extensions.fields) {
            const f = e.extensions.fields;
            if (f.title) errTitle.textContent = f.title;
            if (f.year) errYear.textContent = f.year;
          }
        });
      }
    }
  }
  search();
};

deleteBtn.onclick = async () => {
  const id = idInput.value.trim();
  if (!id) return alert('Enter id to delete');
  const ok = confirm('Delete id ' + id + '?');
  if (!ok) return;
  const mutation = `mutation DeleteMovie($id:ID!){ deleteMovie(id:$id){ deletedCount } }`;
  try {
    await graphqlFetch(mutation, { id });
    msgEl.textContent = 'Deleted';
    msgEl.className = 'msg-ok';
  } catch (err) {
    console.error('GraphQL delete error', err);
    msgEl.textContent = err.message.includes('Authentication required') ? 
      'Please login to delete movies' : 'Delete failed';
    msgEl.className = 'msg-error';
  }
  idInput.value = '';
  titleInput.value = '';
  yearInput.value = '';
  plotInput.value = '';
  search();
};

// initial load
search();
