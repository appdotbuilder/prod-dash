import { serial, text, pgTable, timestamp, numeric, pgEnum } from 'drizzle-orm/pg-core';

// Define staff status enum for database
export const staffStatusEnum = pgEnum('staff_status', ['active', 'on_vacation']);

// KPI data table for storing weekly production metrics
export const kpiDataTable = pgTable('kpi_data', {
  id: serial('id').primaryKey(),
  week_date: timestamp('week_date', { withTimezone: false }).notNull(), // Start date of the week
  efficiency: numeric('efficiency', { precision: 5, scale: 2 }).notNull(), // Percentage with 2 decimal places
  production_rate: numeric('production_rate', { precision: 10, scale: 2 }).notNull(), // Units per hour
  defects_ppm: numeric('defects_ppm', { precision: 10, scale: 2 }).notNull(), // Parts per million
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Staff members table for production personnel information
export const staffMembersTable = pgTable('staff_members', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  position: text('position').notNull(),
  department: text('department').notNull(),
  status: staffStatusEnum('status').notNull().default('active'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// TypeScript types for the table schemas
export type KpiData = typeof kpiDataTable.$inferSelect; // For SELECT operations
export type NewKpiData = typeof kpiDataTable.$inferInsert; // For INSERT operations

export type StaffMember = typeof staffMembersTable.$inferSelect; // For SELECT operations
export type NewStaffMember = typeof staffMembersTable.$inferInsert; // For INSERT operations

// Export all tables and relations for proper query building
export const tables = { 
  kpiData: kpiDataTable, 
  staffMembers: staffMembersTable 
};