import { db } from '../db';
import { staffMembersTable } from '../db/schema';
import { eq } from 'drizzle-orm';

export const deleteStaffMember = async (id: number): Promise<{ success: boolean }> => {
  try {
    // First check if the staff member exists
    const existingStaffMember = await db.select()
      .from(staffMembersTable)
      .where(eq(staffMembersTable.id, id))
      .execute();

    if (existingStaffMember.length === 0) {
      throw new Error(`Staff member with id ${id} not found`);
    }

    // Delete the staff member
    const result = await db.delete(staffMembersTable)
      .where(eq(staffMembersTable.id, id))
      .execute();

    return { success: true };
  } catch (error) {
    console.error('Staff member deletion failed:', error);
    throw error;
  }
};