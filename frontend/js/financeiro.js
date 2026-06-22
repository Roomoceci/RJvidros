const apiService = new ApiService();
const authManager = new AuthManager(apiService);
const toastElement = document.getElementById('toast');
const toastManager = new ToastManager(toastElement);
const uiManager = new UIManager(authManager, apiService);

uiManager.initializePage();

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

function money(value) {
  return currency.format(Number(value || 0));
}

function monthLabel(value) {
  if (!value) return '-';
  const [year, month] = String(value).split('-');
  return `${month}/${year}`;
}

function emptyRow(colspan, message) {
  return `<tr><td colspan="${colspan}">${message}</td></tr>`;
}

async function loadFinancePage() {
  try {
    const [summary, financeReport, clientReport, technicianReport] = await Promise.all([
      apiService.getFinanceSummary(),
      apiService.getFinanceReport(),
      apiService.getClientReport(),
      apiService.getTechnicianReport()
    ]);

    document.getElementById('dailyRevenue').textContent = money(summary.dailyRevenue);
    document.getElementById('monthlyRevenue').textContent = money(summary.monthlyRevenue);
    document.getElementById('pendingOrders').textContent = summary.pendingOrders;
    document.getElementById('averageTicket').textContent = money(summary.averageTicket);
    document.getElementById('totalRevenue').textContent = money(summary.totalRevenue);
    document.getElementById('pendingAmount').textContent = money(summary.pendingAmount);
    document.getElementById('paidOrders').textContent = summary.paidOrders;

    renderFinanceStatus(financeReport.summary);
    renderMonthlyRevenue(financeReport.monthly);
    renderClientReport(clientReport);
    renderTechnicianReport(technicianReport);
  } catch (error) {
    toastManager.error(error.message || 'Erro ao carregar financeiro');
  }
}

function renderFinanceStatus(rows) {
  const table = document.getElementById('financeStatusTable');

  if (!rows.length) {
    table.innerHTML = emptyRow(4, 'Nenhuma ordem encontrada.');
    return;
  }

  table.innerHTML = rows.map(row => `
    <tr>
      <td>${row.status || '-'}</td>
      <td>${row.paid ? 'Pago' : 'Pendente'}</td>
      <td>${row.orders}</td>
      <td>${money(row.total)}</td>
    </tr>
  `).join('');
}

function renderMonthlyRevenue(rows) {
  const table = document.getElementById('monthlyRevenueTable');

  if (!rows.length) {
    table.innerHTML = emptyRow(4, 'Nenhum faturamento encontrado.');
    return;
  }

  table.innerHTML = rows.map(row => `
    <tr>
      <td>${monthLabel(row.month)}</td>
      <td>${row.orders}</td>
      <td>${money(row.paidRevenue)}</td>
      <td>${money(row.pendingRevenue)}</td>
    </tr>
  `).join('');
}

function renderClientReport(rows) {
  const table = document.getElementById('clientReportTable');

  if (!rows.length) {
    table.innerHTML = emptyRow(4, 'Nenhum cliente encontrado.');
    return;
  }

  table.innerHTML = rows.map(row => `
    <tr>
      <td>${row.name}</td>
      <td>${row.orders}</td>
      <td>${money(row.total)}</td>
      <td>${money(row.paidTotal)}</td>
    </tr>
  `).join('');
}

function renderTechnicianReport(rows) {
  const table = document.getElementById('technicianReportTable');

  if (!rows.length) {
    table.innerHTML = emptyRow(4, 'Nenhum tecnico encontrado.');
    return;
  }

  table.innerHTML = rows.map(row => `
    <tr>
      <td>${row.name}</td>
      <td>${row.orders}</td>
      <td>${row.closedOrders}</td>
      <td>${money(row.total)}</td>
    </tr>
  `).join('');
}

document.getElementById('refreshFinance').addEventListener('click', async () => {
  await loadFinancePage();
  toastManager.success('Financeiro atualizado!');
});

document.getElementById('printReport').addEventListener('click', () => {
  window.print();
});

loadFinancePage();
