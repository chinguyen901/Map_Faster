import { Resend } from "resend";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

const FROM = () => process.env.RESEND_FROM ?? "Thu Chi <onboarding@resend.dev>";

export async function sendOTPEmail(to: string, code: string, purpose: "register" | "reset"): Promise<void> {
  const subject =
    purpose === "register"
      ? "Xác nhận đăng ký tài khoản Thu Chi Tiết Kiệm"
      : "Đặt lại mật khẩu Thu Chi Tiết Kiệm";

  const action = purpose === "register" ? "đăng ký tài khoản" : "đặt lại mật khẩu";

  await getResend().emails.send({
    from: FROM(),
    to,
    subject,
    html: `
      <div style="font-family:-apple-system,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#fff;">
        <div style="text-align:center;margin-bottom:32px;">
          <div style="display:inline-flex;align-items:center;justify-content:center;width:64px;height:64px;background:#1E90FF;border-radius:16px;font-size:28px;font-weight:900;color:white;">₫</div>
          <h1 style="color:#1A1A2E;font-size:20px;margin:12px 0 4px;">Thu Chi Tiết Kiệm</h1>
        </div>
        <p style="color:#374151;font-size:15px;margin-bottom:8px;">Mã xác nhận để <strong>${action}</strong> của bạn là:</p>
        <div style="background:#F0F8FF;border-radius:16px;padding:24px;text-align:center;margin:20px 0;">
          <span style="font-size:40px;font-weight:900;letter-spacing:12px;color:#1E90FF;">${code}</span>
        </div>
        <p style="color:#6B7280;font-size:13px;">Mã này có hiệu lực trong <strong>5 phút</strong>. Không chia sẻ mã này cho bất kỳ ai.</p>
        <p style="color:#9CA3AF;font-size:12px;margin-top:24px;">Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>
      </div>
    `,
  });
}
