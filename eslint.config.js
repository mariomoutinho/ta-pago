const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");
module.exports = defineConfig([
  expoConfig,
  // Adoção inicial: diagnósticos do compilador em fluxos herdados permanecem visíveis como avisos.
  { files: ["src/app/alunos/index.tsx"], rules: { "react-hooks/purity": "warn" } },
  { files: ["src/app/alunos/link.tsx", "src/app/cadastro/*.tsx", "src/features/personal/auth.tsx", "src/hooks/use-color-scheme.web.ts"], rules: { "react-hooks/set-state-in-effect": "warn" } },
  { files: ["src/components/workouts/sortable-exercises.tsx"], rules: { "react-hooks/refs": "warn" } },
  { ignores: ["dist/**", "server/generated/**", ".rag/**", "knowledge/**", "example/**"] },
]);
