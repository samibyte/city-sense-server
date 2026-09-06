export interface IApplyAsResolverPayload {
	user: {
		name: string;
		email: string;
		phone?: string;
		address?: string;
	};
	resolver: {
		bio?: string;
		departmentId: string;
	};
}

export interface IReviewApplicationPayload {
	resolverId: string;
	verificationStatus: "APPROVED" | "REJECTED";
	rejectionReason?: string;
}
