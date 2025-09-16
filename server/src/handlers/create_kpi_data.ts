import { db } from '../db';
import { kpiDataTable } from '../db/schema';
import { type CreateKpiDataInput, type KpiData } from '../schema';

export const createKpiData = async (input: CreateKpiDataInput): Promise<KpiData> => {
  try {
    // Insert KPI data record
    const result = await db.insert(kpiDataTable)
      .values({
        week_date: input.week_date,
        efficiency: input.efficiency.toString(), // Convert number to string for numeric column
        production_rate: input.production_rate.toString(), // Convert number to string for numeric column
        defects_ppm: input.defects_ppm.toString() // Convert number to string for numeric column
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const kpiData = result[0];
    return {
      ...kpiData,
      efficiency: parseFloat(kpiData.efficiency), // Convert string back to number
      production_rate: parseFloat(kpiData.production_rate), // Convert string back to number
      defects_ppm: parseFloat(kpiData.defects_ppm) // Convert string back to number
    };
  } catch (error) {
    console.error('KPI data creation failed:', error);
    throw error;
  }
};