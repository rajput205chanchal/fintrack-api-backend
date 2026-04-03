const nodeMailer = require("nodemailer");

const transporter = nodeMailer.createTransport({
  service: "gmail",
  auth: {
    type: "OAuth2",
    user: process.env.EMAIL_USER,
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    refreshToken: process.env.REFRESH_TOKEN,
  },
});

// verify transporter
transporter.verify(function (error, success) {
  if (error) {
    console.log("error connecting to email transporter", error);
  } else {
    console.log("Email transporter is ready");
  }
});

// send email function (promise style)
const sendEmail = (to, subject, text, html) => {
  const mailOptions = {
    from: `"chanchal rajput" <${process.env.EMAIL_USER}>`,
    to: to,
    subject: subject,
    text: text,
    html: html,
  };

  return new Promise((resolve, reject) => {
    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        console.error("Error sending email:", error);
        return reject(error);
      }
      console.log("Email sent:", info.response);
      return resolve(info);
    });
  });
};

// registration email
async function sendRegistrationEmail(userEmail, name) {
  const subject = "Welcome to our service!";

  const text = `Dear ${name},

Thank you for registering with our service.
We are excited to have you on board!

Best regards,
The Team`;

  const html = `
        <p>Dear ${name},</p>
        <p>Thank you for registering with our service. We are excited to have you on board!</p>
        <p>Best regards,<br>The Team</p>
    `;

  return sendEmail(userEmail, subject, text, html);
}

async function sendTransactionEmail(userEmail, name, amount, toAccount) {
  const subject = "Transaction Notification";

  const text = `Dear ${name},

You have successfully completed a transaction of amount $${amount} to account ${toAccount}.

Best regards,
The Team`;

  const html = `
        <p>Dear ${name},</p>
        <p>You have successfully completed a transaction of amount $${amount} to account ${toAccount}.</p>
        <p>Best regards,<br>The Team</p>
    `;

  return sendEmail(userEmail, subject, text, html);
}

async function sendTransactionFailedEmail(userEmail, name, amount, toAccount) {
  const subject = "Transaction Failed Notification";
  const text = `Dear ${name},

Your transaction of amount $${amount} to account ${toAccount} has failed.

Best regards,
The Team`;

  const html = `
        <p>Dear ${name},</p>
        <p>Your transaction of amount $${amount} to account ${toAccount} has failed.</p>
        <p>Best regards,<br>The Team</p>
    `;

  return sendEmail(userEmail, subject, text, html);
}


module.exports = {
  sendRegistrationEmail,
  sendTransactionEmail,
  sendTransactionFailedEmail
};
