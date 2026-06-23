const apiService = new ApiService();
const authManager = new AuthManager(apiService);
const toastElement = document.getElementById('toast');
const toastManager = new ToastManager(toastElement);
const uiManager = new UIManager(authManager, apiService);

uiManager.initializePage();

const ordersTable = document.getElementById('ordersTable');
const orderForm = document.getElementById('orderForm');
const orderClient = document.getElementById('orderClient');
const orderTechnician = document.getElementById('orderTechnician');
const orderFeedback = document.getElementById('orderFeedback');
const printStatusFilter = document.getElementById('printStatusFilter');
const nfeModal = document.getElementById('nfeModal');
const nfeForm = document.getElementById('nfeForm');
const nfeAccessKey = document.getElementById('nfeAccessKey');
const nfeUrl = document.getElementById('nfeUrl');
const nfeOrderSummary = document.getElementById('nfeOrderSummary');
const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

let latestOrders = [];
let selectedNfeOrderId = null;
let publicConfig = {
  whatsappCentralNumber: '5511999999999',
  whatsappCentralName: 'Central RJvidros'
};

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function statusClass(status) {
  return String(status || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function normalizeStatus(status) {
  return statusClass(status);
}

function sanitizePhone(phone) {
  return String(phone || '').replace(/\D/g, '');
}

function buildCentralWhatsAppUrl(order) {
  const centralNumber = sanitizePhone(publicConfig.whatsappCentralNumber);
  const message = [
    `Olá, ${publicConfig.whatsappCentralName}.`,
    `Preciso iniciar o atendimento inteligente da OS #${order.id}.`,
    `Cliente: ${order.client || '-'}`,
    `Telefone do cliente: ${order.client_phone || '-'}`,
    `Serviço: ${order.title || '-'}`,
    `Status: ${order.status || '-'}`,
    `Técnico atual: ${order.technician || 'A definir'}`,
    '',
    'Por favor, confirme os dados com o cliente e repasse para um técnico disponível.'
  ].join('\n');

  return `https://wa.me/${centralNumber}?text=${encodeURIComponent(message)}`;
}

function buildClientWhatsAppUrl(order) {
  const clientPhone = sanitizePhone(order.client_phone);
  const message = [
    `Olá, ${order.client || 'cliente'}.`,
    `Segue a Ordem de Serviço #${order.id} da RJvidros OS.`,
    `Serviço: ${order.title || '-'}`,
    `Status: ${order.status || '-'}`,
    `Técnico: ${order.technician || 'A definir'}`,
    `Valor: ${currencyFormatter.format(order.total || 0)}`,
    '',
    'Qualquer dúvida, estamos à disposição.'
  ].join('\n');

  return `https://wa.me/${clientPhone}?text=${encodeURIComponent(message)}`;
}

function clientWhatsAppAction(order) {
  const clientPhone = sanitizePhone(order.client_phone);
  if (!clientPhone) {
    return '<button class="button-mini button-whatsapp" disabled>Enviar OS</button>';
  }

  return `<a class="button-mini button-whatsapp" href="${buildClientWhatsAppUrl(order)}" target="_blank" rel="noopener">Enviar OS</a>`;
}

function nfeStatusText(order) {
  if (order.nfe_email_sent_at) return 'Enviada';
  return order.nfe_email_status || 'Pendente';
}

function nfeStatusDetail(order) {
  const parts = [nfeStatusText(order)];
  if (order.nfe_access_key) parts.push(`Chave: ${order.nfe_access_key}`);
  if (order.nfe_url) parts.push('Link salvo');
  return parts.join(' | ');
}

async function loadOrders() {
  try {
    const orders = await apiService.getOrders();
    latestOrders = orders;
    ordersTable.innerHTML = orders.map(order => `
      <tr>
        <td>${order.id}</td>
        <td>${escapeHtml(order.client || '-')}</td>
        <td>${escapeHtml(order.technician || '-')}</td>
        <td><span class="status-badge status-${statusClass(order.status)}">${escapeHtml(order.status)}</span></td>
        <td>${currencyFormatter.format(order.total || 0)}</td>
        <td>${escapeHtml(nfeStatusDetail(order))}</td>
        <td>
          <div class="table-actions">
            <a class="button-mini button-whatsapp" href="${buildCentralWhatsAppUrl(order)}" target="_blank" rel="noopener">Central</a>
            ${clientWhatsAppAction(order)}
            <button class="button-mini button-nfe" onclick="openNfeModal(${order.id})">Enviar NFe</button>
            <button class="button-mini button-paid" onclick="finalizeOrderAsPaid(${order.id})" ${order.paid && normalizeStatus(order.status) === 'concluida' ? 'disabled' : ''}>Finalizar/Pago</button>
          </div>
        </td>
      </tr>
    `).join('');
  } catch (error) {
    toastManager.error('Erro ao carregar ordens');
  }
}

async function loadPublicConfig() {
  try {
    publicConfig = await apiService.getPublicConfig();
  } catch (error) {
    toastManager.error('Configuração do WhatsApp não carregada');
  }
}

async function finalizeOrderAsPaid(orderId) {
  if (!confirm('Finalizar esta OS como concluída e paga? A NFe será enviada para o e-mail do cliente se o SMTP estiver configurado.')) {
    return;
  }

  try {
    const order = await apiService.finalizeOrderAsPaid(orderId);
    toastManager.success(`OS finalizada. NFe: ${order.nfe_email_status || 'processada'}`);
    await loadOrders();
  } catch (error) {
    toastManager.error(error.message);
  }
}

window.finalizeOrderAsPaid = finalizeOrderAsPaid;

function openNfeModal(orderId) {
  const order = latestOrders.find(item => Number(item.id) === Number(orderId));
  if (!order) {
    toastManager.error('OS não encontrada para envio da NFe');
    return;
  }

  selectedNfeOrderId = order.id;
  nfeAccessKey.value = order.nfe_access_key || '';
  nfeUrl.value = order.nfe_url || '';
  nfeOrderSummary.textContent = `OS #${order.id} - ${order.client || 'Cliente'} - ${order.client_email || 'sem e-mail cadastrado'}`;
  nfeModal.classList.add('active');
  nfeModal.setAttribute('aria-hidden', 'false');
  nfeAccessKey.focus();
}

function closeNfeModal() {
  selectedNfeOrderId = null;
  nfeForm.reset();
  nfeModal.classList.remove('active');
  nfeModal.setAttribute('aria-hidden', 'true');
}

async function submitNfe(event) {
  event.preventDefault();
  const payload = {
    nfe_access_key: nfeAccessKey.value.trim(),
    nfe_url: nfeUrl.value.trim()
  };

  if (!payload.nfe_access_key && !payload.nfe_url) {
    toastManager.error('Informe a chave, número ou link da NFe');
    return;
  }

  try {
    const order = await apiService.sendOrderNfe(selectedNfeOrderId, payload);
    toastManager.success(`NFe: ${order.nfe_email_status || 'processada'}`);
    closeNfeModal();
    await loadOrders();
  } catch (error) {
    toastManager.error(error.message);
  }
}

window.openNfeModal = openNfeModal;

async function loadClients() {
  try {
    const clients = await apiService.getClients();
    orderClient.innerHTML = '<option value="">Selecione um cliente</option>' +
      clients.map(client => `<option value="${client.id}">${escapeHtml(client.name)}</option>`).join('');
  } catch (error) {
    toastManager.error('Erro ao carregar clientes');
  }
}

async function loadTechnicians() {
  try {
    const technicians = await apiService.getTechnicians();
    orderTechnician.innerHTML = '<option value="">Selecionar técnico</option>' +
      technicians.map(tech => `<option value="${tech.id}">${escapeHtml(tech.name)}</option>`).join('');
  } catch (error) {
    toastManager.error('Erro ao carregar técnicos');
  }
}

function matchesPrintFilter(order, filter) {
  if (filter === 'todos') return true;
  if (filter === 'pago') return Boolean(order.paid);
  if (filter === 'pendente') return !order.paid;
  return normalizeStatus(order.status) === normalizeStatus(filter);
}

function printFilterLabel(filter) {
  const labels = {
    todos: 'Todos os status',
    Aberta: 'Ordens abertas',
    Concluida: 'Ordens concluídas',
    pago: 'Ordens pagas',
    pendente: 'Ordens com pagamento pendente'
  };

  return labels[filter] || 'Todos os status';
}

function buildOrdersReportRows(orders) {
  if (!orders.length) {
    return '<tr><td colspan="8" class="empty">Nenhuma OS encontrada para o filtro selecionado.</td></tr>';
  }

  return orders.map(order => `
    <tr>
      <td>#${escapeHtml(order.id)}</td>
      <td>${escapeHtml(order.client || '-')}</td>
      <td>${escapeHtml(order.client_phone || '-')}</td>
      <td>${escapeHtml(order.technician || 'A definir')}</td>
      <td>${escapeHtml(order.title || '-')}</td>
      <td>${escapeHtml(order.status || '-')}</td>
      <td>${order.paid ? 'Pago' : 'Pendente'}</td>
      <td>${currencyFormatter.format(order.total || 0)}</td>
    </tr>
  `).join('');
}

function printOrdersReport() {
  const filter = printStatusFilter.value;
  const selectedOrders = latestOrders.filter(order => matchesPrintFilter(order, filter));
  const totalValue = selectedOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const paidValue = selectedOrders
    .filter(order => order.paid)
    .reduce((sum, order) => sum + Number(order.total || 0), 0);
  const pendingValue = selectedOrders
    .filter(order => !order.paid)
    .reduce((sum, order) => sum + Number(order.total || 0), 0);

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    toastManager.error('Permita pop-ups para imprimir o relatório');
    return;
  }

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Relatório de Ordens de Serviço</title>
      <style>
        @page { size: A4 landscape; margin: 12mm; }
        * { box-sizing: border-box; }
        body { font-family: Arial, Helvetica, sans-serif; margin: 0; color: #14213d; }
        header { display: flex; justify-content: space-between; gap: 24px; align-items: flex-start; border-bottom: 3px solid #0f766e; padding-bottom: 14px; margin-bottom: 16px; }
        h1 { margin: 0; font-size: 24px; }
        .muted { color: #64748b; font-size: 12px; margin-top: 4px; }
        .badge { display: inline-block; background: #ecfdf5; color: #047857; border: 1px solid #99f6e4; border-radius: 999px; padding: 7px 10px; font-weight: 700; font-size: 12px; }
        .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 16px 0; }
        .summary div { border: 1px solid #dbe7e9; border-radius: 8px; padding: 10px 12px; background: #fbfdfc; }
        .summary span { display: block; color: #64748b; font-size: 11px; text-transform: uppercase; margin-bottom: 4px; }
        .summary strong { font-size: 16px; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; }
        th, td { border: 1px solid #dbe4ea; padding: 8px; text-align: left; vertical-align: top; }
        th { background: #14213d; color: #ffffff; }
        tr:nth-child(even) { background: #f8fafc; }
        .empty { text-align: center; color: #64748b; padding: 24px; }
        footer { margin-top: 14px; text-align: center; color: #64748b; font-size: 11px; }
      </style>
    </head>
    <body>
      <header>
        <div>
          <h1>RJvidros OS - Relatório de Ordens de Serviço</h1>
          <div class="muted">Gerado em ${new Date().toLocaleString('pt-BR')}</div>
        </div>
        <span class="badge">${printFilterLabel(filter)}</span>
      </header>

      <section class="summary">
        <div><span>Ordens</span><strong>${selectedOrders.length}</strong></div>
        <div><span>Total</span><strong>${currencyFormatter.format(totalValue)}</strong></div>
        <div><span>Pago</span><strong>${currencyFormatter.format(paidValue)}</strong></div>
        <div><span>Pendente</span><strong>${currencyFormatter.format(pendingValue)}</strong></div>
      </section>

      <table>
        <thead>
          <tr>
            <th>OS</th>
            <th>Cliente</th>
            <th>Telefone</th>
            <th>Técnico</th>
            <th>Serviço</th>
            <th>Status</th>
            <th>Pagamento</th>
            <th>Valor</th>
          </tr>
        </thead>
        <tbody>${buildOrdersReportRows(selectedOrders)}</tbody>
      </table>

      <footer>RJvidros OS - Gestão inteligente de manutenção em portas de vidro</footer>
    </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
  setTimeout(() => printWindow.print(), 250);
}

orderForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  orderFeedback.textContent = '';

  const order = {
    client_id: parseInt(orderClient.value, 10),
    technician_id: parseInt(orderTechnician.value, 10) || null,
    title: document.getElementById('orderTitle').value.trim(),
    description: document.getElementById('orderDescription').value.trim(),
    total: parseFloat(document.getElementById('orderTotal').value) || 0,
    paid: document.getElementById('orderPaid').checked,
    status: 'Aberta',
    created_at: new Date().toISOString()
  };

  try {
    await apiService.createOrder(order);
    toastManager.success('Ordem registrada com sucesso');
    orderForm.reset();
    await loadOrders();
  } catch (error) {
    toastManager.error(error.message);
  }
});

document.getElementById('refreshOrders').addEventListener('click', async () => {
  await loadOrders();
  toastManager.success('Ordens atualizadas');
});

document.getElementById('printButton').addEventListener('click', printOrdersReport);
document.getElementById('closeNfeModal').addEventListener('click', closeNfeModal);
nfeForm.addEventListener('submit', submitNfe);
nfeModal.addEventListener('click', (event) => {
  if (event.target === nfeModal) closeNfeModal();
});

loadPublicConfig().then(loadOrders);
loadClients();
loadTechnicians();
