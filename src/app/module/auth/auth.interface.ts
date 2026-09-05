export interface IRegisterCitizenPayload {
	name: string;
	email: string;
	password: string;
	phone?: string;
	address?: string;
}
