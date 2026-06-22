const nodemailer = require('nodemailer');

class EmailService {
  constructor(config = process.env) {
    this.config = config;
  }

  isConfigured() {
    return Boolean(this.config.SMTP_HOST && this.config.SMTP_USER && this.config.SMTP_PASS);
  }

  createTransporter() {
    return nodemailer.createTransport({
      host: this.config.SMTP_HOST,
      port: Number(this.config.SMTP_PORT || 587),
      secure: String(this.config.SMTP_SECURE || '').toLowerCase() === 'true',
      auth: {
        user: this.config.SMTP_USER,
        pass: this.config.SMTP_PASS
      }
    });
  }

  buildNfeText(order) {
    return [
      `NFe / comprovante da Ordem de ServiÃ§o #${order.id}`,
      '',
      `Cliente: ${order.client || '-'}`,
      `ServiÃ§o: ${order.title || '-'}`,
      `DescriÃ§Ã£o: ${order.description || '-'}`,
      `TÃ©cnico: ${order.technician || 'A definir'}`,
      `Valor: R$ ${Number(order.total || 0).toFixed(2)}`,
      `Status: ${order.status}`,
      `Pagamento: ${order.paid ? 'Pago' : 'Pendente'}`,
      `Finalizada em: ${order.completed_at || new Date().toISOString()}`,
      '',
      'Obrigado pela preferÃªncia.',
      'RJvidros OS'
    ].join('\n');
  }

  async sendOrderNfe(order) {
    if (!this.isConfigured()) {
      return { sent: false, reason: 'SMTP nÃ£o configurado' };
    }

    if (!order.client_email) {
      return { sent: false, reason: 'cliente sem e-mail cadastrado' };
    }

    const from = this.config.SMTP_FROM || this.config.SMTP_USER;
    const text = this.buildNfeText(order);

    await this.createTransporter().sendMail({
      from,
      to: order.client_email,
      subject: `NFe da Ordem de ServiÃ§o #${order.id} - RJvidros`,
      text,
      attachments: [
        {
          filename: `nfe-os-${order.id}.txt`,
          content: text
        }
      ]
    });

    return { sent: true };
  }
}

module.exports = EmailService;
