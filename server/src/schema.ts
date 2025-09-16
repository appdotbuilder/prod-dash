import { z } from 'zod';

// KPI data schema
export const kpiDataSchema = z.object({
  id: z.number(),
  week_date: z.coerce.date(), // Start date of the week
  efficiency: z.number().min(0).max(100), // Percentage 0-100
  production_rate: z.number().nonnegative(), // Units per hour
  defects_ppm: z.number().nonnegative(), // Parts per million
  created_at: z.coerce.date()
});

export type KpiData = z.infer<typeof kpiDataSchema>;

// Input schema for creating KPI data
export const createKpiDataInputSchema = z.object({
  week_date: z.coerce.date(),
  efficiency: z.number().min(0).max(100),
  production_rate: z.number().nonnegative(),
  defects_ppm: z.number().nonnegative()
});

export type CreateKpiDataInput = z.infer<typeof createKpiDataInputSchema>;

// Staff status enum
export const staffStatusEnum = z.enum(['active', 'on_vacation']);
export type StaffStatus = z.infer<typeof staffStatusEnum>;

// Staff member schema
export const staffMemberSchema = z.object({
  id: z.number(),
  name: z.string(),
  position: z.string(),
  department: z.string(),
  status: staffStatusEnum,
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type StaffMember = z.infer<typeof staffMemberSchema>;

// Input schema for creating staff members
export const createStaffMemberInputSchema = z.object({
  name: z.string().min(1),
  position: z.string().min(1),
  department: z.string().min(1),
  status: staffStatusEnum
});

export type CreateStaffMemberInput = z.infer<typeof createStaffMemberInputSchema>;

// Input schema for updating staff members
export const updateStaffMemberInputSchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  position: z.string().min(1).optional(),
  department: z.string().min(1).optional(),
  status: staffStatusEnum.optional()
});

export type UpdateStaffMemberInput = z.infer<typeof updateStaffMemberInputSchema>;

// CSV upload schema for KPI data
export const csvKpiRowSchema = z.object({
  week_date: z.string(), // Will be parsed as date
  efficiency: z.string(), // Will be parsed as number
  production_rate: z.string(), // Will be parsed as number
  defects_ppm: z.string() // Will be parsed as number
});

export type CsvKpiRow = z.infer<typeof csvKpiRowSchema>;

// CSV upload schema for staff data
export const csvStaffRowSchema = z.object({
  name: z.string(),
  position: z.string(),
  department: z.string(),
  status: z.string() // Will be validated against staffStatusEnum
});

export type CsvStaffRow = z.infer<typeof csvStaffRowSchema>;

// CSV upload input schema
export const csvUploadInputSchema = z.object({
  type: z.enum(['kpi', 'staff']),
  data: z.string() // CSV content as string
});

export type CsvUploadInput = z.infer<typeof csvUploadInputSchema>;

// Date range query schema
export const dateRangeQuerySchema = z.object({
  start_date: z.coerce.date().optional(),
  end_date: z.coerce.date().optional()
});

export type DateRangeQuery = z.infer<typeof dateRangeQuerySchema>;