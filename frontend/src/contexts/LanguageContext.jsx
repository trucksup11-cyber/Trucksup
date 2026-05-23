import { createContext, useContext, useEffect, useMemo, useState } from "react";

import api from "../lib/api";
import { getLocaleForLanguage, translations } from "../i18n/translations";

const LanguageContext = createContext({
  language: "en",
  locale: "en-IN",
  setLanguage: () => {},
  t: (key) => key,
  formatNumber: (value) => String(value),
  formatCurrency: (value) => String(value),
  formatDistanceKm: (value) => String(value)
});

export function LanguageProvider({ children }) {
  const user = JSON.parse(localStorage.getItem("user") || "null");
  const [language, setLanguageState] = useState(user?.preferredLanguage || localStorage.getItem("language") || "en");

  const setLanguage = async (nextLanguage) => {
    setLanguageState(nextLanguage);
    localStorage.setItem("language", nextLanguage);

    const currentUser = JSON.parse(localStorage.getItem("user") || "null");
    if (currentUser) {
      const updatedUser = { ...currentUser, preferredLanguage: nextLanguage };
      localStorage.setItem("user", JSON.stringify(updatedUser));
    }

    if (localStorage.getItem("token")) {
      try {
        await api.patch("/auth/language", { preferred_language: nextLanguage });
      } catch (_error) {
        // Keep local preference even if API update fails.
      }
    }
  };

  const value = useMemo(() => {
    const localeDict = translations[language] || translations.en;
    const locale = getLocaleForLanguage(language);

    return {
      language,
      locale,
      setLanguage,
      t: (key) => localeDict[key] || translations.en[key] || key,
      formatNumber: (value) => new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(Number(value || 0)),
      formatCurrency: (value) =>
        new Intl.NumberFormat(locale, {
          style: "currency",
          currency: "INR",
          maximumFractionDigits: 0
        }).format(Number(value || 0)),
      formatDistanceKm: (value) =>
        new Intl.NumberFormat(locale, {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1
        }).format(Number(value || 0))
    };
  }, [language]);

  useEffect(() => {
    const syncLanguage = () => {
      setLanguageState(localStorage.getItem("language") || "en");
    };

    window.addEventListener("storage", syncLanguage);
    window.addEventListener("trucks-up-language-change", syncLanguage);

    return () => {
      window.removeEventListener("storage", syncLanguage);
      window.removeEventListener("trucks-up-language-change", syncLanguage);
    };
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  return useContext(LanguageContext);
}
