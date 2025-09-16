import { db } from '../db';
import { staffMembersTable } from '../db/schema';
import { type UpdateStaffMemberInput, type StaffMember } from '../schema';
import { eq } from 'drizzle-orm';

export const updateStaffMember = async (input: UpdateStaffMemberInput): Promise<StaffMember> => {
  try {
    // Build the update object with only provided fields
    const updateData: any = {
      updated_at: new Date() // Always update the timestamp
    };

    // Add only the fields that are provided in the input
    if (input.name !== undefined) {
      updateData['name'] = input.name;
    }
    if (input.position !== undefined) {
      updateData['position'] = input.position;
    }
    if (input.department !== undefined) {
      updateData['department'] = input.department;
    }
    if (input.status !== undefined) {
      updateData['status'] = input.status;
    }

    // Update the staff member record
    const result = await db.update(staffMembersTable)
      .set(updateData)
      .where(eq(staffMembersTable.id, input.id))
      .returning()
      .execute();

    // Check if the staff member was found and updated
    if (result.length === 0) {
      throw new Error(`Staff member with id ${input.id} not found`);
    }

    return result[0];
  } catch (error) {
    console.error('Staff member update failed:', error);
    throw error;
  }
};