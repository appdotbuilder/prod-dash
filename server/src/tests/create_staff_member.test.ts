import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { staffMembersTable } from '../db/schema';
import { type CreateStaffMemberInput } from '../schema';
import { createStaffMember } from '../handlers/create_staff_member';
import { eq, and, gte } from 'drizzle-orm';

// Test inputs for different staff member scenarios
const testInput: CreateStaffMemberInput = {
  name: 'John Doe',
  position: 'Production Manager',
  department: 'Manufacturing',
  status: 'active'
};

const vacationStaffInput: CreateStaffMemberInput = {
  name: 'Jane Smith',
  position: 'Quality Inspector',
  department: 'Quality Control',
  status: 'on_vacation'
};

describe('createStaffMember', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create an active staff member', async () => {
    const result = await createStaffMember(testInput);

    // Basic field validation
    expect(result.name).toEqual('John Doe');
    expect(result.position).toEqual('Production Manager');
    expect(result.department).toEqual('Manufacturing');
    expect(result.status).toEqual('active');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a staff member on vacation', async () => {
    const result = await createStaffMember(vacationStaffInput);

    // Verify vacation status is handled correctly
    expect(result.name).toEqual('Jane Smith');
    expect(result.position).toEqual('Quality Inspector');
    expect(result.department).toEqual('Quality Control');
    expect(result.status).toEqual('on_vacation');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save staff member to database', async () => {
    const result = await createStaffMember(testInput);

    // Query using proper drizzle syntax
    const staffMembers = await db.select()
      .from(staffMembersTable)
      .where(eq(staffMembersTable.id, result.id))
      .execute();

    expect(staffMembers).toHaveLength(1);
    expect(staffMembers[0].name).toEqual('John Doe');
    expect(staffMembers[0].position).toEqual('Production Manager');
    expect(staffMembers[0].department).toEqual('Manufacturing');
    expect(staffMembers[0].status).toEqual('active');
    expect(staffMembers[0].created_at).toBeInstanceOf(Date);
    expect(staffMembers[0].updated_at).toBeInstanceOf(Date);
  });

  it('should handle multiple staff members in same department', async () => {
    // Create multiple staff members in same department
    const firstMember = await createStaffMember(testInput);
    const secondMember = await createStaffMember({
      name: 'Bob Wilson',
      position: 'Line Supervisor',
      department: 'Manufacturing',
      status: 'active'
    });

    // Verify both were created with unique IDs
    expect(firstMember.id).not.toEqual(secondMember.id);
    expect(firstMember.department).toEqual(secondMember.department);

    // Query department staff members
    const manufacturingStaff = await db.select()
      .from(staffMembersTable)
      .where(eq(staffMembersTable.department, 'Manufacturing'))
      .execute();

    expect(manufacturingStaff).toHaveLength(2);
    expect(manufacturingStaff.some(s => s.name === 'John Doe')).toBe(true);
    expect(manufacturingStaff.some(s => s.name === 'Bob Wilson')).toBe(true);
  });

  it('should query staff members by status correctly', async () => {
    // Create staff members with different statuses
    await createStaffMember(testInput); // active
    await createStaffMember(vacationStaffInput); // on_vacation

    // Query active staff only
    const activeStaff = await db.select()
      .from(staffMembersTable)
      .where(eq(staffMembersTable.status, 'active'))
      .execute();

    expect(activeStaff).toHaveLength(1);
    expect(activeStaff[0].name).toEqual('John Doe');
    expect(activeStaff[0].status).toEqual('active');

    // Query vacation staff only
    const vacationStaff = await db.select()
      .from(staffMembersTable)
      .where(eq(staffMembersTable.status, 'on_vacation'))
      .execute();

    expect(vacationStaff).toHaveLength(1);
    expect(vacationStaff[0].name).toEqual('Jane Smith');
    expect(vacationStaff[0].status).toEqual('on_vacation');
  });

  it('should query staff members by date range correctly', async () => {
    // Create test staff member
    await createStaffMember(testInput);

    // Test date filtering - demonstration of correct date handling
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Query staff created today or after
    const recentStaff = await db.select()
      .from(staffMembersTable)
      .where(gte(staffMembersTable.created_at, yesterday))
      .execute();

    expect(recentStaff.length).toBeGreaterThan(0);
    recentStaff.forEach(member => {
      expect(member.created_at).toBeInstanceOf(Date);
      expect(member.created_at >= yesterday).toBe(true);
    });
  });

  it('should query with complex filters correctly', async () => {
    // Create multiple staff members
    await createStaffMember(testInput);
    await createStaffMember(vacationStaffInput);
    await createStaffMember({
      name: 'Alice Johnson',
      position: 'Production Worker',
      department: 'Manufacturing',
      status: 'on_vacation'
    });

    // Query Manufacturing department staff on vacation
    const conditions = [
      eq(staffMembersTable.department, 'Manufacturing'),
      eq(staffMembersTable.status, 'on_vacation')
    ];

    const manufacturingVacationStaff = await db.select()
      .from(staffMembersTable)
      .where(and(...conditions))
      .execute();

    expect(manufacturingVacationStaff).toHaveLength(1);
    expect(manufacturingVacationStaff[0].name).toEqual('Alice Johnson');
    expect(manufacturingVacationStaff[0].department).toEqual('Manufacturing');
    expect(manufacturingVacationStaff[0].status).toEqual('on_vacation');
  });
});