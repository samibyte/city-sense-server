import type { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync.js";
import { sendResponse } from "../../utils/sendResponse.js";
import { serviceService } from "./service.service.js";

const createService = catchAsync(async (req: Request, res: Response) => {
	const result = await serviceService.createService(req.body);
	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		message: "Service created successfully",
		data: result,
	});
});

const getAllServices = catchAsync(async (req: Request, res: Response) => {
	const result = await serviceService.getAllServices(req.query);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		message: "Services retrieved successfully",
		data: result.services,
		meta: result.meta,
	});
});

const getServiceById = catchAsync(async (req: Request, res: Response) => {
	const result = await serviceService.getServiceById(req.params.id as string);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		message: "Service retrieved successfully",
		data: result,
	});
});

const updateService = catchAsync(async (req: Request, res: Response) => {
	const result = await serviceService.updateService(
		req.params.id as string,
		req.body,
	);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		message: "Service updated successfully",
		data: result,
	});
});

const deleteService = catchAsync(async (req: Request, res: Response) => {
	const result = await serviceService.deleteService(req.params.id as string);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		message: "Service deleted successfully",
		data: result,
	});
});

const createCategory = catchAsync(async (req: Request, res: Response) => {
	const result = await serviceService.createCategory(req.body);
	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		message: "Category created successfully",
		data: result,
	});
});

const getAllCategories = catchAsync(async (req: Request, res: Response) => {
	const result = await serviceService.getAllCategories(req.query);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		message: "Categories retrieved successfully",
		data: result,
	});
});

const getCategoryById = catchAsync(async (req: Request, res: Response) => {
	const result = await serviceService.getCategoryById(req.params.id as string);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		message: "Category retrieved successfully",
		data: result,
	});
});

const updateCategory = catchAsync(async (req: Request, res: Response) => {
	const result = await serviceService.updateCategory(
		req.params.id as string,
		req.body,
	);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		message: "Category updated successfully",
		data: result,
	});
});

const deleteCategory = catchAsync(async (req: Request, res: Response) => {
	const result = await serviceService.deleteCategory(req.params.id as string);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		message: "Category deleted successfully",
		data: result,
	});
});

export const serviceController = {
	createService,
	getAllServices,
	getServiceById,
	updateService,
	deleteService,
	createCategory,
	getAllCategories,
	getCategoryById,
	updateCategory,
	deleteCategory,
};
