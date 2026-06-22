class OrderController {
  constructor(orderService) {
    this.orderService = orderService;
  }

  async getAll(req, res) {
    try {
      const orders = await this.orderService.getAllOrders();
      res.json(orders);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async getOpen(req, res) {
    try {
      const orders = await this.orderService.getOpenOrders();
      res.json(orders);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async getClosed(req, res) {
    try {
      const orders = await this.orderService.getClosedOrders();
      res.json(orders);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async getById(req, res) {
    try {
      const order = await this.orderService.getOrderById(req.params.id);
      res.json(order);
    } catch (error) {
      res.status(404).json({ error: error.message });
    }
  }

  async create(req, res) {
    try {
      const order = await this.orderService.createOrder(req.body);
      res.status(201).json(order);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async finalizeAsPaid(req, res) {
    try {
      const order = await this.orderService.finalizeAsPaid(req.params.id);
      res.json(order);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
}

module.exports = OrderController;
