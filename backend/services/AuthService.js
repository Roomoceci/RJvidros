const { createToken, hashPassword, isPasswordHash, verifyPassword } = require('../utils/security');

class AuthService {
  constructor(db) {
    this.db = db;
  }

  async authenticate(email, password) {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const user = await this.db.getUserByEmail(normalizedEmail);
    
    if (!user) {
      throw new Error('Usuário ou senha inválidos');
    }

    if (!verifyPassword(password, user.password)) {
      throw new Error('Usuário ou senha inválidos');
    }

    if (!isPasswordHash(user.password)) {
      await this.db.updateUserPassword(user.id, hashPassword(password));
    }

    return {
      token: createToken(user),
      name: user.name,
      email: user.email
    };
  }

  generateToken(user) {
    return {
      token: createToken(user),
      name: user.name,
      email: user.email
    };
  }
}

module.exports = AuthService;
