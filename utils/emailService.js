
const nodemailer = require('nodemailer');
const logger = require('./logger');

// ─────────────────────────────────────────────
//  TRANSPORTER CONFIGURATION
// ─────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

transporter.verify()
  .then(() => logger.info('Email service connected successfully'))
  .catch((err) => logger.warn('Email service connection failed — emails will not be sent', { error: err.message }));

// ─────────────────────────────────────────────
//  EMAIL TEMPLATES
// ─────────────────────────────────────────────

const wrapTemplate = (title, content) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; margin: 0; padding: 0; background-color: #f3f4f6; }
    .container { max-width: 560px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #1e3a5f, #2e75b6); color: white; padding: 24px; border-radius: 12px 12px 0 0; text-align: center; }
    .header h1 { margin: 0; font-size: 20px; font-weight: 700; }
    .header p { margin: 4px 0 0; font-size: 13px; opacity: 0.85; }
    .body { background: white; padding: 24px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb; border-top: none; }
    .body h2 { margin: 0 0 12px; font-size: 16px; color: #1f2937; }
    .body p { margin: 0 0 12px; font-size: 14px; color: #4b5563; line-height: 1.6; }
    .credentials { background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 16px; margin: 16px 0; }
    .credentials .label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #0369a1; font-weight: 600; }
    .credentials .value { font-size: 15px; color: #0c4a6e; font-weight: 700; font-family: 'Consolas', 'Monaco', monospace; margin-top: 2px; }
    .footer { text-align: center; padding: 16px 24px; font-size: 11px; color: #9ca3af; }
    .footer a { color: #6b7280; text-decoration: none; }
    .button { display: inline-block; background: #2563eb; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600; margin-top: 8px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Teamwork ERP</h1>
      <p>Enterprise Resource Planning System</p>
    </div>
    <div class="body">
      <h2>${title}</h2>
      ${content}
    </div>
    <div class="footer">
      <p>This is an automated message from Teamwork ERP. Please do not reply to this email.</p>
      <p>&copy; ${new Date().getFullYear()} Teamwork IT Solution PLC. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`;

// ─────────────────────────────────────────────
//  SEND FUNCTIONS
// ─────────────────────────────────────────────

const sendEmail = async ({ to, subject, title, content }) => {
  try {
    const html = wrapTemplate(title, content);
    const info = await transporter.sendMail({
      from: `"${process.env.SMTP_FROM}" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });
    logger.info('Email sent', { messageId: info.messageId, to, subject });
    return { success: true, messageId: info.messageId };
  } catch (err) {
    logger.error('Email sending failed', { error: err.message, to, subject });
    return { success: false, error: err.message };
  }
};

/**
 * Send credentials when needWorkEmail = false (no work email required)
 */
const sendEmployeeCredentials = async (employee, temporaryPassword) => {
  const loginLink = process.env.ERP_LOGIN_URL || 'https://erp.teamworksc.com/login';

  const content = `
    <p>Dear <strong>${employee.firstName} ${employee.middleName || ''} ${employee.lastName}</strong>,</p>
    <p>Your employee account has been approved and created in Teamwork ERP.</p>
    <p>You can log in using your email and the temporary password below. You'll be prompted to create a <strong>username</strong> on your first login.</p>
    
    <div class="credentials">
      <div style="margin-bottom: 12px;">
        <div class="label">Employee Number</div>
        <div class="value">${employee.employeeNumber || 'N/A'}</div>
      </div>
      <div>
        <div class="label">Temporary Password</div>
        <div class="value">${temporaryPassword}</div>
      </div>
    </div>

    <p style="color: #d97706; font-weight: 600;">⚠️ You will create your username and change your password on first login.</p>
    <p>Keep your credentials secure and do not share them with anyone.</p>
    
    <div style="text-align: center;">
      <a href="${loginLink}" class="button">Log in to Teamwork ERP</a>
    </div>
  `;

  return sendEmail({
    to: employee.personalEmail,
    subject: 'Welcome to Teamwork ERP — Your Account Credentials',
    title: 'Account Created Successfully',
    content,
  });
};

/**
 * Send notification when needWorkEmail = true (work email pending)
 */
const sendWorkEmailPending = async (employee) => {
  const content = `
    <p>Dear <strong>${employee.firstName} ${employee.middleName || ''} ${employee.lastName}</strong>,</p>
    <p>Your employee account has been <strong style="color: #059669;">approved</strong>!</p>
    <p>Your IT team is setting up your work email. Once assigned, you'll receive another email with your login credentials.</p>
    
    <div class="credentials">
      <div>
        <div class="label">Employee Number</div>
        <div class="value">${employee.employeeNumber || 'N/A'}</div>
      </div>
    </div>

    <p style="margin-top: 16px;">For now, please wait for your work email to be configured. <strong>No action is needed from you.</strong></p>
    <p style="color: #6b7280; font-size: 13px;">If you have any questions, please contact HR.</p>
  `;

  return sendEmail({
    to: employee.personalEmail,
    subject: 'Welcome to Teamwork ERP — Work Email Pending',
    title: 'Account Approved — Work Email Pending',
    content,
  });
};

/**
 * Send credentials when IT assigns work email
 */
const sendWorkEmailReady = async (employee, temporaryPassword) => {
  const loginLink = process.env.ERP_LOGIN_URL || 'https://erp.teamworksc.com/login';

  const content = `
    <p>Dear <strong>${employee.firstName} ${employee.middleName || ''} ${employee.lastName}</strong>,</p>
    <p>Your work email has been configured. You can now log in to Teamwork ERP.</p>
    
    <div class="credentials">
      <div style="margin-bottom: 12px;">
        <div class="label">Employee Number</div>
        <div class="value">${employee.employeeNumber || 'N/A'}</div>
      </div>
      <div style="margin-bottom: 12px;">
        <div class="label">Work Email</div>
        <div class="value">${employee.email}</div>
      </div>
      <div>
        <div class="label">Temporary Password</div>
        <div class="value">${temporaryPassword}</div>
      </div>
    </div>

    <p style="color: #d97706; font-weight: 600;">⚠️ You will be required to change your password upon first login.</p>
    
    <div style="text-align: center;">
      <a href="${loginLink}" class="button">Log in to Teamwork ERP</a>
    </div>
  `;

  return sendEmail({
    to: employee.personalEmail,
    subject: 'Welcome to Teamwork ERP — Your Login Credentials',
    title: 'Work Email Ready — Login Credentials',
    content,
  });
};

/**
 * Send leave application status notification
 */
const sendLeaveStatusNotification = async (employee, application, status) => {
  const statusConfig = {
    Approved: { color: '#059669', emoji: '✅', action: 'approved' },
    Rejected: { color: '#dc2626', emoji: '❌', action: 'rejected' },
    Submitted: { color: '#d97706', emoji: '📋', action: 'submitted for approval' },
  };
  const config = statusConfig[status] || statusConfig.Submitted;

  const formatDate = (d) => new Date(d).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  const content = `
    <p>Dear <strong>${employee.firstName} ${employee.lastName}</strong>,</p>
    <p>Your leave application has been <strong style="color: ${config.color};">${config.action}</strong>.</p>
    
    <div class="credentials">
      <div style="margin-bottom: 8px;"><div class="label">Leave Type</div><div class="value">${application.leaveType?.name || 'N/A'}</div></div>
      <div style="margin-bottom: 8px;"><div class="label">From</div><div class="value">${formatDate(application.fromDate)}</div></div>
      <div style="margin-bottom: 8px;"><div class="label">To</div><div class="value">${formatDate(application.toDate)}</div></div>
      <div><div class="label">Working Days</div><div class="value">${application.totalLeaveDays} days</div></div>
    </div>

    ${application.rejectionReason ? `<p style="color: #dc2626;"><strong>Rejection Reason:</strong> ${application.rejectionReason}</p>` : ''}
    <p>You can view the full details in your leave dashboard.</p>
  `;

  return sendEmail({
    to: employee.personalEmail || employee.email,
    subject: `${config.emoji} Leave Application ${config.action.charAt(0).toUpperCase() + config.action.slice(1)}`,
    title: `Leave Application ${status}`,
    content,
  });
};

/**
 * Send password reset email
 */
const sendPasswordReset = async (user, resetToken, resetUrl = null) => {
  const resetLink = resetUrl || `${process.env.ERP_BASE_URL || 'https://erp.teamworksc.com'}/reset-password?token=${resetToken}`;

  const content = `
    <p>Dear <strong>${user.firstName} ${user.middleName || ''} ${user.lastName}</strong>,</p>
    <p>We received a request to reset your password. Click the button below to set a new password.</p>
    <div style="text-align: center;"><a href="${resetLink}" class="button">Reset Password</a></div>
    <p style="margin-top: 16px; font-size: 12px; color: #9ca3af;">This link will expire in 1 hour. If you did not request a password reset, please ignore this email.</p>
  `;

  return sendEmail({
    to: user.email,
    subject: 'Reset Your Password — Teamwork ERP',
    title: 'Password Reset Request',
    content,
  });
};

/**
 * Send notification to approver about pending leave application
 */
const sendLeaveApprovalRequest = async (approver, applicant, application) => {
  const formatDate = (d) => new Date(d).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  const content = `
    <p>Dear <strong>${approver.firstName} ${approver.middleName || ''} ${approver.lastName}</strong>,</p>
    <p>A leave application requires your approval.</p>
    
    <div class="credentials">
      <div style="margin-bottom: 8px;"><div class="label">Applicant</div><div class="value">${applicant.firstName} ${applicant.middleName || ''} ${applicant.lastName} (${applicant.employeeNumber || 'N/A'})</div></div>
      <div style="margin-bottom: 8px;"><div class="label">Leave Type</div><div class="value">${application.leaveType?.name || 'N/A'}</div></div>
      <div style="margin-bottom: 8px;"><div class="label">Dates</div><div class="value">${formatDate(application.fromDate)} — ${formatDate(application.toDate)}</div></div>
      <div><div class="label">Working Days</div><div class="value">${application.totalLeaveDays} days</div></div>
    </div>

    ${application.reason ? `<p><strong>Reason:</strong> ${application.reason}</p>` : ''}
    <p>Please review and approve or reject this application from the Leave Applications page.</p>
  `;

  return sendEmail({
    to: approver.email || approver.user?.email,
    subject: `📋 Pending Leave Approval — ${applicant.firstName} ${applicant.lastName}`,
    title: 'Leave Approval Required',
    content,
  });
};

// ─────────────────────────────────────────────
//  EXPORTS
// ─────────────────────────────────────────────
module.exports = {
  sendEmail,
  sendEmployeeCredentials,
  sendWorkEmailPending,
  sendWorkEmailReady,
  sendLeaveStatusNotification,
  sendPasswordReset,
  sendLeaveApprovalRequest,
};