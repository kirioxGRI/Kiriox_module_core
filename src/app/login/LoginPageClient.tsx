"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { UserRound, ArrowRight } from "lucide-react";
import { signIn } from "next-auth/react";
import styles from "./page.module.css";

type LoginPageClientProps = {
  companyName: string;
};

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: 8 }}>
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#FFFFFF"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#FFFFFF"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      fill="#FFFFFF"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      fill="#FFFFFF"
    />
  </svg>
);

export default function LoginPageClient({ companyName }: LoginPageClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const err = params.get("error");
      if (err) {
        if (err === "not_registered") {
          setError("Tu cuenta no está registrada. Solicita acceso al administrador.");
        } else if (err === "inactive") {
          setError("Tu cuenta está inactiva. Contacta al administrador.");
        } else {
          setError("Error de autenticación con Google. Intente nuevamente.");
        }
      }
    }
  }, []);

  const handleGoogleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      await signIn("google", { callbackUrl: "/main_dashboard" });
    } catch (err: unknown) {
      console.error(err);
      setError("No se pudo iniciar la autenticación con Google.");
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

          <div className={styles.form} style={{ marginTop: "2rem" }}>
            {error ? (
              <p className={styles.error} style={{ marginBottom: "1.5rem", textAlign: "center" }}>
                {error}
              </p>
            ) : null}

            <button
              type="button"
              className={styles.submit}
              onClick={handleGoogleLogin}
              disabled={loading}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "100%",
              }}
            >
              <GoogleIcon />
              {loading ? "Redirigiendo..." : "Continuar con Google"}
              <ArrowRight size={20} />
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
