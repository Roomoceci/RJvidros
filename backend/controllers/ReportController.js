class ReportController {
  constructor(reportService) {
    this.reportService = reportService;
  }

  async getFinanceSummary(req, res) {
    try {
      const summary = await this.reportService.getFinanceSummary();
      res.json(summary);
    } catch (error) {
      res.status(500).json({ error: 'Não foi possivel carregar o resumo financeiro.' });
    }
  }

  async getFinanceReport(req, res) {
    try {
      const report = await this.reportService.getFinanceReport();
      res.json(report);
    } catch (error) {
      res.status(500).json({ error: 'Não foi possivel carregar o relatório financeiro.' });
    }
  }

  async getClientReport(req, res) {
    try {
      const report = await this.reportService.getClientReport();
      res.json(report);
    } catch (error) {
      res.status(500).json({ error: 'Não foi possivel carregar o relatório de clientes.' });
    }
  }

  async getTechnicianReport(req, res) {
    try {
      const report = await this.reportService.getTechnicianReport();
      res.json(report);
    } catch (error) {
      res.status(500).json({ error: 'Não foi possivel carregar o relatório de técnicos.' });
    }
  }
}

module.exports = ReportController;
