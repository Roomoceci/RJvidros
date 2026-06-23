class OrderService {
  constructor(db, emailService = null) {
    this.db = db;
    this.emailService = emailService;
  }

  getAllOrders() {
    return this.db.getOrders();
  }

  async getOpenOrders() {
    const orders = await this.getAllOrders();
    return orders.filter(order => order.status === 'Aberta');
  }

  async getClosedOrders() {
    const orders = await this.getAllOrders();
    return orders.filter(order => order.status === 'Concluída' || order.status === 'ConcluÒ­da');
  }

  async getOrderById(id) {
    const order = await this.db.getOrderById(id);
    if (!order) {
      throw new Error('Ordem de serviço não encontrada');
    }

    return order;
  }

  async createOrder(data) {
    this.validateOrderData(data);
    const id = await this.db.createOrder({
      client_id: data.client_id,
      technician_id: data.technician_id,
      title: data.title,
      description: data.description,
      total: data.total,
      paid: data.paid,
      status: data.status || 'Aberta',
      created_at: data.created_at || new Date().toISOString()
    });

    return { id, ...data };
  }

  async finalizeAsPaid(id) {
    const order = await this.db.getOrderById(id);
    if (!order) {
      throw new Error('Ordem de serviço não encontrada');
    }

    const updatedOrder = await this.db.finalizeOrderAsPaid(id, 'Pendente de envio');

    if (!this.emailService) {
      return this.db.markOrderNfeEmailPending(id, 'serviço de e-mail indisponível');
    }

    try {
      const result = await this.emailService.sendOrderNfe(updatedOrder);
      if (result.sent) {
        return this.db.markOrderNfeEmailSent(id);
      }

      return this.db.markOrderNfeEmailPending(id, result.reason);
    } catch (error) {
      return this.db.markOrderNfeEmailPending(id, error.message);
    }
  }

  async sendNfe(id, data = {}) {
    const order = await this.db.getOrderById(id);
    if (!order) {
      throw new Error('Ordem de serviço não encontrada');
    }

    const nfeData = this.normalizeNfeData(data);
    const updatedOrder = await this.db.saveOrderNfeData(id, nfeData);

    if (!this.emailService) {
      return this.db.markOrderNfeEmailPending(id, 'serviço de e-mail indisponível');
    }

    try {
      const result = await this.emailService.sendOrderNfe(updatedOrder, nfeData);
      if (result.sent) {
        return this.db.markOrderNfeEmailSent(id);
      }

      return this.db.markOrderNfeEmailPending(id, result.reason);
    } catch (error) {
      return this.db.markOrderNfeEmailPending(id, error.message);
    }
  }

  validateOrderData(data) {
    if (!data.client_id) {
      throw new Error('Cliente e obrigatório');
    }
    if (!data.title || !data.title.trim()) {
      throw new Error('Titulo da ordem e obrigatório');
    }
    if (data.total && Number.isNaN(parseFloat(data.total))) {
      throw new Error('Valor deve ser um numero válido');
    }
  }

  normalizeNfeData(data) {
    const cleanText = (value, maxLength) => String(value || '')
      .replace(/[<>]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, maxLength);

    const nfeAccessKey = cleanText(data.nfe_access_key || data.nfeAccessKey, 80);
    const nfeUrl = cleanText(data.nfe_url || data.nfeUrl, 500);

    if (!nfeAccessKey && !nfeUrl) {
      throw new Error('Informe a chave, número ou link da NFe');
    }

    if (nfeUrl && !/^https?:\/\/\S+\.\S+/.test(nfeUrl)) {
      throw new Error('Link da NFe deve começar com http:// ou https://');
    }

    return {
      nfe_access_key: nfeAccessKey,
      nfe_url: nfeUrl
    };
  }
}

module.exports = OrderService;
