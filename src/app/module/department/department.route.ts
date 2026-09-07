import { Router } from "express";
import { Role } from "../../../generated/prisma/enums.js";
import { auth } from "../../middleware/checkAuth.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import { departmentController } from "./department.controller.js";
import { DepartmentValidation } from "./department.validation.js";

export const departmentRouter = Router();

departmentRouter.get("/", departmentController.getAllDepartment);

departmentRouter.get("/:id", departmentController.getDepartmentById);

departmentRouter.post(
	"/",
	auth(Role.ADMIN),
	validateRequest(DepartmentValidation.CreateDepartmentZodSchema),
	departmentController.createDepartment,
);

departmentRouter.patch(
	"/:id",
	auth(Role.ADMIN),
	validateRequest(DepartmentValidation.UpdateDepartmentZodSchema),
	departmentController.updateDepartment,
);

departmentRouter.delete(
	"/:id",
	auth(Role.ADMIN),
	departmentController.deleteDepartment,
);
