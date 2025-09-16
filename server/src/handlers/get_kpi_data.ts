import { db } from '../db';
import { kpiDataTable } from '../db/schema';
import { type KpiData, type DateRangeQuery } from '../schema';
import { and, gte, lte, asc, type SQL } from 'drizzle-orm';

export const getKpiData = async (query?: DateRangeQuery): Promise<KpiData[]> => {
  try {
    // Build conditions array for optional date filtering
    const conditions: SQL<unknown>[] = [];

    if (query?.start_date) {
      conditions.push(gte(kpiDataTable.week_date, query.start_date));
    }

    if (query?.end_date) {
      conditions.push(lte(kpiDataTable.week_date, query.end_date));
    }

    // Execute query with conditional where clause
    let results;
    
    if (conditions.length > 0) {
      results = await db.select()
        .from(kpiDataTable)
        .where(conditions.length === 1 ? conditions[0] : and(...conditions))
        .orderBy(asc(kpiDataTable.week_date))
        .execute();
    } else {
      results = await db.select()
        .from(kpiDataTable)
        .orderBy(asc(kpiDataTable.week_date))
        .execute();
    }

    // Convert numeric fields from strings to numbers
    return results.map(kpi => ({
      ...kpi,
      efficiency: parseFloat(kpi.efficiency),
      production_rate: parseFloat(kpi.production_rate),
      defects_ppm: parseFloat(kpi.defects_ppm)
    }));
  } catch (error) {
    console.error('Failed to fetch KPI data:', error);
    throw error;
  }
};