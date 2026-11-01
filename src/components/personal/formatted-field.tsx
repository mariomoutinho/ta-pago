import type { TextInputProps } from "react-native";
import { Field } from "./ui";
import {
  dateInputToIso,
  datePlaceholder,
  formatDateInput,
  formatPhoneInput,
  phonePlaceholder,
} from "@/features/personal/input-format";

type Props = TextInputProps & {
  label: string;
  format?: "date" | "phone";
  value: string;
  onChangeText: (value: string) => void;
};

export function FormattedField({ format, value, onChangeText, ...props }: Props) {
  if (format === "date") return (
    <Field {...props}
      value={formatDateInput(value)}
      onChangeText={(text) => onChangeText(dateInputToIso(text))}
      placeholder={datePlaceholder}
      keyboardType="number-pad"
      maxLength={10}
    />
  );
  if (format === "phone") return (
    <Field {...props}
      value={formatPhoneInput(value)}
      onChangeText={(text) => onChangeText(formatPhoneInput(text, true))}
      placeholder={phonePlaceholder}
      keyboardType="phone-pad"
      autoComplete="tel"
    />
  );
  return <Field {...props} value={value} onChangeText={onChangeText} />;
}
