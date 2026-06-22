const Technician = require('../models/Technician');

class TechnicianService {
  constructor(db) {
    this.db = db;
  }

  async getAllTechnicians() {
    const rows = await this.db.getTechnicians();
    return rows.map(row => Technician.fromRow(row));
  }

  async getActiveTechnicians() {
    const technicians = await this.getAllTechnicians();
    return technicians.filter(t => t.isActive());
  }

  async createTechnician(data) {
    this.validateTechnicianData(data);
    const id = await this.db.createTechnician({
      name: data.name,
      phone: data.phone,
      email: data.email,
      specialty: data.specialty,
      status: data.status || 'Ativo',
      notes: data.notes
    });
    return { id, ...data };
  }

  validateTechnicianData(data) {
    if (!data.name || !data.name.trim()) {
      throw new Error('Nome do técnico é obrigatório');
    }
    if (!data.email || !this.isValidEmail(data.email)) {
      throw new Error('Email válido é obrigatório');
    }
    if (data.status && !['Ativo', 'Inativo'].includes(data.status)) {
      throw new Error('Status inválido');
    }
  }

  isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }
}

module.exports = TechnicianService;
