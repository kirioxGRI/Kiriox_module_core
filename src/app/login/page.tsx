import LoginPageClient from "./LoginPageClient";

const FALLBACK_COMPANY_NAME = "Afi Interval";

export default function LoginPage() {
  const companyName = process.env.COMPANY_NAME?.trim() || FALLBACK_COMPANY_NAME;

  return <LoginPageClient companyName={companyName} />;
}
