class ReportService {
  constructor(db) {
    this.db = db;
  }

  getFinanceSummary() {
    return this.db.getFinanceSummary();
  }

  async getFinanceReport() {
    const [summary, monthly] = await Promise.all([
      this.db.getFinanceReport(),
      this.db.getMonthlyRevenueReport()
    ]);

    return { summary, monthly };
  }

  getClientReport() {
    return this.db.getClientReport();
  }

  getTechnicianReport() {
    return this.db.getTechnicianReport();
  }
}

module.exports = ReportService;
