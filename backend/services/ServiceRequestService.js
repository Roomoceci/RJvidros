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

    const clientId = await this.syncClientFromRequest(id, cleanData);

    return { id, client_id: clientId, ...cleanData };
  }

  async updateRequestStatus(id, status) {
    if (!['Pendente', 'Aprovada', 'Agendada', 'Concluida', 'Concluída', 'Cancelada'].includes(status)) {
      throw new Error('Status inválido');
    }

    await this.db.run('UPDATE service_requests SET status = ? WHERE id = ?', [status, id]);
    return this.getRequestById(id);
  }

  async convertRequestToOrder(id, data = {}) {
    const request = await this.getRequestById(id);
    if (!request) {
      throw new Error('Solicitação não encontrada');
    }

    if (request.status === 'Cancelada') {
      throw new Error('Solicitação cancelada não pode virar OS');
    }

    if (['Agendada', 'Concluida', 'Concluída'].includes(request.status)) {
      throw new Error('Esta solicitação já foi encaminhada ou concluída');
    }

    const total = Number(data.total || 0);
    if (Number.isNaN(total) || total < 0) {
      throw new Error('Valor da OS inválido');
    }

    const hasTechnician = data.technician_id !== undefined && data.technician_id !== null && data.technician_id !== '';
    const technicianId = hasTechnician ? Number(data.technician_id) : null;
    if (hasTechnician && (!Number.isInteger(technicianId) || technicianId <= 0)) {
      throw new Error('Técnico inválido ou inativo');
    }

    if (technicianId) {
      const technician = await this.db.queryGet(
        'SELECT id FROM technicians WHERE id = ? AND status = ?',
        [technicianId, 'Ativo']
      );
      if (!technician) {
        throw new Error('Técnico inválido ou inativo');
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
        notes: `Criado a partir da solicitação #${request.id}`
      });
    }

    const orderTitle = data.title || request.serviceType;
    const orderDescription = [
      request.description,
      '',
      `Endereço: ${request.address}`,
      request.preferred_date ? `Data preferida: ${request.preferred_date}` : null,
      request.notes ? `Observações: ${request.notes}` : null,
      `Origem: solicitação #${request.id}`
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
      throw new Error('Solicitação inválida');
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
      throw new Error('Nome do cliente é obrigatório');
    }
    if (name.trim().length < 3 || name.trim().length > 120) {
      throw new Error('Nome deve ter entre 3 e 120 caracteres');
    }
    if (!phone || !this.isValidPhone(phone)) {
      throw new Error('Telefone válido e obrigatório');
    }
    if (!email || !this.isValidEmail(email)) {
      throw new Error('Email válido e obrigatório');
    }
    if (!serviceType || !this.getServiceTypes().includes(serviceType)) {
      throw new Error('Tipo de serviço é obrigatório');
    }
    if (!description || description.trim().length < 10 || description.trim().length > 1200) {
      throw new Error('Descrição deve ter entre 10 e 1200 caracteres');
    }
    if (!address || address.trim().length < 8 || address.trim().length > 240) {
      throw new Error('Endereço deve ter entre 8 e 240 caracteres');
    }
    if (preferredDate && this.isPastDate(preferredDate)) {
      throw new Error('Data preferida não pode estar no passado');
    }
    if (notes && String(notes).length > 800) {
      throw new Error('Observações devem ter no máximo 800 caracteres');
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

  async syncClientFromRequest(requestId, data) {
    const email = data.clientEmail;
    const phoneDigits = String(data.clientPhone || '').replace(/\D/g, '');
    let client = await this.db.getClientByEmail(email);

    if (!client && phoneDigits) {
      client = await this.db.queryGet(
        "SELECT * FROM clients WHERE REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(IFNULL(phone, ''), ' ', ''), '-', ''), '(', ''), ')', ''), '+', '') = ?",
        [phoneDigits]
      );
    }

    const notesLine = `Solicitação recebida automaticamente #${requestId}`;

    if (!client) {
      return this.db.createClient({
        name: data.clientName,
        phone: data.clientPhone,
        email,
        address: data.address,
        notes: notesLine
      });
    }

    const notes = String(client.notes || '').includes(notesLine)
      ? client.notes
      : [client.notes, notesLine].filter(Boolean).join('\n');

    await this.db.run(
      `UPDATE clients
        SET name = COALESCE(NULLIF(name, ''), ?),
            phone = COALESCE(NULLIF(phone, ''), ?),
            email = COALESCE(NULLIF(email, ''), ?),
            address = COALESCE(NULLIF(address, ''), ?),
            notes = ?
        WHERE id = ?`,
      [data.clientName, data.clientPhone, email, data.address, notes, client.id]
    );

    return client.id;
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
      'Manutenção de Mola Hidráulica',
      'Regulagem de Mola de Piso',
      'Troca de Mola de Piso',
      'Reparo de Porta de Vidro',
      'Troca de Pivô ou Ferragem',
      'Instalação de Mola Hidráulica',
      'Inspeção Técnica',
      'Outro'
    ];
  }
}

module.exports = ServiceRequestService;
