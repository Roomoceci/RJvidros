const ServiceRequest = require('../models/ServiceRequest');

class ServiceRequestService {
  constructor(db) {
    this.db = db;
  }

  async getAllRequests() {
    const rows = await this.db.queryAll('SELECT * FROM service_requests ORDER BY created_at DESC');
    return rows.map(row => ServiceRequest.fromRow(row));
  }

  async getPendingRequests() {
    const rows = await this.db.queryAll('SELECT * FROM service_requests WHERE status = "Pendente" ORDER BY created_at DESC');
    return rows.map(row => ServiceRequest.fromRow(row));
  }

  async getRequestById(id) {
    const row = await this.db.queryGet('SELECT * FROM service_requests WHERE id = ?', [id]);
    return row ? ServiceRequest.fromRow(row) : null;
  }

  async createRequest(data) {
    this.validateRequestData(data);
    const cleanData = this.normalizeRequestData(data);

    const id = await this.db.run(
      'INSERT INTO service_requests (client_name, client_phone, client_email, service_type, description, address, preferred_date, notes, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        cleanData.clientName,
        cleanData.clientPhone,
        cleanData.clientEmail,
        cleanData.serviceType,
        cleanData.description,
        cleanData.address,
        cleanData.preferredDate,
        cleanData.notes,
        'Pendente',
        new Date().toISOString()
      ]
    );

    return { id, ...cleanData };
  }

  async updateRequestStatus(id, status) {
    if (!['Pendente', 'Aprovada', 'Agendada', 'Concluida', 'Concluída', 'Cancelada'].includes(status)) {
      throw new Error('Status invalido');
    }

    await this.db.run('UPDATE service_requests SET status = ? WHERE id = ?', [status, id]);
    return this.getRequestById(id);
  }

  async convertRequestToOrder(id, data = {}) {
    const request = await this.getRequestById(id);
    if (!request) {
      throw new Error('Solicitacao nao encontrada');
    }

    if (request.status === 'Cancelada') {
      throw new Error('Solicitacao cancelada nao pode virar OS');
    }

    if (['Agendada', 'Concluida', 'Concluída'].includes(request.status)) {
      throw new Error('Esta solicitacao ja foi encaminhada ou concluida');
    }

    const total = Number(data.total || 0);
    if (Number.isNaN(total) || total < 0) {
      throw new Error('Valor da OS invalido');
    }

    const hasTechnician = data.technician_id !== undefined && data.technician_id !== null && data.technician_id !== '';
    const technicianId = hasTechnician ? Number(data.technician_id) : null;
    if (hasTechnician && (!Number.isInteger(technicianId) || technicianId <= 0)) {
      throw new Error('Tecnico invalido ou inativo');
    }

    if (technicianId) {
      const technician = await this.db.queryGet(
        'SELECT id FROM technicians WHERE id = ? AND status = ?',
        [technicianId, 'Ativo']
      );
      if (!technician) {
        throw new Error('Tecnico invalido ou inativo');
      }
    }

    let client = await this.db.getClientByEmail(request.clientEmail);
    let clientId = client?.id;

    if (!clientId) {
      clientId = await this.db.createClient({
        name: request.clientName,
        phone: request.clientPhone,
        email: request.clientEmail,
        address: request.address,
        notes: `Criado a partir da solicitacao #${request.id}`
      });
    }

    const orderTitle = data.title || request.serviceType;
    const orderDescription = [
      request.description,
      '',
      `Endereco: ${request.address}`,
      request.preferred_date ? `Data preferida: ${request.preferred_date}` : null,
      request.notes ? `Observacoes: ${request.notes}` : null,
      `Origem: solicitacao #${request.id}`
    ].filter(Boolean).join('\n');

    const orderId = await this.db.createOrder({
      client_id: clientId,
      technician_id: technicianId,
      title: orderTitle,
      description: orderDescription,
      total,
      paid: false,
      status: data.status || 'Aberta',
      created_at: new Date().toISOString()
    });

    await this.db.run('UPDATE service_requests SET status = ? WHERE id = ?', ['Agendada', id]);

    return {
      order_id: orderId,
      client_id: clientId,
      request: await this.getRequestById(id)
    };
  }

  validateRequestData(data) {
    if (data.request_check || data.company || data.website || data._gotcha) {
      throw new Error('Solicitacao invalida');
    }

    const name = data.clientName || data.client_name;
    const phone = data.clientPhone || data.client_phone;
    const email = data.clientEmail || data.client_email;
    const serviceType = data.serviceType || data.service_type;
    const description = data.description;
    const address = data.address;
    const preferredDate = data.preferredDate || data.preferred_date;
    const notes = data.notes;

    if (!name || !name.trim()) {
      throw new Error('Nome do cliente e obrigatorio');
    }
    if (name.trim().length < 3 || name.trim().length > 120) {
      throw new Error('Nome deve ter entre 3 e 120 caracteres');
    }
    if (!phone || !this.isValidPhone(phone)) {
      throw new Error('Telefone valido e obrigatorio');
    }
    if (!email || !this.isValidEmail(email)) {
      throw new Error('Email valido e obrigatorio');
    }
    if (!serviceType || !this.getServiceTypes().includes(serviceType)) {
      throw new Error('Tipo de servico e obrigatorio');
    }
    if (!description || description.trim().length < 10 || description.trim().length > 1200) {
      throw new Error('Descricao deve ter entre 10 e 1200 caracteres');
    }
    if (!address || address.trim().length < 8 || address.trim().length > 240) {
      throw new Error('Endereco deve ter entre 8 e 240 caracteres');
    }
    if (preferredDate && this.isPastDate(preferredDate)) {
      throw new Error('Data preferida nao pode estar no passado');
    }
    if (notes && String(notes).length > 800) {
      throw new Error('Observacoes devem ter no maximo 800 caracteres');
    }
  }

  normalizeRequestData(data) {
    const cleanText = (value, maxLength) => String(value || '')
      .replace(/[<>]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, maxLength);

    return {
      clientName: cleanText(data.clientName || data.client_name, 120),
      clientPhone: String(data.clientPhone || data.client_phone || '').replace(/[^\d()+\-\s]/g, '').trim().slice(0, 32),
      clientEmail: String(data.clientEmail || data.client_email || '').trim().toLowerCase().slice(0, 160),
      serviceType: cleanText(data.serviceType || data.service_type, 80),
      description: cleanText(data.description, 1200),
      address: cleanText(data.address, 240),
      preferredDate: data.preferredDate || data.preferred_date || null,
      notes: cleanText(data.notes, 800)
    };
  }

  isValidEmail(email) {
    const value = String(email || '').trim();
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return value.length <= 160 && re.test(value);
  }

  isValidPhone(phone) {
    const digits = String(phone || '').replace(/\D/g, '');
    return digits.length >= 10 && digits.length <= 13;
  }

  isPastDate(value) {
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return true;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  }

  getServiceTypes() {
    return [
      'Box de Banheiro',
      'Porta de Vidro',
      'Guarda-corpo',
      'Espelho sob medida',
      'Fechamento de Sacada',
      'Manutencao de Mola Hidraulica',
      'Troca de Vidro',
      'Instalacao Comercial',
      'Reparo ou Regulagem',
      'Outro'
    ];
  }
}

module.exports = ServiceRequestService;
