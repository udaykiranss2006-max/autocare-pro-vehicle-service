class ApiError extends Error {
  constructor(status, message, code = 'ERROR', details = undefined) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
  static badRequest(message = 'Bad request', details) {
    return new ApiError(400, message, 'BAD_REQUEST', details);
  }
  static unauthorized(message = 'Authentication required') {
    return new ApiError(401, message, 'UNAUTHORIZED');
  }
  static forbidden(message = 'You do not have permission to perform this action') {
    return new ApiError(403, message, 'FORBIDDEN');
  }
  static notFound(message = 'Resource not found') {
    return new ApiError(404, message, 'NOT_FOUND');
  }
  static conflict(message, code = 'CONFLICT') {
    return new ApiError(409, message, code);
  }
  static validation(details, message = 'Invalid form data. Please check the highlighted fields.') {
    return new ApiError(422, message, 'VALIDATION_ERROR', details);
  }
}
module.exports = ApiError;
