const GENERIC_ERROR_MESSAGE = 'Something went wrong. Please try again.';

export function getErrorMessage(error, fallback = GENERIC_ERROR_MESSAGE) {
  if (!error) return fallback;
  if (typeof error === 'string') return error;
  return error.message || error.details || fallback;
}

export function reportError(error, context = 'Application') {
  const payload = {
    context,
    name: error?.name,
    message: getErrorMessage(error),
    code: error?.code,
    status: error?.status,
    statusCode: error?.statusCode,
    details: error?.details,
    hint: error?.hint,
    stack: error?.stack,
  };

  console.error(`[${context}]`, payload, error);
  return payload;
}
