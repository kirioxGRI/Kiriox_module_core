"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Lock, Mail, UserRound, ArrowRight, Eye, EyeOff } from "lucide-react";
import styles from "./page.module.css";

const DEFAULT_EMAIL = "admin@intervalafi.com";
const DEFAULT_COMPANY_ID = "05cb4cc6-c215-4d41-84b3-98c6013cda27";
const TAB_SESSION_KEY = "kiriox_tab_session_active";

type LoginPageClientProps = {
  companyName: string;
};

const buildCompanyOptions = (companyName: string) => [
  { id: DEFAULT_COMPANY_ID, name: companyName },
];

export default function LoginPageClient({ companyName }: LoginPageClientProps) {
  const router = useRouter();
  const [emailOrUsername, setEmailOrUsername] = useState(DEFAULT_EMAIL);
  const [password, setPassword] = useState("");
  const [companyId, setCompanyId] = useState(DEFAULT_COMPANY_ID);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const companyOptions = buildCompanyOptions(companyName);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const identifier = emailOrUsername.trim();
      const body = identifier.includes("@")
        ? { email: identifier, password, company_id: companyId }
        : { username: identifier, password, company_id: companyId };

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json().catch(() => ({})) as { error?: string };

      if (!response.ok) {
        throw new Error(payload?.error ?? "No se pudo iniciar sesión.");
      }

      if (typeof window !== "undefined") {
        sessionStorage.setItem(TAB_SESSION_KEY, "1");
        window.location.assign("/main_dashboard");
      } else {
        router.replace("/main_dashboard");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "No se pudo iniciar sesión.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={styles.screen}>
      <div className={styles.backdropOrbs} />

      <section className={styles.brandPanel}>
        <div className={styles.brandInner}>
          <h1 className={styles.brandTitle}>
            Kiriox <span>Enterprise<span className={styles.brandDot}>.</span></span>
          </h1>
          <p className={styles.brandSubtitle}>Plataforma empresarial</p>
          <div className={styles.brandDivider} />
          <p className={styles.brandText}>
            Usted está ingresando a Kiriox Enterprise.
          </p>
          <p className={styles.brandText}>Si no eres personal autorizado, por favor abstenerse de ingresar.</p>
        </div>
      </section>

      <section className={styles.loginPanel}>
        <div className={styles.loginCard}>
          <div className={styles.avatar}>
            <UserRound size={30} />
          </div>

          <h2 className={styles.welcome}>Bienvenido</h2>
          <p className={styles.company}>Kiriox Enterprise</p>

          <form className={styles.form} onSubmit={onSubmit}>
            <label className={styles.fieldLabel}>Correo electrónico o usuario</label>
            <div className={styles.field}>
              <Mail size={18} />
              <input
                value={emailOrUsername}
                onChange={(e) => setEmailOrUsername(e.target.value)}
                placeholder="admin@intervalafi.com o admin"
                autoComplete="username"
                required
              />
            </div>

            <label className={styles.fieldLabel}>Contraseña</label>
            <div className={styles.field}>
              <Lock size={18} />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className={styles.eyeButton}
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <label className={styles.fieldLabel}>Empresa</label>
            <div className={styles.field}>
              <Building2 size={18} />
              <select value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
                {companyOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>

            {error ? <p className={styles.error}>{error}</p> : null}

            <button type="submit" className={styles.submit} disabled={loading}>
              {loading ? "Iniciando sesión..." : "Iniciar sesión"}
              <ArrowRight size={20} />
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
