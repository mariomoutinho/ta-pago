export const phoneCountries = [
  { value: "BR", label: "🇧🇷 Brasil", dial: "55" },
  { value: "PT", label: "🇵🇹 Portugal", dial: "351" },
  { value: "US", label: "🇺🇸 Estados Unidos", dial: "1" },
  { value: "CA", label: "🇨🇦 Canadá", dial: "1" },
  { value: "AR", label: "🇦🇷 Argentina", dial: "54" },
  { value: "UY", label: "🇺🇾 Uruguai", dial: "598" },
  { value: "PY", label: "🇵🇾 Paraguai", dial: "595" },
  { value: "CL", label: "🇨🇱 Chile", dial: "56" },
  { value: "BO", label: "🇧🇴 Bolívia", dial: "591" },
  { value: "CO", label: "🇨🇴 Colômbia", dial: "57" },
  { value: "PE", label: "🇵🇪 Peru", dial: "51" },
  { value: "MX", label: "🇲🇽 México", dial: "52" },
  { value: "ES", label: "🇪🇸 Espanha", dial: "34" },
  { value: "GB", label: "🇬🇧 Reino Unido", dial: "44" },
  { value: "FR", label: "🇫🇷 França", dial: "33" },
  { value: "DE", label: "🇩🇪 Alemanha", dial: "49" },
  { value: "IT", label: "🇮🇹 Itália", dial: "39" },
];

export function internationalPhone(text: string, dial: string) {
  const digits = text.replace(/\D/g, "");
  if (!digits || (text.startsWith("+") && dial.startsWith(digits))) return `+${dial}`;
  // O campo já contém o DDI; mantê-lo mesmo quando o prefixo é apagado.
  const national = text.startsWith("+") && digits.startsWith(dial) ? digits.slice(dial.length) : digits;
  return `+${dial}${national}`.slice(0, 16);
}

export function registrationGroups(groups: string[]) {
  return [...new Set(["Presencial", "Online", ...groups.filter(Boolean)])];
}
