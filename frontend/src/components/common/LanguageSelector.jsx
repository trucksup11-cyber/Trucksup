import { useLanguage } from "../../contexts/LanguageContext";
import { SUPPORTED_LANGUAGES } from "../../i18n/translations";

export default function LanguageSelector({ className = "" }) {
  const { language, setLanguage, t } = useLanguage();

  return (
    <label className={`inline-flex items-center gap-2 text-sm ${className}`}>
      <span className="font-medium">{t("language")}:</span>
      <select
        value={language}
        onChange={(event) => setLanguage(event.target.value)}
        className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800"
      >
        {SUPPORTED_LANGUAGES.map((option) => (
          <option key={option.code} value={option.code}>
            {t(option.labelKey)}
          </option>
        ))}
      </select>
    </label>
  );
}
