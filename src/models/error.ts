export class AppError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorResponse(status: number, message: string) {
  return { success: false, error: message };
}
