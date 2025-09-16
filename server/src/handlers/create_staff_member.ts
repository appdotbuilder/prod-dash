import { db } from '../db';
import { staffMembersTable } from '../db/schema';
import { type CreateStaffMemberInput, type StaffMember } from '../schema';

export const createStaffMember = async (input: CreateStaffMemberInput): Promise<StaffMember> => {
  try {
    // Insert staff member record
    const result = await db.insert(staffMembersTable)
      .values({
        name: input.name,
        position: input.position,
        department: input.department,
        status: input.status
      })
      .returning()
      .execute();

    // Return the created staff member
    return result[0];
  } catch (error) {
    console.error('Staff member creation failed:', error);
    throw error;
  }
};