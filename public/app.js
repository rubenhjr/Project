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
  const res = await fetch('/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables })
  });
  const payload = await res.json();
  if (payload.errors) throw payload.errors;
  return payload.data;
}

async function search() {
  const q = qInput.value || '';
  const query = `query Movies($q:String,$limit:Int,$skip:Int){ movies(q:$q, limit:$limit, skip:$skip){ _id title year plot } }`;
  try {
    const data = await graphqlFetch(query, { q, limit: 50, skip: 0 });
    renderList(data.movies || []);
  } catch (err) {
    console.error('GraphQL search error', err);
    msgEl.textContent = 'Search failed';
    msgEl.className = 'msg-error';
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
