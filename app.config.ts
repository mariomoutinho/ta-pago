import type { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  const baseUrl = process.env.TAPAGO_WEB_BASE_PATH || '';
  if (!/^(\/[a-zA-Z0-9_-]+)*$/.test(baseUrl)) throw new Error('TAPAGO_WEB_BASE_PATH inválido');
  return {
    ...config,
    name: config.name || 'Tá Pago Personal',
    slug: config.slug || 'ta-pago',
    experiments: { ...config.experiments, baseUrl },
  };
};
