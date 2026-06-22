class TechnicianController {
  constructor(technicianService) {
    this.technicianService = technicianService;
  }

  async getAll(req, res) {
    try {
      const technicians = await this.technicianService.getAllTechnicians();
      res.json(technicians);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async getActive(req, res) {
    try {
      const technicians = await this.technicianService.getActiveTechnicians();
      res.json(technicians);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async create(req, res) {
    try {
      const technician = await this.technicianService.createTechnician(req.body);
      res.status(201).json(technician);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
}

module.exports = TechnicianController;
