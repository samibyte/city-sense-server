import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { departmentController } from "./department.controller";
import { DepartmentValidation } from "./department.validation";

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
