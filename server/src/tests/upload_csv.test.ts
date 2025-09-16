import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { kpiDataTable, staffMembersTable } from '../db/schema';
import { type CsvUploadInput } from '../schema';
import { uploadCsv } from '../handlers/upload_csv';
import { eq } from 'drizzle-orm';

describe('uploadCsv', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('KPI data upload', () => {
    it('should successfully upload valid KPI CSV data', async () => {
      const csvData = 'week_date,efficiency,production_rate,defects_ppm\n2024-01-01,85.5,150.75,25.5\n2024-01-08,90.2,175.25,18.3';
      
      const input: CsvUploadInput = {
        type: 'kpi',
        data: csvData
      };

      const result = await uploadCsv(input);

      expect(result.success).toBe(true);
      expect(result.recordsProcessed).toBe(2);
      expect(result.errors).toHaveLength(0);

      // Verify data was inserted correctly
      const records = await db.select().from(kpiDataTable).execute();
      expect(records).toHaveLength(2);
      
      const firstRecord = records.find(r => r.week_date.toISOString().startsWith('2024-01-01'));
      expect(firstRecord).toBeDefined();
      expect(parseFloat(firstRecord!.efficiency)).toBe(85.5);
      expect(parseFloat(firstRecord!.production_rate)).toBe(150.75);
      expect(parseFloat(firstRecord!.defects_ppm)).toBe(25.5);
    });

    it('should update existing KPI records with same week_date', async () => {
      // Insert initial record
      await db.insert(kpiDataTable)
        .values({
          week_date: new Date('2024-01-01'),
          efficiency: '80.0',
          production_rate: '140.0',
          defects_ppm: '30.0'
        })
        .execute();

      const csvData = 'week_date,efficiency,production_rate,defects_ppm\n2024-01-01,95.5,180.25,15.2';
      
      const input: CsvUploadInput = {
        type: 'kpi',
        data: csvData
      };

      const result = await uploadCsv(input);

      expect(result.success).toBe(true);
      expect(result.recordsProcessed).toBe(1);
      expect(result.errors).toHaveLength(0);

      // Verify record was updated, not duplicated
      const records = await db.select().from(kpiDataTable).execute();
      expect(records).toHaveLength(1);
      expect(parseFloat(records[0].efficiency)).toBe(95.5);
      expect(parseFloat(records[0].production_rate)).toBe(180.25);
      expect(parseFloat(records[0].defects_ppm)).toBe(15.2);
    });

    it('should handle validation errors for invalid KPI data', async () => {
      const csvData = 'week_date,efficiency,production_rate,defects_ppm\ninvalid-date,105.5,-10,abc\n2024-01-08,50.0,100.0,20.0';
      
      const input: CsvUploadInput = {
        type: 'kpi',
        data: csvData
      };

      const result = await uploadCsv(input);

      expect(result.success).toBe(false);
      expect(result.recordsProcessed).toBe(1); // Only the valid row
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toMatch(/Row 2:.*efficiency.*must be less than or equal to 100.*production_rate.*must be greater than or equal to 0/);

      // Verify only valid record was inserted
      const records = await db.select().from(kpiDataTable).execute();
      expect(records).toHaveLength(1);
      expect(parseFloat(records[0].efficiency)).toBe(50.0);
    });

    it('should reject KPI CSV with wrong headers', async () => {
      const csvData = 'date,eff,rate,defects\n2024-01-01,85.5,150.75,25.5';
      
      const input: CsvUploadInput = {
        type: 'kpi',
        data: csvData
      };

      const result = await uploadCsv(input);

      expect(result.success).toBe(false);
      expect(result.recordsProcessed).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toMatch(/Invalid header at position 1.*Expected 'week_date', got 'date'/);
    });

    it('should handle wrong number of columns in KPI data', async () => {
      const csvData = 'week_date,efficiency,production_rate,defects_ppm\n2024-01-01,85.5,150.75\n2024-01-08,90.2,175.25,18.3,extra';
      
      const input: CsvUploadInput = {
        type: 'kpi',
        data: csvData
      };

      const result = await uploadCsv(input);

      expect(result.success).toBe(false);
      expect(result.recordsProcessed).toBe(0);
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0]).toMatch(/Row 2: Expected 4 columns, got 3/);
      expect(result.errors[1]).toMatch(/Row 3: Expected 4 columns, got 5/);
    });
  });

  describe('Staff data upload', () => {
    it('should successfully upload valid staff CSV data', async () => {
      const csvData = 'name,position,department,status\nJohn Doe,Engineer,Production,active\nJane Smith,Manager,Quality,on_vacation';
      
      const input: CsvUploadInput = {
        type: 'staff',
        data: csvData
      };

      const result = await uploadCsv(input);

      expect(result.success).toBe(true);
      expect(result.recordsProcessed).toBe(2);
      expect(result.errors).toHaveLength(0);

      // Verify data was inserted correctly
      const records = await db.select().from(staffMembersTable).execute();
      expect(records).toHaveLength(2);
      
      const johnRecord = records.find(r => r.name === 'John Doe');
      expect(johnRecord).toBeDefined();
      expect(johnRecord!.position).toBe('Engineer');
      expect(johnRecord!.department).toBe('Production');
      expect(johnRecord!.status).toBe('active');
    });

    it('should update existing staff members in same department', async () => {
      // Insert initial staff member
      await db.insert(staffMembersTable)
        .values({
          name: 'John Doe',
          position: 'Junior Engineer',
          department: 'Production',
          status: 'active'
        })
        .execute();

      const csvData = 'name,position,department,status\nJohn Doe,Senior Engineer,Production,on_vacation';
      
      const input: CsvUploadInput = {
        type: 'staff',
        data: csvData
      };

      const result = await uploadCsv(input);

      expect(result.success).toBe(true);
      expect(result.recordsProcessed).toBe(1);
      expect(result.errors).toHaveLength(0);

      // Verify record was updated, not duplicated
      const records = await db.select().from(staffMembersTable).execute();
      expect(records).toHaveLength(1);
      expect(records[0].position).toBe('Senior Engineer');
      expect(records[0].status).toBe('on_vacation');
    });

    it('should allow same name in different departments', async () => {
      // Insert initial staff member in Production
      await db.insert(staffMembersTable)
        .values({
          name: 'John Doe',
          position: 'Engineer',
          department: 'Production',
          status: 'active'
        })
        .execute();

      const csvData = 'name,position,department,status\nJohn Doe,Engineer,Quality,active';
      
      const input: CsvUploadInput = {
        type: 'staff',
        data: csvData
      };

      const result = await uploadCsv(input);

      expect(result.success).toBe(true);
      expect(result.recordsProcessed).toBe(1);
      expect(result.errors).toHaveLength(0);

      // Verify both records exist
      const records = await db.select().from(staffMembersTable).execute();
      expect(records).toHaveLength(2);
      
      const departments = records.map(r => r.department).sort();
      expect(departments).toEqual(['Production', 'Quality']);
    });

    it('should handle validation errors for invalid staff data', async () => {
      const csvData = 'name,position,department,status\n,Engineer,Production,active\nJane Smith,,Quality,invalid_status\nBob Johnson,Manager,HR,active';
      
      const input: CsvUploadInput = {
        type: 'staff',
        data: csvData
      };

      const result = await uploadCsv(input);

      expect(result.success).toBe(false);
      expect(result.recordsProcessed).toBe(1); // Only Bob Johnson
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0]).toMatch(/Row 2:.*name.*String must contain at least 1 character/);
      expect(result.errors[1]).toMatch(/Row 3:.*Invalid status 'invalid_status'/);

      // Verify only valid record was inserted
      const records = await db.select().from(staffMembersTable).execute();
      expect(records).toHaveLength(1);
      expect(records[0].name).toBe('Bob Johnson');
    });

    it('should reject staff CSV with wrong headers', async () => {
      const csvData = 'employee_name,job_title,dept,state\nJohn Doe,Engineer,Production,active';
      
      const input: CsvUploadInput = {
        type: 'staff',
        data: csvData
      };

      const result = await uploadCsv(input);

      expect(result.success).toBe(false);
      expect(result.recordsProcessed).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toMatch(/Invalid header at position 1.*Expected 'name', got 'employee_name'/);
    });
  });

  describe('General CSV validation', () => {
    it('should reject empty CSV data', async () => {
      const input: CsvUploadInput = {
        type: 'kpi',
        data: '   '
      };

      const result = await uploadCsv(input);

      expect(result.success).toBe(false);
      expect(result.recordsProcessed).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toBe('CSV data is empty');
    });

    it('should reject CSV with only headers', async () => {
      const input: CsvUploadInput = {
        type: 'kpi',
        data: 'week_date,efficiency,production_rate,defects_ppm'
      };

      const result = await uploadCsv(input);

      expect(result.success).toBe(false);
      expect(result.recordsProcessed).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toBe('CSV contains only headers, no data rows');
    });

    it('should reject invalid upload type', async () => {
      const input = {
        type: 'invalid' as any,
        data: 'header1,header2\nvalue1,value2'
      };

      const result = await uploadCsv(input);

      expect(result.success).toBe(false);
      expect(result.recordsProcessed).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toBe("Invalid type 'invalid'. Must be 'kpi' or 'staff'");
    });

    it('should handle mixed success and failure scenarios', async () => {
      const csvData = 'week_date,efficiency,production_rate,defects_ppm\n2024-01-01,85.5,150.75,25.5\ninvalid-date,105.5,100.0,20.0\n2024-01-15,75.0,120.0,30.0';
      
      const input: CsvUploadInput = {
        type: 'kpi',
        data: csvData
      };

      const result = await uploadCsv(input);

      expect(result.success).toBe(false); // Has errors
      expect(result.recordsProcessed).toBe(2); // Two valid records
      expect(result.errors).toHaveLength(1); // One invalid record
      expect(result.errors[0]).toMatch(/Row 3:.*efficiency.*must be less than or equal to 100/);

      // Verify valid records were still inserted
      const records = await db.select().from(kpiDataTable).execute();
      expect(records).toHaveLength(2);
    });
  });
});