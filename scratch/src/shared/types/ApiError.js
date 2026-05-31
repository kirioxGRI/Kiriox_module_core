"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiError = void 0;
class ApiError extends Error {
    status;
    code;
    details;
    constructor(status, code, message, details) {
        super(message);
        this.status = status;
        this.code = code;
        this.details = details;
    }
    static badRequest(message, details) {
        return new ApiError(400, 'bad_request', message, details);
    }
    static unauthorized(message = 'Unauthorized') {
        return new ApiError(401, 'unauthorized', message);
    }
    static forbidden(message = 'Forbidden') {
        return new ApiError(403, 'forbidden', message);
    }
    static notFound(message = 'Not found') {
        return new ApiError(404, 'not_found', message);
    }
}
exports.ApiError = ApiError;
