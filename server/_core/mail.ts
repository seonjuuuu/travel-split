import type { Transporter } from "nodemailer";
import { ENV } from "./env";

// nodemailer is loaded lazily (not at module scope) so that if it fails to
// resolve/initialize in a given deploy environment, only email sending
// breaks instead of crashing the entire serverless function on cold start.
let _transporter: Transporter | null = null;

async function getTransporter(): Promise<Transporter | null> {
  if (!ENV.gmailUser || !ENV.gmailAppPassword) return null;
  if (_transporter) return _transporter;
  try {
    const { default: nodemailer } = await import("nodemailer");
    _transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: ENV.gmailUser, pass: ENV.gmailAppPassword },
    });
    return _transporter;
  } catch (error) {
    console.warn("[Mail] Failed to load nodemailer:", error);
    return null;
  }
}

async function sendMail(to: string, subject: string, html: string): Promise<boolean> {
  const transporter = await getTransporter();
  if (!transporter) {
    console.warn(`[Mail] GMAIL_USER/GMAIL_APP_PASSWORD not configured - skipped: "${subject}" to ${to}`);
    return false;
  }
  try {
    await transporter.sendMail({ from: `트립스플릿 <${ENV.gmailUser}>`, to, subject, html });
    return true;
  } catch (error) {
    console.warn("[Mail] Failed to send email:", error);
    return false;
  }
}

export async function sendTodoAssignedEmail(params: {
  to: string;
  assigneeName: string;
  creatorName: string;
  projectId: string;
  projectName: string;
  todoTitle: string;
}) {
  const { to, assigneeName, creatorName, projectId, projectName, todoTitle } = params;
  const projectUrl = `${ENV.appUrl}/project/${projectId}`;
  const html = `
    <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
      <p style="color: #5B6B72; font-size: 13px; margin-bottom: 4px;">TRIP · SPLIT</p>
      <h2 style="color: #12222D; margin: 0 0 16px;">${assigneeName}님, 새 할일이 생겼어요</h2>
      <p style="color: #12222D; font-size: 15px; line-height: 1.6;">
        <strong>${creatorName}</strong>님이 <strong>${projectName}</strong> 여행에 할일을 등록하면서 회원님을 담당자로 지정했어요.
      </p>
      <div style="background: #F6F7F2; border: 1px solid #12222D1F; border-radius: 8px; padding: 16px; margin: 16px 0; font-size: 15px; color: #12222D;">
        ${todoTitle}
      </div>
      <a href="${projectUrl}" style="display: inline-block; background: #4f46e5; color: #fff; text-decoration: none; padding: 10px 20px; border-radius: 8px; font-size: 14px; font-weight: 600;">
        여행 페이지에서 확인하기
      </a>
    </div>
  `;
  return sendMail(to, `[${projectName}] 새 할일: ${todoTitle}`, html);
}
