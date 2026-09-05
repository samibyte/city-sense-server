import type {
	AuthProvider,
	Role,
	UserStatus,
} from "../../../generated/prisma/client";
import { Prisma } from "../../../generated/prisma/client";
import type { IRegisterCitizenPayload } from "../auth/auth.interface";

export type ICreateCitizenWithCredsPayload = Omit<
	IRegisterCitizenPayload,
	"password"
> & {
	profileUrl?: string | null;
	profilePublicId?: string | null;
	passwordHash: string;
	authProvider: AuthProvider;
	role: Role;
	status: UserStatus;
	emailVerified: boolean;
};

export const userRepository = Prisma.defineExtension({
	name: "userRepository",
	model: {
		user: {
			async findByEmail(email: string) {
				const ctx = Prisma.getExtensionContext(this);
				return ctx.findUnique({
					where: { email },
				});
			},

			async createCitizenWithCreds(userData: ICreateCitizenWithCredsPayload) {
				const ctx = Prisma.getExtensionContext(this);

				return await ctx.create({
					data: { ...userData },
					omit: { passwordHash: true },
					include: { citizen: true },
				});
			},
		},
	},
});
