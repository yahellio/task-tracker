import nodemailer from 'nodemailer';

export const createMailer = ({ smtpUrl, from, appUrl, logger }) => {
  const transport = smtpUrl === '' ? null : nodemailer.createTransport(smtpUrl);

  return {
    async sendPasswordReset(email, token) {
      const link = `${appUrl}/reset-password?token=${token}`;
      const message = {
        from,
        to: email,
        subject: 'Восстановление доступа к трекеру задач',
        text: `Чтобы задать новый пароль, перейдите по ссылке: ${link}\nСсылка действует ограниченное время.`
      };

      if (transport === null) {
        logger.warn('mail.not_configured', { to: email, link });
        return;
      }

      await transport.sendMail(message);
      logger.info('mail.sent', { to: email, kind: 'password_reset' });
    }
  };
};
