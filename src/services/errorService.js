const GENERIC_ERROR_MESSAGE = 'Something went wrong. Please try again.';

export function getErrorMessage(error, fallback = GENERIC_ERROR_MESSAGE) {
  if (!error) return fallback;
  if (typeof error === 'string') return error;
  return error.message || error.details || fallback;
}

export function reportError(error, context = 'Application') {
  const payload = {
    context,
    message: getErrorMessage(error),
    code: error?.code,
    details: error?.details,
    hint: error?.hint,
  };

  console.error(`[${context}]`, payload, error);
  return payload;
}
