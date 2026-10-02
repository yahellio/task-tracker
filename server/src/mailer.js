import nodemailer from 'nodemailer';

export const createMailer = ({ smtpUrl, from, appUrl, logger }) => {
  const transport = smtpUrl === '' ? null : nodemailer.createTransport(smtpUrl);

  if (transport !== null) {
    transport.verify().then(
      () => logger.info('mail.ready'),
      (error) => logger.error('mail.unavailable', { message: error.message })
    );
  }

  return {
    async sendPasswordReset(email, token) {
      const link = `${appUrl}/reset-password?token=${token}`;

      if (transport === null) {
        logger.warn('mail.not_configured', { to: email, link });
        return;
      }

      try {
        const info = await transport.sendMail({
          from,
          to: email,
          subject: 'Восстановление доступа к трекеру задач',
          text: `Чтобы задать новый пароль, перейдите по ссылке: ${link}\nСсылка действует ограниченное время.`
        });
        const preview = nodemailer.getTestMessageUrl(info);
        logger.info('mail.sent', { to: email, messageId: info.messageId, ...(preview ? { preview } : {}) });
      } catch (error) {
        logger.error('mail.failed', { to: email, message: error.message });
      }
    }
  };
};
