class ServiceRequestController {
  constructor(serviceRequestService) {
    this.serviceRequestService = serviceRequestService;
  }

  async getAll(req, res) {
    try {
      const requests = await this.serviceRequestService.getAllRequests();
      res.json(requests);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async getPending(req, res) {
    try {
      const requests = await this.serviceRequestService.getPendingRequests();
      res.json(requests);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async getById(req, res) {
    try {
      const request = await this.serviceRequestService.getRequestById(req.params.id);
      if (!request) {
        return res.status(404).json({ error: 'Requisição não encontrada' });
      }
      res.json(request);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async create(req, res) {
    try {
      const request = await this.serviceRequestService.createRequest(req.body);
      res.status(201).json(request);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async updateStatus(req, res) {
    try {
      const { status } = req.body;
      const request = await this.serviceRequestService.updateRequestStatus(req.params.id, status);
      res.json(request);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async convertToOrder(req, res) {
    try {
      const result = await this.serviceRequestService.convertRequestToOrder(req.params.id, req.body);
      res.status(201).json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async getServiceTypes(req, res) {
    try {
      const types = this.serviceRequestService.getServiceTypes();
      res.json(types);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = ServiceRequestController;
