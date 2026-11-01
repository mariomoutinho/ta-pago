export const datePlaceholder = "__/__/____";
export const phonePlaceholder = "(__) _ ____ ____";

export function formatDateInput(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-");
    return `${day}/${month}/${year}`;
  }
  const digits = value.replace(/\D/g, "").slice(0, 8);
  return [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4)].filter(Boolean).join("/");
}

// Datas incompletas/ inválidas continuam inválidas para os schemas, sem correção silenciosa.
export function dateInputToIso(value: string): string {
  const display = formatDateInput(value);
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(display);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : display;
}

export function formatPhoneInput(value: string, limitToBrazilian = false): string {
  let digits = value.replace(/\D/g, "");
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith("55")) digits = digits.slice(2);
  // Não truncar números internacionais que já existam no cadastro.
  if (digits.length > 11) {
    if (!limitToBrazilian) return value;
    digits = digits.slice(0, 11);
  }
  if (!digits) return "";
  const ddd = digits.slice(0, 2);
  const number = digits.slice(2);
  if (digits.length < 2) return `(${ddd}`;
  if (!number) return `(${ddd})`;
  const groups = number.length > 8
    ? [number.slice(0, 1), number.slice(1, 5), number.slice(5)]
    : [number.slice(0, 4), number.slice(4)];
  return `(${ddd}) ${groups.filter(Boolean).join(" ")}`;
}
