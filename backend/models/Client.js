class Client {
  constructor(id, name, phone, email, address, notes = null, createdAt = null) {
    this.id = id;
    this.name = name;
    this.phone = phone;
    this.email = email;
    this.address = address;
    this.notes = notes;
    this.createdAt = createdAt || new Date().toISOString();
  }

  static fromRow(row) {
    return new Client(row.id, row.name, row.phone, row.email, row.address, row.notes, row.created_at);
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      phone: this.phone,
      email: this.email,
      address: this.address,
      notes: this.notes,
      created_at: this.createdAt
    };
  }
}

module.exports = Client;
