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
  const url = window.location.hostname === 'localhost' && window.location.port === '5500'
    ? 'http://localhost:10000/graphql'
    : '/graphql';

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables })
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('GraphQL HTTP error:', res.status, text);
      throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
    }

    const payload = await res.json();
    console.log('GraphQL response:', payload); // ← Debug log
    
    if (payload.errors) {
      console.error('GraphQL errors:', payload.errors);
      throw new Error(payload.errors.map(e => e.message).join('; '));
    }
    
    return payload.data;
  } catch (err) {
    console.error('GraphQL fetch failed:', err);
    throw err;
  }
}

async function search() {
  clearFieldErrors();
  try {
    const q = qInput.value.trim();
    const data = await graphqlFetch(
      `query Search($q:String,$limit:Int){movies(q:$q,limit:$limit){_id title year plot}}`,
      { q: q || undefined, limit: 20 }
    );
    
    console.log('Movies returned:', data.movies);
    
    listEl.innerHTML = '';
    if (!data.movies || data.movies.length === 0) {
      listEl.innerHTML = '<li>No results found</li>';
      return;
    }
    
    data.movies.forEach(m => {
      const li = document.createElement('li');
      li.innerHTML = `
        <div class="movie-result">
          <div class="movie-header">
            <strong>${m.title}</strong> (${m.year || '?'})
          </div>
          <div class="movie-plot">${m.plot || 'No plot available'}</div>
          <small style="color: #666;">ID: ${m._id}</small>
        </div>
      `;
      li.onclick = () => loadMovie(m);
      listEl.appendChild(li);
    });
  } catch (err) {
    console.error('GraphQL search error', err);
    showMsg(`Search failed: ${err.message}`, 'error');
  }
}

function renderList(items) {
  listEl.innerHTML = '';
  items.forEach(it => {
    const li = document.createElement('li');
    li.textContent = `${it._id || ''} - ${it.title || '(no title)'} (${it.year || ''})`;
    li.onclick = () => {
      idInput.value = it._id || '';
      titleInput.value = it.title || '';
      yearInput.value = it.year || '';
      plotInput.value = it.plot || '';
    };
    listEl.appendChild(li);
  });
}

searchBtn.onclick = search;

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
      msgEl.textContent = 'Update failed';
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
      msgEl.textContent = 'Create failed';
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
    msgEl.textContent = 'Delete failed';
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
