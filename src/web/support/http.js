const INTERNAL_PATH_PATTERN = /^\/(?!\/)[^\s]*$/;

export const asyncHandler = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

export const safeRedirectTarget = (value, fallback) =>
  typeof value === 'string' && INTERNAL_PATH_PATTERN.test(value) ? value : fallback;
