export interface ILoginPayload {
	email: string;
	password: string;
}

export interface IRegisterCitizenPayload {
	name: string;
	email: string;
	password: string;
	phone?: string;
	address?: string;
}
