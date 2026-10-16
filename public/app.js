const $ = (selector) => document.querySelector(selector);
const rows = $('#customer-rows');
const dialog = $('#customer-dialog');
let customers = [];

const statusLabels = {
  lead: ['Tiềm năng', 'badge-lead'],
  contacted: ['Đang chăm sóc', 'badge-contacted'],
  customer: ['Đã chuyển đổi', 'badge-customer'],
};

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[character]));
}

function initials(name) {
  return name.trim().split(/\s+/).slice(-2).map((part) => part[0]).join('').toUpperCase();
}

function renderCustomers() {
  const search = $('#search').value.trim().toLowerCase();
  const visible = customers.filter((customer) =>
    [customer.name, customer.email, customer.company].some((value) => value.toLowerCase().includes(search)) &&
    (!$('#filter-status').value || customer.status === $('#filter-status').value));
  rows.innerHTML = visible.length ? visible.map((customer) => {
    const status = statusLabels[customer.status];
    const created = new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(customer.created_at));
    return `<tr>
      <td><div class="person"><span class="person-avatar">${escapeHtml(initials(customer.name))}</span><div><strong>${escapeHtml(customer.name)}</strong><small>${escapeHtml(customer.email)}</small></div></div></td>
      <td>${escapeHtml(customer.company || '—')}</td>
      <td>${escapeHtml(customer.phone || '—')}</td>
      <td><span class="badge ${status[1]}"><i></i>${status[0]}</span></td>
      <td>${created}</td>
      <td><button class="row-action" data-id="${customer.id}" aria-label="Xóa ${escapeHtml(customer.name)}" title="Xóa khách hàng">···</button></td>
    </tr>`;
  }).join('') : '<tr><td colspan="6" class="empty">Không tìm thấy khách hàng phù hợp.</td></tr>';
  $('#result-count').textContent = `Hiển thị ${visible.length} trong ${customers.length} khách hàng`;
  $('#total-count').textContent = customers.length;
  $('#lead-count').textContent = customers.filter((customer) => customer.status === 'lead').length;
  $('#contacted-count').textContent = customers.filter((customer) => customer.status === 'contacted').length;
  $('#customer-count').textContent = customers.filter((customer) => customer.status === 'customer').length;
}

async function loadCustomers() {
  rows.innerHTML = '<tr><td colspan="6" class="empty">Đang tải dữ liệu...</td></tr>';
  try {
    const response = await fetch('/api/customers');
    if (!response.ok) throw new Error('Không thể tải danh sách khách hàng.');
    customers = await response.json();
    renderCustomers();
  } catch (error) {
    rows.innerHTML = `<tr><td colspan="6" class="empty error">${escapeHtml(error.message)}</td></tr>`;
    $('#result-count').textContent = 'Không tải được dữ liệu';
  }
}

function showToast(message) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.add('visible');
  window.setTimeout(() => toast.classList.remove('visible'), 2600);
}

$('#today').textContent = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium' }).format(new Date());
$('#today-label').textContent = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'full' }).format(new Date()).toLocaleUpperCase('vi-VN');
$('#search').addEventListener('input', renderCustomers);
$('#filter-status').addEventListener('change', renderCustomers);
$('#add-customer').addEventListener('click', () => dialog.showModal());
$('#close-dialog').addEventListener('click', () => dialog.close());
$('#cancel-dialog').addEventListener('click', () => dialog.close());

$('#customer-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const submit = event.submitter;
  submit.disabled = true;
  $('#form-error').textContent = '';
  const form = new FormData(event.currentTarget);
  const customer = Object.fromEntries(form.entries());
  try {
    const response = await fetch('/api/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(customer),
    });
    const payload = response.status === 204 ? null : await response.json();
    if (!response.ok) throw new Error(payload.error || 'Không thể lưu khách hàng.');
    event.currentTarget.reset();
    dialog.close();
    await loadCustomers();
    showToast('Đã thêm khách hàng thành công.');
  } catch (error) {
    $('#form-error').textContent = error.message;
  } finally {
    submit.disabled = false;
  }
});

rows.addEventListener('click', async (event) => {
  const button = event.target.closest('.row-action');
  if (!button) return;
  if (!window.confirm('Bạn có chắc muốn xóa khách hàng này?')) return;
  try {
    const response = await fetch(`/api/customers/${button.dataset.id}`, { method: 'DELETE' });
    if (!response.ok) {
      const payload = await response.json();
      throw new Error(payload.error || 'Không thể xóa khách hàng.');
    }
    await loadCustomers();
    showToast('Đã xóa khách hàng.');
  } catch (error) {
    showToast(error.message);
  }
});

loadCustomers();
