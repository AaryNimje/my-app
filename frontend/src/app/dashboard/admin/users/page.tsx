// frontend/src/app/dashboard/admin/users/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { adminApi } from '@/lib/api';

interface RegistrationRequest {
  id: string;
  email: string;
  full_name: string;
  requested_role: string;
  requested_at: string;
}

const roleOptions = [
  { label: 'Student', value: 'student' },
  { label: 'Teacher', value: 'teacher' },
  { label: 'HR', value: 'hr' },
  { label: 'Staff', value: 'staff' },
  { label: 'Integrator', value: 'integrator' }
];

export default function UserManagementPage() {
  const [pendingRequests, setPendingRequests] = useState<RegistrationRequest[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<{[key: string]: string}>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPendingRequests();
  }, []);

  const fetchPendingRequests = async () => {
    try {
      const response = await adminApi.getPendingRegistrations();
      setPendingRequests(response.requests);
      
      // Initialize selected roles
      const roles: {[key: string]: string} = {};
      response.requests.forEach((req: RegistrationRequest) => {
        roles[req.id] = req.requested_role;
      });
      setSelectedRoles(roles);
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId: string) => {
    try {
      await adminApi.approveRegistration(requestId, selectedRoles[requestId]);
      // Remove from list
      setPendingRequests(pendingRequests.filter(req => req.id !== requestId));
    } catch (error) {
      console.error('Error approving request:', error);
    }
  };

  const handleReject = async (requestId: string) => {
    try {
      await adminApi.rejectRegistration(requestId, 'Admin rejected');
      // Remove from list
      setPendingRequests(pendingRequests.filter(req => req.id !== requestId));
    } catch (error) {
      console.error('Error rejecting request:', error);
    }
  };

  const handleRoleChange = (requestId: string, value: string) => {
    setSelectedRoles({...selectedRoles, [requestId]: value});
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">User Management</h1>

      <Card>
        <CardHeader>
          <CardTitle>Pending Registration Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {pendingRequests.length === 0 ? (
            <p className="text-gray-500">No pending requests</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Requested Role</TableHead>
                  <TableHead>Assign Role</TableHead>
                  <TableHead>Requested At</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>{request.full_name}</TableCell>
                    <TableCell>{request.email}</TableCell>
                    <TableCell>
                      <Badge>{request.requested_role}</Badge>
                    </TableCell>
                    <TableCell>
                      <Select
                        className="w-32"
                        options={roleOptions}
                        value={selectedRoles[request.id]}
                        onChange={(value) => handleRoleChange(request.id, value)}
                        placeholder="Select role"
                      />
                    </TableCell>
                    <TableCell>
                      {new Date(request.requested_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleApprove(request.id)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleReject(request.id)}
                        >
                          Reject
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}