"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronDown, CircleUserRound, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import type { AccessContext } from "@/shared/types";
import styles from "./LaunchpadHero.module.css";

type LaunchpadHeroProps = {
  access: AccessContext;
};

export default function LaunchpadHero({ access }: LaunchpadHeroProps) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
      });
    } catch (err) {
      console.error("Error during logout:", err);
    } finally {
      if (typeof window !== "undefined") {
        sessionStorage.clear();
        localStorage.clear();
      }
      router.replace("/login");
      window.location.assign("/login");
    }
  };

  return (
    <header className={styles.hero}>
      <div className={styles.copy}>
        <p className={styles.kicker}>Bienvenido a</p>
        <h1 className={styles.title}>
          Kiriox <span>Enterprise.</span>
        </h1>
        <p className={styles.description}>
          Plataforma empresarial integrada para gestionar riesgos, cumplimiento y resiliencia organizacional.
        </p>
      </div>

      <div className={styles.accountWrapper} ref={dropdownRef}>
        <button
          className={styles.account}
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          type="button"
        >
          <div className={styles.accountIcon}>
            <CircleUserRound size={22} />
          </div>
          <div className={styles.accountCopy}>
            <span className={styles.accountEmail}>{access.user.email || access.user.name}</span>
            <span className={styles.accountCompany}>{access.company.name}</span>
          </div>
          <ChevronDown
            size={20}
            className={`${styles.accountChevron} ${open ? styles.open : ""}`}
          />
        </button>

        {open && (
          <div className={styles.dropdown}>
            <button onClick={handleLogout} className={styles.dropdownItem}>
              <LogOut size={16} />
              Cerrar sesión
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
