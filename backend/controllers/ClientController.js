class ClientController {
  constructor(clientService) {
    this.clientService = clientService;
  }

  async getAll(req, res) {
    try {
      const clients = await this.clientService.getAllClients();
      res.json(clients);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async create(req, res) {
    try {
      const client = await this.clientService.createClient(req.body);
      res.status(201).json(client);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
}

module.exports = ClientController;
