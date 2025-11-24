// Client-side filter
const filter = document.getElementById('filter');
const rows = document.getElementById('rows');
filter?.addEventListener('input', () => {
  const q = filter.value.toLowerCase();
  for (const tr of rows.querySelectorAll('tr')) {
    const name = tr.querySelector('.name')?.textContent.toLowerCase() || '';
    const phone = tr.querySelector('.phone')?.textContent.toLowerCase() || '';
    tr.style.display = (name.includes(q) || phone.includes(q)) ? '' : 'none';
  }
});

// Edit modal populate
const editModal = document.getElementById('editModal');
editModal?.addEventListener('show.bs.modal', (ev) => {
  const btn = ev.relatedTarget;
  document.getElementById('edit-id').value    = btn.getAttribute('data-id');
  document.getElementById('edit-name').value  = btn.getAttribute('data-name');
  document.getElementById('edit-phone').value = btn.getAttribute('data-phone');
});
