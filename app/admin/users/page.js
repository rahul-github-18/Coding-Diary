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

  const handleDisapproveUser = async (uId) => {
    setError('');
    setSuccess('');
    try {
      await userService.disapproveUser(uId);
      setSuccess('User approval revoked.');
      fetchUsers();
    } catch (err) {
      setError(err.message || 'Failed to revoke user approval.');
    }
  };

  const handleDeleteUser = async (uId) => {
    if (!window.confirm("Are you sure you want to delete this user?")) {
      return;
    }
    setError('');
    setSuccess('');
    try {
      await userService.deleteUser(uId);
      setSuccess('User deleted successfully.');
      fetchUsers();
    } catch (err) {
      setError(err.message || 'Failed to delete user.');
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
            Role Permissions Configurator
          </h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: 0 }}>
            Configure client permissions, manage approvals, and allocate roles.
          </p>
        </div>
      </div>

      {error && <div className="login-error">{error}</div>}
      {success && <div className="save-indicator" style={{ marginBottom: '12px' }}>{success}</div>}

      <div className="card" style={{ minHeight: 'auto', padding: 0, overflow: 'hidden', border: '1px solid var(--card-border)' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>Loading users list...</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
              <thead>
                <tr style={{ backgroundColor: '#1a73e8', color: '#ffffff' }}>
                  <th style={{ padding: '14px 16px', color: '#ffffff', fontSize: '0.85rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Username</th>
                  <th style={{ padding: '14px 16px', color: '#ffffff', fontSize: '0.85rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Role</th>
                  <th style={{ padding: '14px 16px', color: '#ffffff', fontSize: '0.85rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</th>
                  <th style={{ padding: '14px 16px', color: '#ffffff', fontSize: '0.85rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center' }}>Can View</th>
                  <th style={{ padding: '14px 16px', color: '#ffffff', fontSize: '0.85rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center' }}>Can Edit</th>
                  <th style={{ padding: '14px 16px', color: '#ffffff', fontSize: '0.85rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center' }}>Can Delete</th>
                  <th style={{ padding: '14px 16px', color: '#ffffff', fontSize: '0.85rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {usersList.map((usr) => (
                  <tr key={usr.id} style={{ borderBottom: '1px solid var(--card-border)', transition: 'background-color 0.15s ease' }}>
                    <td style={{ padding: '14px 16px', fontWeight: '600', color: 'var(--text-heading)' }}>{usr.username}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <select 
                        value={usr.role} 
                        onChange={(e) => handleRoleChange(usr.id, e.target.value)}
                        className="form-input" 
                        style={{ padding: '6px 10px', width: '100px', fontSize: '0.8rem', margin: 0 }}
                        disabled={usr.username === 'admin'}
                      >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      {usr.approved ? (
                        <span style={{ fontSize: '0.72rem', padding: '4px 10px', backgroundColor: '#e6f4ea', color: '#137333', borderRadius: '4px', fontWeight: '700', textTransform: 'uppercase' }}>
                          Approved
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.72rem', padding: '4px 10px', backgroundColor: '#fef7e0', color: '#b06000', borderRadius: '4px', fontWeight: '700', textTransform: 'uppercase' }}>
                          Pending
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      <input 
                        type="checkbox" 
                        checked={usr.can_view} 
                        onChange={() => handleTogglePermission(usr.id, 'can_view', usr.can_view)}
                        disabled={usr.username === 'admin'}
                        style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                      />
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      <input 
                        type="checkbox" 
                        checked={usr.can_edit} 
                        onChange={() => handleTogglePermission(usr.id, 'can_edit', usr.can_edit)}
                        disabled={usr.username === 'admin'}
                        style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                      />
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      <input 
                        type="checkbox" 
                        checked={usr.can_delete} 
                        onChange={() => handleTogglePermission(usr.id, 'can_delete', usr.can_delete)}
                        disabled={usr.username === 'admin'}
                        style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                      />
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                        {usr.username !== 'admin' && (
                          <>
                            {usr.approved ? (
                              <button 
                                className="btn btn-secondary" 
                                style={{ padding: '5px 10px', fontSize: '0.75rem', fontWeight: '600', backgroundColor: '#fde8e8', color: '#d93025', border: '1px solid #f8b4b4' }} 
                                onClick={() => handleDisapproveUser(usr.id)}
                              >
                                Revoke Approval
                              </button>
                            ) : (
                              <button 
                                className="btn btn-success" 
                                style={{ padding: '5px 10px', fontSize: '0.75rem', fontWeight: '600' }} 
                                onClick={() => handleApproveUser(usr.id)}
                              >
                                Approve
                              </button>
                            )}
                            <button 
                              className="btn btn-danger" 
                              style={{ padding: '5px 10px', fontSize: '0.75rem', fontWeight: '600' }} 
                              onClick={() => handleDeleteUser(usr.id)}
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
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
