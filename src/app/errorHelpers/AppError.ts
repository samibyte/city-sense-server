class AppError extends Error {
	public statusCode: number;
	public errors: string[];

	constructor(
		statusCode: number,
		message: string,
		stack = "",
		errors: string[] = [],
	) {
		super(message);
		this.statusCode = statusCode;
		this.name = this.constructor.name;
		this.errors = errors;

		if (stack) {
			this.stack = stack;
		} else {
			Error.captureStackTrace(this, this.constructor);
		}
	}
}

export default AppError;
