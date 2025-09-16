import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { staffMembersTable } from '../db/schema';
import { type CreateStaffMemberInput } from '../schema';
import { getStaffMembers } from '../handlers/get_staff_members';

// Test data for creating staff members
const testStaffMembers: CreateStaffMemberInput[] = [
  {
    name: 'Charlie Wilson',
    position: 'Production Manager',
    department: 'Manufacturing',
    status: 'active'
  },
  {
    name: 'Alice Johnson',
    position: 'Quality Inspector',
    department: 'Quality Control',
    status: 'active'
  },
  {
    name: 'Bob Smith',
    position: 'Machine Operator',
    department: 'Manufacturing',
    status: 'on_vacation'
  }
];

describe('getStaffMembers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no staff members exist', async () => {
    const result = await getStaffMembers();
    
    expect(result).toEqual([]);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should return all staff members', async () => {
    // Create test staff members
    await db.insert(staffMembersTable)
      .values(testStaffMembers)
      .execute();

    const result = await getStaffMembers();

    expect(result).toHaveLength(3);
    
    // Verify all expected fields are present
    result.forEach(staffMember => {
      expect(staffMember.id).toBeDefined();
      expect(staffMember.name).toBeDefined();
      expect(staffMember.position).toBeDefined();
      expect(staffMember.department).toBeDefined();
      expect(staffMember.status).toBeDefined();
      expect(staffMember.created_at).toBeInstanceOf(Date);
      expect(staffMember.updated_at).toBeInstanceOf(Date);
    });
  });

  it('should return staff members ordered by name', async () => {
    // Create test staff members
    await db.insert(staffMembersTable)
      .values(testStaffMembers)
      .execute();

    const result = await getStaffMembers();

    expect(result).toHaveLength(3);
    
    // Verify ordering by name (alphabetical)
    expect(result[0].name).toEqual('Alice Johnson');
    expect(result[1].name).toEqual('Bob Smith');
    expect(result[2].name).toEqual('Charlie Wilson');
  });

  it('should include both active and on_vacation staff members', async () => {
    // Create test staff members with different statuses
    await db.insert(staffMembersTable)
      .values(testStaffMembers)
      .execute();

    const result = await getStaffMembers();

    expect(result).toHaveLength(3);
    
    const statuses = result.map(member => member.status);
    expect(statuses).toContain('active');
    expect(statuses).toContain('on_vacation');
    
    // Verify specific staff members and their statuses
    const alice = result.find(member => member.name === 'Alice Johnson');
    const bob = result.find(member => member.name === 'Bob Smith');
    
    expect(alice?.status).toEqual('active');
    expect(bob?.status).toEqual('on_vacation');
  });

  it('should return staff members with correct field types', async () => {
    // Create a single test staff member
    await db.insert(staffMembersTable)
      .values([testStaffMembers[0]])
      .execute();

    const result = await getStaffMembers();

    expect(result).toHaveLength(1);
    
    const staffMember = result[0];
    
    // Verify field types
    expect(typeof staffMember.id).toBe('number');
    expect(typeof staffMember.name).toBe('string');
    expect(typeof staffMember.position).toBe('string');
    expect(typeof staffMember.department).toBe('string');
    expect(typeof staffMember.status).toBe('string');
    expect(staffMember.created_at).toBeInstanceOf(Date);
    expect(staffMember.updated_at).toBeInstanceOf(Date);
    
    // Verify status enum values
    expect(['active', 'on_vacation']).toContain(staffMember.status);
  });

  it('should handle large number of staff members correctly', async () => {
    // Create multiple staff members to test ordering
    const manyStaffMembers: CreateStaffMemberInput[] = [
      { name: 'Zoe Adams', position: 'Supervisor', department: 'Production', status: 'active' },
      { name: 'Aaron Baker', position: 'Technician', department: 'Maintenance', status: 'active' },
      { name: 'Mike Chen', position: 'Operator', department: 'Assembly', status: 'on_vacation' },
      { name: 'Dana Evans', position: 'Inspector', department: 'Quality', status: 'active' }
    ];

    await db.insert(staffMembersTable)
      .values(manyStaffMembers)
      .execute();

    const result = await getStaffMembers();

    expect(result).toHaveLength(4);
    
    // Verify alphabetical ordering
    const names = result.map(member => member.name);
    expect(names).toEqual(['Aaron Baker', 'Dana Evans', 'Mike Chen', 'Zoe Adams']);
  });
});