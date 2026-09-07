import { Router } from "express";
import { Role } from "../../../generated/prisma/enums.js";
import { auth } from "../../middleware/checkAuth.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import { serviceController } from "./service.controller.js";
import { ServiceValidation } from "./service.validation.js";

export const serviceRouter = Router();

// Category routes
serviceRouter.get("/categories", serviceController.getAllCategories);

serviceRouter.get("/categories/:id", serviceController.getCategoryById);

serviceRouter.post(
	"/categories",
	auth(Role.ADMIN),
	validateRequest(ServiceValidation.CreateCategoryZodSchema),
	serviceController.createCategory,
);

serviceRouter.patch(
	"/categories/:id",
	auth(Role.ADMIN),
	validateRequest(ServiceValidation.UpdateCategoryZodSchema),
	serviceController.updateCategory,
);

serviceRouter.delete(
	"/categories/:id",
	auth(Role.ADMIN),
	serviceController.deleteCategory,
);

// Service routes
serviceRouter.get("/", serviceController.getAllServices);

serviceRouter.get("/:id", serviceController.getServiceById);

serviceRouter.post(
	"/",
	auth(Role.ADMIN),
	validateRequest(ServiceValidation.CreateServiceZodSchema),
	serviceController.createService,
);

serviceRouter.patch(
	"/:id",
	auth(Role.ADMIN),
	validateRequest(ServiceValidation.UpdateServiceZodSchema),
	serviceController.updateService,
);

serviceRouter.delete("/:id", auth(Role.ADMIN), serviceController.deleteService);
