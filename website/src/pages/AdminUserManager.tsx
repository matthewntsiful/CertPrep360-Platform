import React, { useEffect, useState } from 'react';
import { 
  Card, 
  Table, 
  TableHead, 
  TableRow, 
  TableHeaderCell, 
  TableBody, 
  TableCell, 
  Text, 
  Title, 
  Badge,
  Button
} from '@tremor/react';
import { adminService } from '../services/adminService';
import { Loader2, UserPlus, Shield, Mail } from 'lucide-react';

const AdminUserManager: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const data = await adminService.listUsers();
        setUsers(data);
      } catch (err) {
        console.error("Failed to load users:", err);
      } finally {
        setLoading(false);
      }
    };
    loadUsers();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 animate-pulse">Syncing Identity Grids...</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Badge color="blue">Identity Hub</Badge>
            <span className="text-slate-600">/</span>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">User Lifecycle</span>
          </div>
          <h1 className="text-4xl font-black tracking-tighter text-white">Security Directory</h1>
        </div>
        <Button 
          icon={UserPlus} 
          variant="primary" 
          className="bg-orange-500 border-none rounded-xl hover:bg-orange-600 text-slate-950 font-black uppercase text-[10px] tracking-widest px-6"
        >
          Invite Operative
        </Button>
      </div>

      <Card className="bg-slate-900/40 border-slate-800 rounded-[3rem] p-4 text-slate-50">
        <Table className="mt-5">
          <TableHead>
            <TableRow>
              <TableHeaderCell className="text-[10px] font-black uppercase tracking-widest text-slate-500">Operative Email</TableHeaderCell>
              <TableHeaderCell className="text-[10px] font-black uppercase tracking-widest text-slate-500">Security Group</TableHeaderCell>
              <TableHeaderCell className="text-[10px] font-black uppercase tracking-widest text-slate-500">Status</TableHeaderCell>
              <TableHeaderCell className="text-[10px] font-black uppercase tracking-widest text-slate-500">Enrolled</TableHeaderCell>
              <TableHeaderCell className="text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">Actions</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((item) => (
              <TableRow key={item.id} className="hover:bg-slate-800/50 transition-all cursor-pointer group">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <Text className="text-sm font-bold text-white font-mono">{item.email}</Text>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Shield className="w-3 h-3 text-slate-500" />
                    <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Operative
                    </Text>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge color={item.status === 'CONFIRMED' ? 'emerald' : 'orange'} size="xs">
                    {item.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Text className="text-xs font-medium text-slate-500">
                    {new Date(item.joined).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </Text>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                    <button className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors">
                      <Shield className="w-4 h-4" />
                    </button>
                    <button className="p-2 hover:bg-red-500/20 rounded-lg text-slate-500 hover:text-red-500 transition-colors">
                      <Shield className="w-4 h-4 rotate-180" />
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      
      {/* Search Bar / Filter Area */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-8 bg-slate-900 border border-slate-800 rounded-3xl flex flex-col justify-center items-center text-center space-y-4">
          <Shield className="w-8 h-8 text-orange-500" />
          <Title className="text-white text-lg font-black tracking-tight">Access Control</Title>
          <Text className="text-slate-500 text-xs">Manage administrative elevations and security groups.</Text>
        </div>
        <div className="p-8 bg-slate-900 border border-slate-800 rounded-3xl flex flex-col justify-center items-center text-center space-y-4">
          <Mail className="w-8 h-8 text-blue-500" />
          <Title className="text-white text-lg font-black tracking-tight">Verification Logs</Title>
          <Text className="text-slate-500 text-xs">Monitor user email verification and MFA enrollment status.</Text>
        </div>
        <div className="p-8 bg-slate-900 border border-slate-800 rounded-3xl flex flex-col justify-center items-center text-center space-y-4">
          <UserPlus className="w-8 h-8 text-emerald-500" />
          <Title className="text-white text-lg font-black tracking-tight">Active Funnel</Title>
          <Text className="text-slate-500 text-xs text-black">Track conversion from landing pages to active operatives.</Text>
        </div>
      </div>
    </div>
  );
};

export default AdminUserManager;
