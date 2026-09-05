import { Router } from "express";
import { departmentController } from "./department.controller";

export const departmentRouter = Router();

departmentRouter.get("/", departmentController.getAllDepartment);
