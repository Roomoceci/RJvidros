class Technician {
  constructor(id, name, phone, email, specialty, status, notes = null, createdAt = null) {
    this.id = id;
    this.name = name;
    this.phone = phone;
    this.email = email;
    this.specialty = specialty;
    this.status = status;
    this.notes = notes;
    this.createdAt = createdAt || new Date().toISOString();
  }

  static fromRow(row) {
    return new Technician(row.id, row.name, row.phone, row.email, row.specialty, row.status, row.notes, row.created_at);
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      phone: this.phone,
      email: this.email,
      specialty: this.specialty,
      status: this.status,
      notes: this.notes,
      created_at: this.createdAt
    };
  }

  isActive() {
    return this.status === 'Ativo';
  }
}

module.exports = Technician;
