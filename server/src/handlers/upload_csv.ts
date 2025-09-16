import { db } from '../db';
import { kpiDataTable, staffMembersTable } from '../db/schema';
import { 
  type CsvUploadInput, 
  type KpiData, 
  type StaffMember,
  csvKpiRowSchema,
  csvStaffRowSchema,
  createKpiDataInputSchema,
  createStaffMemberInputSchema,
  staffStatusEnum
} from '../schema';
import { eq } from 'drizzle-orm';

export const uploadCsv = async (input: CsvUploadInput): Promise<{ success: boolean; recordsProcessed: number; errors: string[] }> => {
  try {
    const errors: string[] = [];
    let recordsProcessed = 0;

    // Parse CSV data into rows
    const trimmedData = input.data.trim();
    if (trimmedData === '') {
      return { success: false, recordsProcessed: 0, errors: ['CSV data is empty'] };
    }
    
    const lines = trimmedData.split('\n');
    if (lines.length === 0) {
      return { success: false, recordsProcessed: 0, errors: ['CSV data is empty'] };
    }

    // Extract header and data rows
    const headers = lines[0].split(',').map(h => h.trim());
    const dataRows = lines.slice(1);

    if (dataRows.length === 0) {
      return { success: false, recordsProcessed: 0, errors: ['CSV contains only headers, no data rows'] };
    }

    if (input.type === 'kpi') {
      // Process KPI data
      const expectedHeaders = ['week_date', 'efficiency', 'production_rate', 'defects_ppm'];
      const headerValidation = validateHeaders(headers, expectedHeaders);
      if (!headerValidation.valid) {
        return { success: false, recordsProcessed: 0, errors: [headerValidation.error!] };
      }

      for (let i = 0; i < dataRows.length; i++) {
        const rowIndex = i + 2; // Account for 0-based index + header row
        const row = dataRows[i];
        const values = row.split(',').map(v => v.trim());

        if (values.length !== expectedHeaders.length) {
          errors.push(`Row ${rowIndex}: Expected ${expectedHeaders.length} columns, got ${values.length}`);
          continue;
        }

        // Create raw CSV row object
        const csvRow = {
          week_date: values[0],
          efficiency: values[1],
          production_rate: values[2],
          defects_ppm: values[3]
        };

        // Validate CSV row structure
        const csvValidation = csvKpiRowSchema.safeParse(csvRow);
        if (!csvValidation.success) {
          errors.push(`Row ${rowIndex}: Invalid CSV format - ${csvValidation.error.errors.map(e => e.message).join(', ')}`);
          continue;
        }

        // Transform and validate business rules
        try {
          const transformedData = {
            week_date: new Date(csvRow.week_date),
            efficiency: parseFloat(csvRow.efficiency),
            production_rate: parseFloat(csvRow.production_rate),
            defects_ppm: parseFloat(csvRow.defects_ppm)
          };

          const businessValidation = createKpiDataInputSchema.safeParse(transformedData);
          if (!businessValidation.success) {
            errors.push(`Row ${rowIndex}: ${businessValidation.error.errors.map(e => `${e.path.join('.')} ${e.message}`).join(', ')}`);
            continue;
          }

          // Check for duplicate entries (same week_date)
          const existingRecord = await db.select()
            .from(kpiDataTable)
            .where(eq(kpiDataTable.week_date, transformedData.week_date))
            .execute();

          if (existingRecord.length > 0) {
            // Update existing record
            await db.update(kpiDataTable)
              .set({
                efficiency: transformedData.efficiency.toString(),
                production_rate: transformedData.production_rate.toString(),
                defects_ppm: transformedData.defects_ppm.toString()
              })
              .where(eq(kpiDataTable.week_date, transformedData.week_date))
              .execute();
          } else {
            // Insert new record
            await db.insert(kpiDataTable)
              .values({
                week_date: transformedData.week_date,
                efficiency: transformedData.efficiency.toString(),
                production_rate: transformedData.production_rate.toString(),
                defects_ppm: transformedData.defects_ppm.toString()
              })
              .execute();
          }

          recordsProcessed++;
        } catch (error) {
          errors.push(`Row ${rowIndex}: Database error - ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    } else if (input.type === 'staff') {
      // Process staff data
      const expectedHeaders = ['name', 'position', 'department', 'status'];
      const headerValidation = validateHeaders(headers, expectedHeaders);
      if (!headerValidation.valid) {
        return { success: false, recordsProcessed: 0, errors: [headerValidation.error!] };
      }

      for (let i = 0; i < dataRows.length; i++) {
        const rowIndex = i + 2; // Account for 0-based index + header row
        const row = dataRows[i];
        const values = row.split(',').map(v => v.trim());

        if (values.length !== expectedHeaders.length) {
          errors.push(`Row ${rowIndex}: Expected ${expectedHeaders.length} columns, got ${values.length}`);
          continue;
        }

        // Create raw CSV row object
        const csvRow = {
          name: values[0],
          position: values[1],
          department: values[2],
          status: values[3]
        };

        // Validate CSV row structure
        const csvValidation = csvStaffRowSchema.safeParse(csvRow);
        if (!csvValidation.success) {
          errors.push(`Row ${rowIndex}: Invalid CSV format - ${csvValidation.error.errors.map(e => e.message).join(', ')}`);
          continue;
        }

        // Validate status enum
        const statusValidation = staffStatusEnum.safeParse(csvRow.status);
        if (!statusValidation.success) {
          errors.push(`Row ${rowIndex}: Invalid status '${csvRow.status}'. Must be 'active' or 'on_vacation'`);
          continue;
        }

        // Transform and validate business rules
        try {
          const transformedData = {
            name: csvRow.name,
            position: csvRow.position,
            department: csvRow.department,
            status: statusValidation.data
          };

          const businessValidation = createStaffMemberInputSchema.safeParse(transformedData);
          if (!businessValidation.success) {
            errors.push(`Row ${rowIndex}: ${businessValidation.error.errors.map(e => `${e.path.join('.')} ${e.message}`).join(', ')}`);
            continue;
          }

          // Check for duplicate entries (same name and department)
          const existingRecord = await db.select()
            .from(staffMembersTable)
            .where(eq(staffMembersTable.name, transformedData.name))
            .execute();

          const duplicateInSameDept = existingRecord.find(record => record.department === transformedData.department);

          if (duplicateInSameDept) {
            // Update existing record
            await db.update(staffMembersTable)
              .set({
                position: transformedData.position,
                status: transformedData.status,
                updated_at: new Date()
              })
              .where(eq(staffMembersTable.id, duplicateInSameDept.id))
              .execute();
          } else {
            // Insert new record
            await db.insert(staffMembersTable)
              .values({
                name: transformedData.name,
                position: transformedData.position,
                department: transformedData.department,
                status: transformedData.status
              })
              .execute();
          }

          recordsProcessed++;
        } catch (error) {
          errors.push(`Row ${rowIndex}: Database error - ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    } else {
      return { success: false, recordsProcessed: 0, errors: [`Invalid type '${input.type}'. Must be 'kpi' or 'staff'`] };
    }

    const success = errors.length === 0;
    return { success, recordsProcessed, errors };

  } catch (error) {
    console.error('CSV upload failed:', error);
    throw error;
  }
};

function validateHeaders(actualHeaders: string[], expectedHeaders: string[]): { valid: boolean; error?: string } {
  if (actualHeaders.length !== expectedHeaders.length) {
    return {
      valid: false,
      error: `Invalid header count. Expected ${expectedHeaders.length} columns: [${expectedHeaders.join(', ')}], got ${actualHeaders.length}: [${actualHeaders.join(', ')}]`
    };
  }

  for (let i = 0; i < expectedHeaders.length; i++) {
    if (actualHeaders[i] !== expectedHeaders[i]) {
      return {
        valid: false,
        error: `Invalid header at position ${i + 1}. Expected '${expectedHeaders[i]}', got '${actualHeaders[i]}'`
      };
    }
  }

  return { valid: true };
}