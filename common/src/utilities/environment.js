const nodeEnv = process.env.NODE_ENV?.toLowerCase();
export const isProd = ['prod', 'production'].includes(nodeEnv);
export const isDev = ['dev', 'development'].includes(nodeEnv);
export const isLocal = ['local'].includes(nodeEnv) || (!isProd && !isDev);
