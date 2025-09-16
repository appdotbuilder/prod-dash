import { db } from '../db';
import { staffMembersTable } from '../db/schema';
import { type StaffMember } from '../schema';
import { asc } from 'drizzle-orm';

export const getStaffMembers = async (): Promise<StaffMember[]> => {
  try {
    // Fetch all staff members ordered by name for consistent display
    const results = await db.select()
      .from(staffMembersTable)
      .orderBy(asc(staffMembersTable.name))
      .execute();

    // Return the results - no numeric conversions needed for this table
    return results;
  } catch (error) {
    console.error('Failed to get staff members:', error);
    throw error;
  }
};