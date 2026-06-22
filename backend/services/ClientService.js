const Client = require('../models/Client');

class ClientService {
  constructor(db) {
    this.db = db;
  }

  async getAllClients() {
    const rows = await this.db.getClients();
    return rows.map(row => Client.fromRow(row));
  }

  async createClient(data) {
    this.validateClientData(data);
    const id = await this.db.createClient({
      name: data.name,
      phone: data.phone,
      email: data.email,
      address: data.address,
      notes: data.notes
    });
    return { id, ...data };
  }

  validateClientData(data) {
    if (!data.name || !data.name.trim()) {
      throw new Error('Nome do cliente é obrigatório');
    }
    if (data.email && !this.isValidEmail(data.email)) {
      throw new Error('Email inválido');
    }
  }

  isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }
}

module.exports = ClientService;
