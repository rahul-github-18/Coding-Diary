"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import { userService } from '@/lib/api';

function UserManagementContent() {
  const [user, setUser] = useState(null);
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();

  useEffect(() => {
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    if (!isLoggedIn) {
      router.replace('/login');
    } else {
      try {
        const u = JSON.parse(localStorage.getItem('currentUser'));
        if (u.role !== 'admin') {
          router.replace('/'); // Redirect non-admins to home
        } else {
          setUser(u);
          fetchUsers();
        }
      } catch (e) {
        localStorage.clear();
        router.replace('/login');
      }
    }
  }, [router]);

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      console.time('API: Fetch Users (Admin Panel)');
      const allUsers = await userService.getUsers();
      console.timeEnd('API: Fetch Users (Admin Panel)');
      setUsersList(allUsers);
    } catch (err) {
      console.error(err);
      setError('Failed to retrieve users list.');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveUser = async (uId) => {
    setError('');
    setSuccess('');
    try {
      await userService.approveUser(uId);
      setSuccess('User enrollment approved!');
      fetchUsers();
    } catch (err) {
      setError(err.message || 'Failed to approve user.');
    }
  };

  const handleTogglePermission = async (uId, field, currentValue) => {
    setError('');
    setSuccess('');
    try {
      // Optimistic UI update
      setUsersList(prev => prev.map(usr => usr.id === uId ? { ...usr, [field]: !currentValue } : usr));
      
      const updateData = { [field]: !currentValue };
      await userService.updatePermissions(uId, updateData);
      setSuccess('User permissions updated successfully.');
    } catch (err) {
      // Revert state on error
      fetchUsers();
      setError(err.message || 'Failed to update permissions.');
    }
  };

  const handleRoleChange = async (uId, newRole) => {
    setError('');
    setSuccess('');
    try {
      // Optimistic UI update
      setUsersList(prev => prev.map(usr => usr.id === uId ? { ...usr, role: newRole } : usr));
      
      await userService.updatePermissions(uId, { role: newRole });
      setSuccess('User role updated.');
    } catch (err) {
      fetchUsers();
      setError(err.message || 'Failed to update role.');
    }
  };

  if (loading && !user) {
    return <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>Checking authorization...</div>;
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <button 
            className="btn btn-secondary" 
            style={{ marginBottom: '12px', padding: '6px 12px', fontSize: '0.85rem' }} 
            onClick={() => router.push('/')}
          >
            &larr; Back to Dashboard
          </button>
          <h2 style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-heading)', margin: 0 }}>
            User Control & Permission Center
          </h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: 0 }}>
            Approve pending enrollments, toggle capability permissions, and allocate roles.
          </p>
        </div>
      </div>

      {error && <div className="login-error">{error}</div>}
      {success && <div className="save-indicator" style={{ marginBottom: '12px' }}>{success}</div>}

      <div className="card" style={{ minHeight: 'auto', padding: '24px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>Loading users list...</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--card-border)', paddingBottom: '12px' }}>
                  <th style={{ padding: '12px 8px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Username</th>
                  <th style={{ padding: '12px 8px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Role</th>
                  <th style={{ padding: '12px 8px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Status</th>
                  <th style={{ padding: '12px 8px', color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center' }}>Can View</th>
                  <th style={{ padding: '12px 8px', color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center' }}>Can Edit</th>
                  <th style={{ padding: '12px 8px', color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center' }}>Can Delete</th>
                  <th style={{ padding: '12px 8px', color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {usersList.map((usr) => (
                  <tr key={usr.id} style={{ borderBottom: '1px solid var(--card-border)' }}>
                    <td style={{ padding: '12px 8px', fontWeight: '600', color: 'var(--text-heading)' }}>{usr.username}</td>
                    <td style={{ padding: '12px 8px' }}>
                      <select 
                        value={usr.role} 
                        onChange={(e) => handleRoleChange(usr.id, e.target.value)}
                        className="form-input" 
                        style={{ padding: '4px 8px', width: '90px', fontSize: '0.8rem' }}
                        disabled={usr.username === 'admin'}
                      >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td style={{ padding: '12px 8px' }}>
                      {usr.approved ? (
                        <span style={{ fontSize: '0.8rem', padding: '2px 8px', backgroundColor: '#e6f4ea', color: '#137333', borderRadius: '4px', fontWeight: '500' }}>
                          Approved
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.8rem', padding: '2px 8px', backgroundColor: '#fef7e0', color: '#b06000', borderRadius: '4px', fontWeight: '500' }}>
                          Pending Approval
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                      <input 
                        type="checkbox" 
                        checked={usr.can_view} 
                        onChange={() => handleTogglePermission(usr.id, 'can_view', usr.can_view)}
                        disabled={usr.username === 'admin'}
                      />
                    </td>
                    <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                      <input 
                        type="checkbox" 
                        checked={usr.can_edit} 
                        onChange={() => handleTogglePermission(usr.id, 'can_edit', usr.can_edit)}
                        disabled={usr.username === 'admin'}
                      />
                    </td>
                    <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                      <input 
                        type="checkbox" 
                        checked={usr.can_delete} 
                        onChange={() => handleTogglePermission(usr.id, 'can_delete', usr.can_delete)}
                        disabled={usr.username === 'admin'}
                      />
                    </td>
                    <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                      {!usr.approved && (
                        <button 
                          className="btn btn-success" 
                          style={{ padding: '4px 8px', fontSize: '0.75rem' }} 
                          onClick={() => handleApproveUser(usr.id)}
                        >
                          Approve Enrollment
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default function UserManagementPage() {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <Suspense fallback={<div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>}>
      <Layout searchQuery={searchQuery} setSearchQuery={setSearchQuery}>
        <UserManagementContent />
      </Layout>
    </Suspense>
  );
}
