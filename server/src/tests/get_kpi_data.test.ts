import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { kpiDataTable } from '../db/schema';
import { type DateRangeQuery } from '../schema';
import { getKpiData } from '../handlers/get_kpi_data';

// Test data for KPI records
const testKpiData = [
  {
    week_date: new Date('2024-01-01'),
    efficiency: 85.5,
    production_rate: 120.75,
    defects_ppm: 25.3
  },
  {
    week_date: new Date('2024-01-08'),
    efficiency: 87.2,
    production_rate: 125.0,
    defects_ppm: 22.1
  },
  {
    week_date: new Date('2024-01-15'),
    efficiency: 89.0,
    production_rate: 130.25,
    defects_ppm: 18.5
  }
];

describe('getKpiData', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no KPI data exists', async () => {
    const result = await getKpiData();

    expect(result).toEqual([]);
  });

  it('should fetch all KPI data when no query provided', async () => {
    // Insert test data with numeric conversion
    await db.insert(kpiDataTable).values(
      testKpiData.map(kpi => ({
        ...kpi,
        efficiency: kpi.efficiency.toString(),
        production_rate: kpi.production_rate.toString(),
        defects_ppm: kpi.defects_ppm.toString()
      }))
    ).execute();

    const result = await getKpiData();

    expect(result).toHaveLength(3);
    expect(result[0].week_date).toEqual(new Date('2024-01-01'));
    expect(result[0].efficiency).toEqual(85.5);
    expect(result[0].production_rate).toEqual(120.75);
    expect(result[0].defects_ppm).toEqual(25.3);
    expect(typeof result[0].efficiency).toBe('number');
    expect(typeof result[0].production_rate).toBe('number');
    expect(typeof result[0].defects_ppm).toBe('number');
  });

  it('should return data ordered by week_date ascending', async () => {
    // Insert data in reverse chronological order
    const unorderedData = [...testKpiData].reverse();
    await db.insert(kpiDataTable).values(
      unorderedData.map(kpi => ({
        ...kpi,
        efficiency: kpi.efficiency.toString(),
        production_rate: kpi.production_rate.toString(),
        defects_ppm: kpi.defects_ppm.toString()
      }))
    ).execute();

    const result = await getKpiData();

    expect(result).toHaveLength(3);
    // Verify data is sorted by week_date ascending
    expect(result[0].week_date).toEqual(new Date('2024-01-01'));
    expect(result[1].week_date).toEqual(new Date('2024-01-08'));
    expect(result[2].week_date).toEqual(new Date('2024-01-15'));
  });

  it('should filter by start_date correctly', async () => {
    await db.insert(kpiDataTable).values(
      testKpiData.map(kpi => ({
        ...kpi,
        efficiency: kpi.efficiency.toString(),
        production_rate: kpi.production_rate.toString(),
        defects_ppm: kpi.defects_ppm.toString()
      }))
    ).execute();

    const query: DateRangeQuery = {
      start_date: new Date('2024-01-08')
    };

    const result = await getKpiData(query);

    expect(result).toHaveLength(2);
    expect(result[0].week_date).toEqual(new Date('2024-01-08'));
    expect(result[1].week_date).toEqual(new Date('2024-01-15'));
  });

  it('should filter by end_date correctly', async () => {
    await db.insert(kpiDataTable).values(
      testKpiData.map(kpi => ({
        ...kpi,
        efficiency: kpi.efficiency.toString(),
        production_rate: kpi.production_rate.toString(),
        defects_ppm: kpi.defects_ppm.toString()
      }))
    ).execute();

    const query: DateRangeQuery = {
      end_date: new Date('2024-01-08')
    };

    const result = await getKpiData(query);

    expect(result).toHaveLength(2);
    expect(result[0].week_date).toEqual(new Date('2024-01-01'));
    expect(result[1].week_date).toEqual(new Date('2024-01-08'));
  });

  it('should filter by date range with both start and end dates', async () => {
    await db.insert(kpiDataTable).values(
      testKpiData.map(kpi => ({
        ...kpi,
        efficiency: kpi.efficiency.toString(),
        production_rate: kpi.production_rate.toString(),
        defects_ppm: kpi.defects_ppm.toString()
      }))
    ).execute();

    const query: DateRangeQuery = {
      start_date: new Date('2024-01-05'),
      end_date: new Date('2024-01-10')
    };

    const result = await getKpiData(query);

    expect(result).toHaveLength(1);
    expect(result[0].week_date).toEqual(new Date('2024-01-08'));
    expect(result[0].efficiency).toEqual(87.2);
  });

  it('should return empty array when date range excludes all data', async () => {
    await db.insert(kpiDataTable).values(
      testKpiData.map(kpi => ({
        ...kpi,
        efficiency: kpi.efficiency.toString(),
        production_rate: kpi.production_rate.toString(),
        defects_ppm: kpi.defects_ppm.toString()
      }))
    ).execute();

    const query: DateRangeQuery = {
      start_date: new Date('2024-02-01'),
      end_date: new Date('2024-02-28')
    };

    const result = await getKpiData(query);

    expect(result).toEqual([]);
  });

  it('should handle edge case with same start and end date', async () => {
    await db.insert(kpiDataTable).values(
      testKpiData.map(kpi => ({
        ...kpi,
        efficiency: kpi.efficiency.toString(),
        production_rate: kpi.production_rate.toString(),
        defects_ppm: kpi.defects_ppm.toString()
      }))
    ).execute();

    const query: DateRangeQuery = {
      start_date: new Date('2024-01-08'),
      end_date: new Date('2024-01-08')
    };

    const result = await getKpiData(query);

    expect(result).toHaveLength(1);
    expect(result[0].week_date).toEqual(new Date('2024-01-08'));
    expect(result[0].efficiency).toEqual(87.2);
  });

  it('should properly convert all numeric fields to numbers', async () => {
    const singleKpiData = {
      week_date: new Date('2024-01-01'),
      efficiency: 95.75,
      production_rate: 142.33,
      defects_ppm: 12.67
    };

    await db.insert(kpiDataTable).values({
      ...singleKpiData,
      efficiency: singleKpiData.efficiency.toString(),
      production_rate: singleKpiData.production_rate.toString(),
      defects_ppm: singleKpiData.defects_ppm.toString()
    }).execute();

    const result = await getKpiData();

    expect(result).toHaveLength(1);
    const kpi = result[0];
    
    // Verify all numeric fields are properly converted
    expect(typeof kpi.efficiency).toBe('number');
    expect(typeof kpi.production_rate).toBe('number');
    expect(typeof kpi.defects_ppm).toBe('number');
    expect(kpi.efficiency).toEqual(95.75);
    expect(kpi.production_rate).toEqual(142.33);
    expect(kpi.defects_ppm).toEqual(12.67);
  });
});