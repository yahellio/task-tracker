const INTERNAL_PATH_PATTERN = /^\/(?!\/)[^\s]*$/;

export const safeRedirectTarget = (value, fallback) =>
  typeof value === 'string' && INTERNAL_PATH_PATTERN.test(value) ? value : fallback;
