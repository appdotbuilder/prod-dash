import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { staffMembersTable } from '../db/schema';
import { type UpdateStaffMemberInput, type CreateStaffMemberInput } from '../schema';
import { updateStaffMember } from '../handlers/update_staff_member';
import { eq } from 'drizzle-orm';

// Test input for creating a staff member
const testStaffInput: CreateStaffMemberInput = {
  name: 'John Doe',
  position: 'Production Worker',
  department: 'Assembly',
  status: 'active'
};

describe('updateStaffMember', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update staff member name', async () => {
    // Create a staff member first
    const created = await db.insert(staffMembersTable)
      .values(testStaffInput)
      .returning()
      .execute();

    const staffId = created[0].id;

    const updateInput: UpdateStaffMemberInput = {
      id: staffId,
      name: 'Jane Smith'
    };

    const result = await updateStaffMember(updateInput);

    // Verify the update
    expect(result.id).toEqual(staffId);
    expect(result.name).toEqual('Jane Smith');
    expect(result.position).toEqual('Production Worker'); // Unchanged
    expect(result.department).toEqual('Assembly'); // Unchanged
    expect(result.status).toEqual('active'); // Unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > result.created_at).toBe(true);
  });

  it('should update staff member status', async () => {
    // Create a staff member first
    const created = await db.insert(staffMembersTable)
      .values(testStaffInput)
      .returning()
      .execute();

    const staffId = created[0].id;

    const updateInput: UpdateStaffMemberInput = {
      id: staffId,
      status: 'on_vacation'
    };

    const result = await updateStaffMember(updateInput);

    // Verify the update
    expect(result.id).toEqual(staffId);
    expect(result.name).toEqual('John Doe'); // Unchanged
    expect(result.status).toEqual('on_vacation'); // Changed
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update multiple fields at once', async () => {
    // Create a staff member first
    const created = await db.insert(staffMembersTable)
      .values(testStaffInput)
      .returning()
      .execute();

    const staffId = created[0].id;

    const updateInput: UpdateStaffMemberInput = {
      id: staffId,
      name: 'Alice Johnson',
      position: 'Senior Technician',
      department: 'Quality Control',
      status: 'on_vacation'
    };

    const result = await updateStaffMember(updateInput);

    // Verify all updates
    expect(result.id).toEqual(staffId);
    expect(result.name).toEqual('Alice Johnson');
    expect(result.position).toEqual('Senior Technician');
    expect(result.department).toEqual('Quality Control');
    expect(result.status).toEqual('on_vacation');
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > result.created_at).toBe(true);
  });

  it('should save updates to database', async () => {
    // Create a staff member first
    const created = await db.insert(staffMembersTable)
      .values(testStaffInput)
      .returning()
      .execute();

    const staffId = created[0].id;

    const updateInput: UpdateStaffMemberInput = {
      id: staffId,
      name: 'Bob Wilson',
      status: 'on_vacation'
    };

    await updateStaffMember(updateInput);

    // Verify in database
    const staffMembers = await db.select()
      .from(staffMembersTable)
      .where(eq(staffMembersTable.id, staffId))
      .execute();

    expect(staffMembers).toHaveLength(1);
    expect(staffMembers[0].name).toEqual('Bob Wilson');
    expect(staffMembers[0].status).toEqual('on_vacation');
    expect(staffMembers[0].position).toEqual('Production Worker'); // Unchanged
    expect(staffMembers[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error for non-existent staff member', async () => {
    const updateInput: UpdateStaffMemberInput = {
      id: 99999, // Non-existent ID
      name: 'Non-existent User'
    };

    await expect(updateStaffMember(updateInput)).rejects.toThrow(/not found/i);
  });

  it('should always update the updated_at timestamp', async () => {
    // Create a staff member first
    const created = await db.insert(staffMembersTable)
      .values(testStaffInput)
      .returning()
      .execute();

    const staffId = created[0].id;
    const originalUpdatedAt = created[0].updated_at;

    // Wait a bit to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const updateInput: UpdateStaffMemberInput = {
      id: staffId,
      name: 'Updated Name'
    };

    const result = await updateStaffMember(updateInput);

    // Verify timestamp was updated
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > originalUpdatedAt).toBe(true);
  });

  it('should handle partial updates correctly', async () => {
    // Create a staff member first
    const created = await db.insert(staffMembersTable)
      .values(testStaffInput)
      .returning()
      .execute();

    const staffId = created[0].id;

    // Update only position
    const updateInput: UpdateStaffMemberInput = {
      id: staffId,
      position: 'Team Lead'
    };

    const result = await updateStaffMember(updateInput);

    // Verify only position was changed
    expect(result.id).toEqual(staffId);
    expect(result.name).toEqual('John Doe'); // Unchanged
    expect(result.position).toEqual('Team Lead'); // Changed
    expect(result.department).toEqual('Assembly'); // Unchanged
    expect(result.status).toEqual('active'); // Unchanged
    expect(result.created_at).toEqual(created[0].created_at); // Unchanged
    expect(result.updated_at > created[0].updated_at).toBe(true); // Changed
  });
});