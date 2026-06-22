const apiService = new ApiService();
const toastElement = document.getElementById('toast');
const toastManager = new ToastManager(toastElement);

const serviceForm = document.getElementById('serviceForm');
const serviceTypeSelect = document.getElementById('serviceType');
const errorList = document.getElementById('errorList');
const errorItems = document.getElementById('errorItems');
const successMessage = document.getElementById('successMessage');
const description = document.getElementById('description');
const notes = document.getElementById('notes');
const descriptionCounter = document.getElementById('descriptionCounter');
const notesCounter = document.getElementById('notesCounter');
const preferredDate = document.getElementById('preferredDate');
const phoneInput = document.getElementById('clientPhone');
const whatsappPublicLink = document.getElementById('whatsappPublicLink');
const requestCheck = document.getElementById('requestCheck');

if (localStorage.getItem('dark-mode') === 'true') {
  document.body.classList.add('dark-mode');
}

document.getElementById('themeTogglePublic').addEventListener('click', () => {
  document.body.classList.toggle('dark-mode');
  localStorage.setItem('dark-mode', document.body.classList.contains('dark-mode'));
});

function todayIsoDate() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60000);
  return local.toISOString().slice(0, 10);
}

function sanitizePhone(phone) {
  return String(phone || '').replace(/\D/g, '');
}

function buildWhatsAppUrl(config) {
  const number = sanitizePhone(config.whatsappCentralNumber || '5511999999999');
  const message = [
    'Olá, gostaria de solicitar atendimento da RJvidros.',
    'Preciso de manutenção, regulagem ou troca de mola de piso para porta de vidro.'
  ].join('\n');

  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

async function setupWhatsAppLink() {
  try {
    const config = await apiService.getPublicConfig();
    whatsappPublicLink.href = buildWhatsAppUrl(config);
  } catch (error) {
    whatsappPublicLink.href = buildWhatsAppUrl({});
  }
}

preferredDate.min = todayIsoDate();
if (requestCheck) requestCheck.value = '';

async function loadServiceTypes() {
  const fallbackTypes = [
    'Manutenção de Mola Hidráulica',
    'Regulagem de Mola de Piso',
    'Troca de Mola de Piso',
    'Reparo de Porta de Vidro',
    'Troca de Pivô ou Ferragem',
    'Instalação de Mola Hidráulica',
    'Inspeção Técnica',
    'Outro'
  ];

  try {
    const response = await fetch('/api/solicitacoes/tipos');
    if (!response.ok) {
      throw new Error('Erro ao carregar tipos de serviço');
    }

    const types = await response.json();
    renderServiceTypes(Array.isArray(types) && types.length ? types : fallbackTypes);
  } catch (error) {
    renderServiceTypes(fallbackTypes);
    toastManager.error('Tipos de serviço carregados em modo local');
  }
}

function renderServiceTypes(types) {
  serviceTypeSelect.innerHTML = '<option value="">Selecione o tipo de serviço</option>' +
    types.map(type => `<option value="${escapeHtml(type)}">${escapeHtml(type)}</option>`).join('');
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function showErrors(errors) {
  if (!errors || errors.length === 0) {
    errorList.classList.remove('show');
    errorItems.innerHTML = '';
    return;
  }

  errorItems.innerHTML = errors.map(error => `<li>${escapeHtml(error)}</li>`).join('');
  errorList.classList.add('show');
  errorList.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function updateCounter(input, counter, max) {
  counter.textContent = `${input.value.length}/${max}`;
}

description.addEventListener('input', () => updateCounter(description, descriptionCounter, 1200));
notes.addEventListener('input', () => updateCounter(notes, notesCounter, 800));

phoneInput.addEventListener('input', () => {
  const digits = phoneInput.value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 10) {
    phoneInput.value = digits.replace(/^(\d{0,2})(\d{0,4})(\d{0,4}).*/, (_, ddd, first, last) => {
      const prefix = ddd ? `(${ddd}` : '';
      const close = ddd.length === 2 ? ') ' : '';
      const middle = first ? first : '';
      const suffix = last ? `-${last}` : '';
      return `${prefix}${close}${middle}${suffix}`;
    });
    return;
  }

  phoneInput.value = digits.replace(/^(\d{2})(\d{5})(\d{0,4}).*/, '($1) $2-$3');
});

function validateForm() {
  const errors = [];
  const clientName = document.getElementById('clientName').value.trim();
  const clientPhone = phoneInput.value.trim();
  const clientEmail = document.getElementById('clientEmail').value.trim();
  const serviceType = serviceTypeSelect.value;
  const descriptionValue = description.value.trim();
  const address = document.getElementById('address').value.trim();
  const preferredDateValue = preferredDate.value;
  const requestCheckValue = requestCheck ? requestCheck.value.trim() : '';

  if (requestCheckValue) errors.push('Solicitação inválida');
  if (clientName.length < 3) errors.push('Informe o nome completo');
  if (!isValidPhone(clientPhone)) errors.push('Informe um telefone válido com DDD');
  if (!isValidEmail(clientEmail)) errors.push('Informe um e-mail válido');
  if (!serviceType) errors.push('Selecione o tipo de serviço');
  if (address.length < 8) errors.push('Informe o endereço completo para atendimento');
  if (descriptionValue.length < 10) errors.push('Descreva o problema com pelo menos 10 caracteres');
  if (preferredDateValue && preferredDateValue < todayIsoDate()) errors.push('A data preferida não pode estar no passado');

  return errors;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 160;
}

function isValidPhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 13;
}

function setSubmitting(isSubmitting) {
  const submitButton = serviceForm.querySelector('button[type="submit"]');
  submitButton.disabled = isSubmitting;
  submitButton.textContent = isSubmitting ? 'Enviando...' : 'Enviar solicitação';
}

serviceForm.addEventListener('reset', () => {
  setTimeout(() => {
    showErrors([]);
    successMessage.classList.remove('show');
    updateCounter(description, descriptionCounter, 1200);
    updateCounter(notes, notesCounter, 800);
  }, 0);
});

serviceForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  showErrors([]);
  successMessage.classList.remove('show');

  const errors = validateForm();
  if (errors.length > 0) {
    showErrors(errors);
    return;
  }

  const request = {
    client_name: document.getElementById('clientName').value.trim(),
    client_phone: phoneInput.value.trim(),
    client_email: document.getElementById('clientEmail').value.trim(),
    service_type: serviceTypeSelect.value,
    description: description.value.trim(),
    address: document.getElementById('address').value.trim(),
    preferred_date: preferredDate.value || null,
    notes: notes.value.trim(),
    request_check: requestCheck ? requestCheck.value.trim() : ''
  };

  try {
    setSubmitting(true);

    const response = await fetch('/api/solicitacoes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Erro ao enviar solicitação');
    }

    successMessage.classList.add('show');
    serviceForm.reset();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    toastManager.success('Solicitação enviada com sucesso');
  } catch (error) {
    showErrors([error.message]);
  } finally {
    setSubmitting(false);
  }
});

updateCounter(description, descriptionCounter, 1200);
updateCounter(notes, notesCounter, 800);
loadServiceTypes();
setupWhatsAppLink();
