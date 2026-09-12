import "dotenv/config";
import bcrypt from "bcrypt";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";
import {
	Role,
	UserStatus,
	AuthProvider,
	ResolverVerificationStatus,
	RequestType,
	RequestStatus,
	Priority,
	PaymentStatus,
	PaymentMethod,
	ServiceType,
	AssignmentStatus,
} from "../src/generated/prisma/enums.js";

const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS ?? 10);

const adapter = new PrismaPg({
	connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

// ── Demo credentials ─────────────────────────────────────────────────────────
export const SEED_CREDENTIALS = {
	admin: { email: "admin@citysense.com", password: "Admin@123" },
	citizen: { email: "citizen@citysense.com", password: "Citizen@123" },
	citizen2: { email: "ayesha@example.com", password: "Citizen@123" },
	resolver: { email: "resolver@citysense.com", password: "Resolver@123" },
	resolver2: { email: "farhana@example.com", password: "Resolver@123" },
	resolver3: { email: "mahmudul@example.com", password: "Resolver@123" },
} as const;

const p = async <T>(promise: Promise<T>) => promise;

// ── Main ─────────────────────────────────────────────────────────────────────
async function seed() {
	const existingAdmin = await prisma.user.findUnique({
		where: { email: SEED_CREDENTIALS.admin.email },
	});

	if (existingAdmin) {
		console.log(
			"ℹ  Database already seeded — skipping. Delete admin user to re-seed.",
		);
		return;
	}

	console.log("🌱 Seeding database…");

	const adminHash = await bcrypt.hash(
		SEED_CREDENTIALS.admin.password,
		SALT_ROUNDS,
	);
	const citizenHash = await bcrypt.hash(
		SEED_CREDENTIALS.citizen.password,
		SALT_ROUNDS,
	);
	const resolverHash = await bcrypt.hash(
		SEED_CREDENTIALS.resolver.password,
		SALT_ROUNDS,
	);

	// ─── Users ────────────────────────────────────────────────────────────────

	const admin = await p(
		prisma.user.create({
			data: {
				name: "Rashid Hasan",
				email: SEED_CREDENTIALS.admin.email,
				passwordHash: adminHash,
				role: Role.ADMIN,
				authProvider: AuthProvider.CREDENTIAL,
				emailVerified: true,
				status: UserStatus.ACTIVE,
				phone: "+8801712345678",
			},
		}),
	);

	const citizenUser = await p(
		prisma.user.create({
			data: {
				name: "Rahim Uddin",
				email: SEED_CREDENTIALS.citizen.email,
				passwordHash: citizenHash,
				role: Role.CITIZEN,
				authProvider: AuthProvider.CREDENTIAL,
				emailVerified: true,
				status: UserStatus.ACTIVE,
				phone: "+8801711223344",
				citizen: {
					create: { address: "House 12, Road 5, Dhanmondi, Dhaka 1205" },
				},
			},
			include: { citizen: true },
		}),
	);

	const citizenUser2 = await p(
		prisma.user.create({
			data: {
				name: "Ayesha Rahman",
				email: SEED_CREDENTIALS.citizen2.email,
				passwordHash: citizenHash,
				role: Role.CITIZEN,
				authProvider: AuthProvider.CREDENTIAL,
				emailVerified: true,
				status: UserStatus.ACTIVE,
				phone: "+8801755667788",
				citizen: {
					create: { address: "Flat 3B, House 40, Road 11, Banani, Dhaka 1213" },
				},
			},
			include: { citizen: true },
		}),
	);

	const resolverUser1 = await p(
		prisma.user.create({
			data: {
				name: "Karim Hossain",
				email: SEED_CREDENTIALS.resolver.email,
				passwordHash: resolverHash,
				role: Role.RESOLVER,
				authProvider: AuthProvider.CREDENTIAL,
				emailVerified: true,
				status: UserStatus.ACTIVE,
				phone: "+8801812345678",
				needPasswordChange: true,
			},
		}),
	);

	const resolverUser2 = await p(
		prisma.user.create({
			data: {
				name: "Farhana Akter",
				email: SEED_CREDENTIALS.resolver2.email,
				passwordHash: resolverHash,
				role: Role.RESOLVER,
				authProvider: AuthProvider.CREDENTIAL,
				emailVerified: true,
				status: UserStatus.ACTIVE,
				phone: "+8801855667788",
				needPasswordChange: true,
			},
		}),
	);

	const resolverUser3 = await p(
		prisma.user.create({
			data: {
				name: "Mahmudul Hasan",
				email: SEED_CREDENTIALS.resolver3.email,
				passwordHash: resolverHash,
				role: Role.RESOLVER,
				authProvider: AuthProvider.CREDENTIAL,
				emailVerified: true,
				status: UserStatus.ACTIVE,
				phone: "+8801899887766",
				needPasswordChange: true,
			},
		}),
	);

	// ─── Departments ──────────────────────────────────────────────────────────

	const roadsDept = await p(
		prisma.department.create({
			data: {
				name: "Roads & Highway Division",
				description:
					"Responsible for road maintenance, pothole repair, resurfacing, and footpath improvement across Dhaka city.",
			},
		}),
	);

	const waterDept = await p(
		prisma.department.create({
			data: {
				name: "Water Supply & Sewerage Department",
				description:
					"Manages clean water supply, sewer line maintenance, and water quality issues in residential and commercial areas.",
			},
		}),
	);

	const wasteDept = await p(
		prisma.department.create({
			data: {
				name: "Waste Management Department",
				description:
					"Handles garbage collection schedules, illegal dumping enforcement, and public sanitation facilities.",
			},
		}),
	);

	const streetLightDept = await p(
		prisma.department.create({
			data: {
				name: "Street Lighting Department",
				description:
					"Maintains and repairs public street lights and manages installation of new lighting in underserved areas.",
			},
		}),
	);

	// ─── Resolver Profiles (linked to departments) ────────────────────────────

	const resolverProfile1 = await p(
		prisma.resolverProfile.create({
			data: {
				bio: "Senior road maintenance technician with 8 years of experience in urban infrastructure repair. Specialises in pothole patching and asphalt resurfacing.",
				city: "Dhaka",
				area: "Dhanmondi",
				maxConcurrentAssignments: 5,
				verificationStatus: ResolverVerificationStatus.APPROVED,
				departmentId: roadsDept.id,
				userId: resolverUser1.id,
			},
		}),
	);

	const resolverProfile2 = await p(
		prisma.resolverProfile.create({
			data: {
				bio: "Certified plumber and drainage specialist serving Dhaka North City Corporation since 2018.",
				city: "Dhaka",
				area: "Banani",
				maxConcurrentAssignments: 4,
				verificationStatus: ResolverVerificationStatus.APPROVED,
				departmentId: waterDept.id,
				userId: resolverUser2.id,
			},
		}),
	);

	const resolverProfile3 = await p(
		prisma.resolverProfile.create({
			data: {
				bio: "Experienced waste collection coordinator managing multi-zone garbage disposal routes across Uttara and neighbouring areas.",
				city: "Dhaka",
				area: "Uttara",
				maxConcurrentAssignments: 3,
				verificationStatus: ResolverVerificationStatus.APPROVED,
				departmentId: wasteDept.id,
				userId: resolverUser3.id,
			},
		}),
	);

	// ─── Service Categories ───────────────────────────────────────────────────

	const catPothole = await p(
		prisma.serviceCategory.create({
			data: {
				name: "Pothole Repair",
				description: "Report and request repair of road potholes",
				departmentId: roadsDept.id,
			},
		}),
	);

	const catRoadResurface = await p(
		prisma.serviceCategory.create({
			data: {
				name: "Road Resurfacing",
				description: "Requests for full road resurfacing projects",
				departmentId: roadsDept.id,
			},
		}),
	);

	const catFootpath = await p(
		prisma.serviceCategory.create({
			data: {
				name: "Footpath Repair",
				description: "Damaged or blocked footpath repair requests",
				departmentId: roadsDept.id,
			},
		}),
	);

	const catWaterLeak = await p(
		prisma.serviceCategory.create({
			data: {
				name: "Water Leakage",
				description: "Report pipe leaks and water supply interruptions",
				departmentId: waterDept.id,
			},
		}),
	);

	const catSewer = await p(
		prisma.serviceCategory.create({
			data: {
				name: "Sewer Line Blockage",
				description: "Blocked or overflowing sewer drain complaints",
				departmentId: waterDept.id,
			},
		}),
	);

	const catWaterQuality = await p(
		prisma.serviceCategory.create({
			data: {
				name: "Water Quality Issues",
				description:
					"Report poor water quality, discolouration, or contamination",
				departmentId: waterDept.id,
			},
		}),
	);

	const catGarbage = await p(
		prisma.serviceCategory.create({
			data: {
				name: "Garbage Collection",
				description: "Schedule or report missed garbage collection runs",
				departmentId: wasteDept.id,
			},
		}),
	);

	const catIllegalDumping = await p(
		prisma.serviceCategory.create({
			data: {
				name: "Illegal Dumping",
				description: "Report illegal waste dumping in public spaces",
				departmentId: wasteDept.id,
			},
		}),
	);

	const catStreetLight = await p(
		prisma.serviceCategory.create({
			data: {
				name: "Street Light Outage",
				description: "Report non-functional or damaged street lights",
				departmentId: streetLightDept.id,
			},
		}),
	);

	const catNewLight = await p(
		prisma.serviceCategory.create({
			data: {
				name: "New Light Installation",
				description: "Request new street light installation in dark areas",
				departmentId: streetLightDept.id,
			},
		}),
	);

	// ─── Services ─────────────────────────────────────────────────────────────

	const svcPotholeFree = await p(
		prisma.service.create({
			data: {
				name: "Standard Pothole Repair",
				description:
					"Free pothole repair service for public roads. A technician will inspect and fill potholes within 48 hours of assignment.",
				price: 0,
				estimatedDuration: 48,
				isPaid: false,
				serviceType: ServiceType.FREE,
				departmentId: roadsDept.id,
				categoryId: catPothole.id,
			},
		}),
	);

	const svcRoadResurface = await p(
		prisma.service.create({
			data: {
				name: "Road Resurfacing (per 100m stretch)",
				description:
					"Professional road resurfacing for a 100-metre section. Includes base repair, asphalt layer, and traffic sign refresh.",
				price: 25,
				estimatedDuration: 120,
				isPaid: true,
				serviceType: ServiceType.PAID,
				departmentId: roadsDept.id,
				categoryId: catRoadResurface.id,
			},
		}),
	);

	const svcWaterLeakFree = await p(
		prisma.service.create({
			data: {
				name: "Water Leakage Inspection",
				description:
					"Free on-site inspection of suspected pipe leaks. Technician will diagnose and recommend repair plan.",
				price: 0,
				estimatedDuration: 24,
				isPaid: false,
				serviceType: ServiceType.FREE,
				departmentId: waterDept.id,
				categoryId: catWaterLeak.id,
			},
		}),
	);

	const svcWaterEmergency = await p(
		prisma.service.create({
			data: {
				name: "Emergency Water Line Repair",
				description:
					"Priority emergency repair of burst or severely leaking water mains. Includes temporary bypass and permanent fix.",
				price: 40,
				estimatedDuration: 24,
				isPaid: true,
				serviceType: ServiceType.PAID,
				departmentId: waterDept.id,
				categoryId: catWaterLeak.id,
			},
		}),
	);

	const svcGarbageFree = await p(
		prisma.service.create({
			data: {
				name: "Standard Garbage Collection",
				description:
					"Scheduled garbage collection from your locality. Available on designated collection days.",
				price: 0,
				estimatedDuration: 72,
				isPaid: false,
				serviceType: ServiceType.FREE,
				departmentId: wasteDept.id,
				categoryId: catGarbage.id,
			},
		}),
	);

	const svcGarbageExpress = await p(
		prisma.service.create({
			data: {
				name: "Express Garbage Collection",
				description:
					"Same-day priority garbage pickup for urgent sanitation needs. Available within 6 hours of assignment.",
				price: 10,
				estimatedDuration: 6,
				isPaid: true,
				serviceType: ServiceType.PAID,
				departmentId: wasteDept.id,
				categoryId: catGarbage.id,
			},
		}),
	);

	const svcStreetLightFree = await p(
		prisma.service.create({
			data: {
				name: "Street Light Outage Report",
				description:
					"Report a non-functional street light. A maintenance team will inspect and repair within 72 hours.",
				price: 0,
				estimatedDuration: 72,
				isPaid: false,
				serviceType: ServiceType.FREE,
				departmentId: streetLightDept.id,
				categoryId: catStreetLight.id,
			},
		}),
	);

	// ─── Locations ────────────────────────────────────────────────────────────

	const loc1 = await p(
		prisma.location.create({
			data: {
				address: "House 12, Road 5, Dhanmondi, Dhaka 1205",
				latitude: "23.7465",
				longitude: "90.3742",
				area: "Dhanmondi",
				city: "Dhaka",
			},
		}),
	);

	const loc2 = await p(
		prisma.location.create({
			data: {
				address: "Panthapath Junction, near Square Hospital, Dhanmondi",
				latitude: "23.7510",
				longitude: "90.3860",
				area: "Dhanmondi",
				city: "Dhaka",
			},
		}),
	);

	const loc3 = await p(
		prisma.location.create({
			data: {
				address: "Banani DOHS, Road 4, Block C, Dhaka 1213",
				latitude: "23.7936",
				longitude: "90.4023",
				area: "Banani",
				city: "Dhaka",
			},
		}),
	);

	const loc4 = await p(
		prisma.location.create({
			data: {
				address: "Main Road, Sector 4, Uttara, Dhaka 1230",
				latitude: "23.8698",
				longitude: "90.3736",
				area: "Uttara",
				city: "Dhaka",
			},
		}),
	);

	// ─── Requests ─────────────────────────────────────────────────────────────

	const now = Date.now();
	const DAY = 86_400_000;

	const request1 = await p(
		prisma.request.create({
			data: {
				requestNumber: "REQ-2026-0001",
				type: RequestType.COMPLAINT,
				title: "Large pothole near Dhanmondi Lake entrance",
				description:
					"A pothole approximately 60cm wide and 15cm deep has formed at the main entrance to Dhanmondi Lake. It is a hazard for both vehicles and pedestrians, especially during evening hours when visibility is low.",
				status: RequestStatus.COMPLETED,
				priority: Priority.HIGH,
				citizenId: citizenUser.citizen!.id,
				categoryId: catPothole.id,
				serviceId: svcPotholeFree.id,
				locationId: loc1.id,
				assignedResolverId: resolverProfile1.id,
				assignedAt: new Date(now - 5 * DAY),
				resolvedAt: new Date(now - 2 * DAY),
				completedAt: new Date(now - 1 * DAY),
				slaDeadline: new Date(now + 1 * DAY),
			},
		}),
	);

	const request2 = await p(
		prisma.request.create({
			data: {
				requestNumber: "REQ-2026-0002",
				type: RequestType.COMPLAINT,
				title: "Multiple street lights not working on Road 11 Banani",
				description:
					"Three consecutive street lights (posts 27, 28, 29) on Road 11 Banani DOHS have been non-functional for over a week. The stretch is completely dark after sunset creating safety concerns for residents and commuters.",
				status: RequestStatus.IN_PROGRESS,
				priority: Priority.MEDIUM,
				citizenId: citizenUser2.citizen!.id,
				categoryId: catStreetLight.id,
				serviceId: svcStreetLightFree.id,
				locationId: loc3.id,
				assignedResolverId: resolverProfile1.id,
				assignedAt: new Date(now - 3 * DAY),
				slaDeadline: new Date(now + 2 * DAY),
			},
		}),
	);

	const request3 = await p(
		prisma.request.create({
			data: {
				requestNumber: "REQ-2026-0003",
				type: RequestType.SERVICE_REQUEST,
				title: "Urgent water pipe burst in Dhanmondi residential area",
				description:
					"A water supply pipe has burst at the junction near Panthapath causing flooding in adjacent buildings. Immediate repair is required to prevent further water damage to properties and restore supply to over 50 households.",
				status: RequestStatus.RESOLVED,
				priority: Priority.HIGH,
				citizenId: citizenUser.citizen!.id,
				categoryId: catWaterLeak.id,
				serviceId: svcWaterEmergency.id,
				locationId: loc2.id,
				assignedResolverId: resolverProfile2.id,
				assignedAt: new Date(now - 4 * DAY),
				resolvedAt: new Date(now - 1 * DAY),
				slaDeadline: new Date(now + 0.5 * DAY),
			},
		}),
	);

	const request4 = await p(
		prisma.request.create({
			data: {
				requestNumber: "REQ-2026-0004",
				type: RequestType.COMPLAINT,
				title: "Illegal waste dumping near Uttara Sector 4 park",
				description:
					"Large piles of construction debris and household waste have been illegally dumped beside the community park entrance in Sector 4 Uttara. This is attracting pests, emitting a foul odour, and blocking pedestrian access to the park.",
				status: RequestStatus.SUBMITTED,
				priority: Priority.MEDIUM,
				citizenId: citizenUser2.citizen!.id,
				categoryId: catIllegalDumping.id,
				serviceId: svcGarbageFree.id,
				locationId: loc4.id,
			},
		}),
	);

	// ─── Assignments ──────────────────────────────────────────────────────────

	const assignment1 = await p(
		prisma.assignment.create({
			data: {
				status: AssignmentStatus.COMPLETED,
				priority: Priority.HIGH,
				assignedAt: new Date(now - 5 * DAY),
				acceptedAt: new Date(now - 4.9 * DAY),
				completedAt: new Date(now - 2 * DAY),
				requestId: request1.id,
				resolverId: resolverProfile1.id,
				assignedByAdminId: admin.id,
			},
		}),
	);

	const assignment2 = await p(
		prisma.assignment.create({
			data: {
				status: AssignmentStatus.IN_PROGRESS,
				priority: Priority.MEDIUM,
				assignedAt: new Date(now - 3 * DAY),
				acceptedAt: new Date(now - 2.9 * DAY),
				requestId: request2.id,
				resolverId: resolverProfile1.id,
				assignedByAdminId: admin.id,
			},
		}),
	);

	const assignment3 = await p(
		prisma.assignment.create({
			data: {
				status: AssignmentStatus.COMPLETED,
				priority: Priority.HIGH,
				assignedAt: new Date(now - 4 * DAY),
				acceptedAt: new Date(now - 3.9 * DAY),
				completedAt: new Date(now - 1 * DAY),
				requestId: request3.id,
				resolverId: resolverProfile2.id,
				assignedByAdminId: admin.id,
			},
		}),
	);

	// ─── Status History ───────────────────────────────────────────────────────

	const historyEntries = [
		// Request 1 lifecycle: SUBMITTED → ASSIGNED → ACCEPTED → IN_PROGRESS → RESOLVED → COMPLETED
		{
			requestId: request1.id,
			status: RequestStatus.SUBMITTED,
			notes: "Request submitted by citizen",
			changedByUserId: citizenUser.id,
		},
		{
			requestId: request1.id,
			status: RequestStatus.ASSIGNED,
			previousStatus: RequestStatus.SUBMITTED,
			notes: "Assigned to Karim Hossain",
			changedByUserId: admin.id,
		},
		{
			requestId: request1.id,
			status: RequestStatus.ACCEPTED,
			previousStatus: RequestStatus.ASSIGNED,
			notes: "Assignment accepted by resolver",
			changedByUserId: resolverUser1.id,
		},
		{
			requestId: request1.id,
			status: RequestStatus.IN_PROGRESS,
			previousStatus: RequestStatus.ACCEPTED,
			notes: "Pothole filling work started",
			changedByUserId: resolverUser1.id,
		},
		{
			requestId: request1.id,
			status: RequestStatus.RESOLVED,
			previousStatus: RequestStatus.IN_PROGRESS,
			notes: "Pothole successfully filled and surface compacted",
			changedByUserId: resolverUser1.id,
		},
		{
			requestId: request1.id,
			status: RequestStatus.COMPLETED,
			previousStatus: RequestStatus.RESOLVED,
			notes: "Request completion confirmed by citizen",
			changedByUserId: citizenUser.id,
		},

		// Request 2 lifecycle: SUBMITTED → ASSIGNED → ACCEPTED → IN_PROGRESS
		{
			requestId: request2.id,
			status: RequestStatus.SUBMITTED,
			notes: "Request submitted by citizen",
			changedByUserId: citizenUser2.id,
		},
		{
			requestId: request2.id,
			status: RequestStatus.ASSIGNED,
			previousStatus: RequestStatus.SUBMITTED,
			notes: "Assigned to Karim Hossain",
			changedByUserId: admin.id,
		},
		{
			requestId: request2.id,
			status: RequestStatus.ACCEPTED,
			previousStatus: RequestStatus.ASSIGNED,
			notes: "Assignment accepted by resolver",
			changedByUserId: resolverUser1.id,
		},
		{
			requestId: request2.id,
			status: RequestStatus.IN_PROGRESS,
			previousStatus: RequestStatus.ACCEPTED,
			notes: "Inspection complete; replacement LED fixtures ordered",
			changedByUserId: resolverUser1.id,
		},

		// Request 3 lifecycle: SUBMITTED → ASSIGNED → ACCEPTED → IN_PROGRESS → RESOLVED
		{
			requestId: request3.id,
			status: RequestStatus.SUBMITTED,
			notes: "Request submitted after successful payment",
			changedByUserId: citizenUser.id,
		},
		{
			requestId: request3.id,
			status: RequestStatus.ASSIGNED,
			previousStatus: RequestStatus.SUBMITTED,
			notes: "Auto-assigned to Farhana Akter",
			changedByUserId: admin.id,
		},
		{
			requestId: request3.id,
			status: RequestStatus.ACCEPTED,
			previousStatus: RequestStatus.ASSIGNED,
			notes: "Assignment accepted by resolver",
			changedByUserId: resolverUser2.id,
		},
		{
			requestId: request3.id,
			status: RequestStatus.IN_PROGRESS,
			previousStatus: RequestStatus.ACCEPTED,
			notes: "Emergency repair initiated; water supply temporarily shut",
			changedByUserId: resolverUser2.id,
		},
		{
			requestId: request3.id,
			status: RequestStatus.RESOLVED,
			previousStatus: RequestStatus.IN_PROGRESS,
			notes: "Pipe repaired, water supply restored. Flow tested OK.",
			changedByUserId: resolverUser2.id,
		},

		// Request 4 lifecycle: SUBMITTED only
		{
			requestId: request4.id,
			status: RequestStatus.SUBMITTED,
			notes: "Request submitted by citizen",
			changedByUserId: citizenUser2.id,
		},
	];

	for (const entry of historyEntries) {
		await p(prisma.requestStatusHistory.create({ data: entry }));
	}

	// ─── Feedback (for request1) ──────────────────────────────────────────────

	await p(
		prisma.feedback.create({
			data: {
				rating: 4,
				comment:
					"Good work, the pothole was filled neatly. Took a bit longer than expected but the result is solid. Would have appreciated a faster turnaround, but otherwise satisfied.",
				requestId: request1.id,
				citizenId: citizenUser.citizen!.id,
				resolverId: resolverProfile1.id,
			},
		}),
	);

	// ─── Payment (for request3 — paid emergency service) ──────────────────────

	await p(
		prisma.payment.create({
			data: {
				amount: 40,
				status: PaymentStatus.PAID,
				transactionId: "cs_seed_0001",
				paidAt: new Date(now - 3.5 * DAY),
				paymentMethod: PaymentMethod.CARD,
				paymentProvider: "stripe",
				stripeEventId: "evt_seed_0001",
				requestId: request3.id,
				citizenId: citizenUser.citizen!.id,
				serviceId: svcWaterEmergency.id,
			},
		}),
	);

	console.log("✅ Seed completed successfully.\n");
	console.log(
		"───────────────────────────────────────────────────────────────",
	);
	console.log("  📋  Demo Credentials");
	console.log(
		"───────────────────────────────────────────────────────────────",
	);
	console.log(
		`  Admin     :  ${SEED_CREDENTIALS.admin.email}  /  ${SEED_CREDENTIALS.admin.password}`,
	);
	console.log(
		`  Citizen   :  ${SEED_CREDENTIALS.citizen.email}  /  ${SEED_CREDENTIALS.citizen.password}`,
	);
	console.log(
		`  Resolver  :  ${SEED_CREDENTIALS.resolver.email}  /  ${SEED_CREDENTIALS.resolver.password}`,
	);
	console.log(
		"───────────────────────────────────────────────────────────────\n",
	);

	console.log("  📊  Sample Data Created");
	console.log(
		"───────────────────────────────────────────────────────────────",
	);
	console.log("  4 Departments • 10 Categories • 7 Services");
	console.log("  1 Admin • 2 Citizens • 3 Resolvers");
	console.log("  4 Locations • 4 Requests • 3 Assignments");
	console.log("  1 Feedback • 1 Payment • 15 Status History entries");
	console.log(
		"───────────────────────────────────────────────────────────────\n",
	);
}

seed()
	.catch(async (e) => {
		console.error("❌ Seed failed:", e);
		process.exitCode = 1;
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
