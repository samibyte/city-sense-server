export interface ILoginPayload {
	email: string;
	password: string;
}

export interface IVerifyEmailPayload {
	email: string;
	otp: string;
}

export interface ISendEmailVerificationOtpPayload {
	email: string;
}

export interface IRegisterCitizenPayload {
	name: string;
	email: string;
	password: string;
	phone?: string;
	address?: string;
}
