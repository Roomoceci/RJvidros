class ServiceRequest {
  constructor(id, clientName, clientPhone, clientEmail, serviceType, description, address, preferredDate, notes, status, createdAt) {
    this.id = id;
    this.clientName = clientName;
    this.clientPhone = clientPhone;
    this.clientEmail = clientEmail;
    this.serviceType = serviceType;
    this.description = description;
    this.address = address;
    this.preferredDate = preferredDate;
    this.notes = notes;
    this.status = status || 'Pendente';
    this.createdAt = createdAt || new Date().toISOString();
  }

  static fromRow(row) {
    return new ServiceRequest(
      row.id,
      row.client_name,
      row.client_phone,
      row.client_email,
      row.service_type,
      row.description,
      row.address,
      row.preferred_date,
      row.notes,
      row.status,
      row.created_at
    );
  }

  toJSON() {
    return {
      id: this.id,
      client_name: this.clientName,
      client_phone: this.clientPhone,
      client_email: this.clientEmail,
      service_type: this.serviceType,
      description: this.description,
      address: this.address,
      preferred_date: this.preferredDate,
      notes: this.notes,
      status: this.status,
      created_at: this.createdAt
    };
  }

  isPending() {
    return this.status === 'Pendente';
  }

  isApproved() {
    return this.status === 'Aprovada';
  }

  isScheduled() {
    return this.status === 'Agendada';
  }
}

module.exports = ServiceRequest;
