import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { staffMembersTable } from '../db/schema';
import { type CreateStaffMemberInput } from '../schema';
import { deleteStaffMember } from '../handlers/delete_staff_member';
import { eq } from 'drizzle-orm';

// Test staff member data
const testStaffMember: CreateStaffMemberInput = {
  name: 'John Doe',
  position: 'Production Manager',
  department: 'Manufacturing',
  status: 'active'
};

const anotherStaffMember: CreateStaffMemberInput = {
  name: 'Jane Smith',
  position: 'Quality Inspector',
  department: 'Quality Control',
  status: 'on_vacation'
};

describe('deleteStaffMember', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete an existing staff member', async () => {
    // Create a staff member first
    const insertResult = await db.insert(staffMembersTable)
      .values(testStaffMember)
      .returning()
      .execute();

    const createdStaffMember = insertResult[0];
    expect(createdStaffMember.id).toBeDefined();

    // Delete the staff member
    const result = await deleteStaffMember(createdStaffMember.id);
    expect(result.success).toBe(true);

    // Verify the staff member was deleted from database
    const staffMembers = await db.select()
      .from(staffMembersTable)
      .where(eq(staffMembersTable.id, createdStaffMember.id))
      .execute();

    expect(staffMembers).toHaveLength(0);
  });

  it('should throw error when staff member does not exist', async () => {
    const nonExistentId = 99999;

    expect(deleteStaffMember(nonExistentId)).rejects.toThrow(/staff member with id 99999 not found/i);
  });

  it('should only delete the specified staff member', async () => {
    // Create multiple staff members
    const insertResult1 = await db.insert(staffMembersTable)
      .values(testStaffMember)
      .returning()
      .execute();

    const insertResult2 = await db.insert(staffMembersTable)
      .values(anotherStaffMember)
      .returning()
      .execute();

    const staffMember1 = insertResult1[0];
    const staffMember2 = insertResult2[0];

    // Delete only the first staff member
    const result = await deleteStaffMember(staffMember1.id);
    expect(result.success).toBe(true);

    // Verify first staff member was deleted
    const deletedStaffMember = await db.select()
      .from(staffMembersTable)
      .where(eq(staffMembersTable.id, staffMember1.id))
      .execute();

    expect(deletedStaffMember).toHaveLength(0);

    // Verify second staff member still exists
    const remainingStaffMember = await db.select()
      .from(staffMembersTable)
      .where(eq(staffMembersTable.id, staffMember2.id))
      .execute();

    expect(remainingStaffMember).toHaveLength(1);
    expect(remainingStaffMember[0].name).toEqual('Jane Smith');
    expect(remainingStaffMember[0].position).toEqual('Quality Inspector');
  });

  it('should handle deletion with different staff statuses', async () => {
    // Create staff members with different statuses
    const activeStaff = { ...testStaffMember, status: 'active' as const };
    const vacationStaff = { ...anotherStaffMember, status: 'on_vacation' as const };

    const activeResult = await db.insert(staffMembersTable)
      .values(activeStaff)
      .returning()
      .execute();

    const vacationResult = await db.insert(staffMembersTable)
      .values(vacationStaff)
      .returning()
      .execute();

    // Delete staff member with 'on_vacation' status
    const deleteResult = await deleteStaffMember(vacationResult[0].id);
    expect(deleteResult.success).toBe(true);

    // Verify vacation staff was deleted
    const vacationStaffCheck = await db.select()
      .from(staffMembersTable)
      .where(eq(staffMembersTable.id, vacationResult[0].id))
      .execute();

    expect(vacationStaffCheck).toHaveLength(0);

    // Verify active staff still exists
    const activeStaffCheck = await db.select()
      .from(staffMembersTable)
      .where(eq(staffMembersTable.id, activeResult[0].id))
      .execute();

    expect(activeStaffCheck).toHaveLength(1);
    expect(activeStaffCheck[0].status).toEqual('active');
  });

  it('should verify database state after successful deletion', async () => {
    // Create staff member
    const insertResult = await db.insert(staffMembersTable)
      .values(testStaffMember)
      .returning()
      .execute();

    const staffMember = insertResult[0];

    // Get initial count
    const initialCount = await db.select()
      .from(staffMembersTable)
      .execute();

    expect(initialCount).toHaveLength(1);

    // Delete staff member
    const result = await deleteStaffMember(staffMember.id);
    expect(result.success).toBe(true);

    // Verify total count decreased
    const finalCount = await db.select()
      .from(staffMembersTable)
      .execute();

    expect(finalCount).toHaveLength(0);
  });
});