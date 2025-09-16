import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { kpiDataTable } from '../db/schema';
import { type CreateKpiDataInput } from '../schema';
import { createKpiData } from '../handlers/create_kpi_data';
import { eq, gte, between, and } from 'drizzle-orm';

// Simple test input
const testInput: CreateKpiDataInput = {
  week_date: new Date('2024-01-01'),
  efficiency: 85.5,
  production_rate: 150.25,
  defects_ppm: 45.8
};

describe('createKpiData', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create KPI data entry', async () => {
    const result = await createKpiData(testInput);

    // Basic field validation
    expect(result.week_date).toEqual(new Date('2024-01-01'));
    expect(result.efficiency).toEqual(85.5);
    expect(result.production_rate).toEqual(150.25);
    expect(result.defects_ppm).toEqual(45.8);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);

    // Verify numeric types are correct after conversion
    expect(typeof result.efficiency).toBe('number');
    expect(typeof result.production_rate).toBe('number');
    expect(typeof result.defects_ppm).toBe('number');
  });

  it('should save KPI data to database', async () => {
    const result = await createKpiData(testInput);

    // Query using proper drizzle syntax
    const kpiDataEntries = await db.select()
      .from(kpiDataTable)
      .where(eq(kpiDataTable.id, result.id))
      .execute();

    expect(kpiDataEntries).toHaveLength(1);
    const savedEntry = kpiDataEntries[0];
    
    expect(savedEntry.week_date).toEqual(new Date('2024-01-01'));
    expect(parseFloat(savedEntry.efficiency)).toEqual(85.5);
    expect(parseFloat(savedEntry.production_rate)).toEqual(150.25);
    expect(parseFloat(savedEntry.defects_ppm)).toEqual(45.8);
    expect(savedEntry.created_at).toBeInstanceOf(Date);
  });

  it('should handle edge case values correctly', async () => {
    const edgeCaseInput: CreateKpiDataInput = {
      week_date: new Date('2024-12-31'),
      efficiency: 0, // Minimum efficiency
      production_rate: 0.01, // Very low production rate
      defects_ppm: 999.99 // High defects rate
    };

    const result = await createKpiData(edgeCaseInput);

    expect(result.efficiency).toEqual(0);
    expect(result.production_rate).toEqual(0.01);
    expect(result.defects_ppm).toEqual(999.99);
    expect(result.week_date).toEqual(new Date('2024-12-31'));
  });

  it('should handle maximum boundary values', async () => {
    const maxInput: CreateKpiDataInput = {
      week_date: new Date('2024-06-15'),
      efficiency: 100, // Maximum efficiency
      production_rate: 9999.99, // High production rate
      defects_ppm: 10000.00 // Very high defects rate
    };

    const result = await createKpiData(maxInput);

    expect(result.efficiency).toEqual(100);
    expect(result.production_rate).toEqual(9999.99);
    expect(result.defects_ppm).toEqual(10000.00);
  });

  it('should query KPI data by date range correctly', async () => {
    // Create multiple test entries
    const earlyDate = new Date('2024-01-01');
    const midDate = new Date('2024-06-15');
    const lateDate = new Date('2024-12-31');

    await createKpiData({ ...testInput, week_date: earlyDate });
    await createKpiData({ ...testInput, week_date: midDate });
    await createKpiData({ ...testInput, week_date: lateDate });

    // Test date filtering
    const startDate = new Date('2024-06-01');
    const endDate = new Date('2024-12-31');

    // Apply date filter using proper drizzle syntax
    const filteredEntries = await db.select()
      .from(kpiDataTable)
      .where(
        and(
          gte(kpiDataTable.week_date, startDate),
          between(kpiDataTable.week_date, startDate, endDate)
        )
      )
      .execute();

    expect(filteredEntries.length).toEqual(2); // midDate and lateDate entries
    filteredEntries.forEach(entry => {
      expect(entry.week_date).toBeInstanceOf(Date);
      expect(entry.week_date >= startDate).toBe(true);
      expect(entry.week_date <= endDate).toBe(true);
    });
  });

  it('should preserve precision for decimal values', async () => {
    const precisionInput: CreateKpiDataInput = {
      week_date: new Date('2024-03-15'),
      efficiency: 87.67, // Two decimal places
      production_rate: 156.789, // Three decimal places (will be stored with precision)
      defects_ppm: 12.3456 // Four decimal places (will be stored with precision)
    };

    const result = await createKpiData(precisionInput);

    // Check that precision is maintained within database limits
    expect(result.efficiency).toBeCloseTo(87.67, 2);
    expect(result.production_rate).toBeCloseTo(156.79, 2); // Rounded to 2 decimal places by DB
    expect(result.defects_ppm).toBeCloseTo(12.35, 2); // Rounded to 2 decimal places by DB
  });
});