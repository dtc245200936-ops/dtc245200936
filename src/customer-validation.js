function validateCustomer({ name, email, phone, company, status, notes }) {
  if (typeof name !== 'string' || !name.trim() || name.trim().length > 120 ||
      typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 ||
      !['lead', 'contacted', 'customer'].includes(status) ||
      ![phone, company, notes].every((value) => typeof value === 'string') ||
      phone.length > 30 || company.length > 120 || notes.length > 2000) {
    return 'Du lieu khach hang khong hop le.';
  }
  return null;
}

module.exports = { validateCustomer };
