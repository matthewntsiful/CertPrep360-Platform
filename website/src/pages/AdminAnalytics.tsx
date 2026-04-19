import React, { useEffect, useState } from 'react';
import { 
  Card, 
  AreaChart, 
  BarChart, 
  Title, 
  Text, 
  Flex, 
  Badge,
  Grid
} from '@tremor/react';
import { adminService } from '../services/adminService';
import { Loader2, TrendingUp, Target, Users } from 'lucide-react';

const AdminAnalytics: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const stats = await adminService.getStats();
        setData(stats);
      } catch (err) {
        console.error("Failed to load analytics:", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 animate-pulse">Synchronizing Intelligence...</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-20">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <Badge color="orange">Platform Intel</Badge>
          <span className="text-slate-600">/</span>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Growth & Performance</span>
        </div>
        <h1 className="text-4xl font-black tracking-tighter text-white">Advanced Analytics</h1>
      </div>

      <Grid numItemsMd={2} numItemsLg={3} className="gap-6">
        {data?.overview?.map((kpi: any) => (
          <Card key={kpi.label} decoration="top" decorationColor={kpi.type === 'health' ? 'emerald' : kpi.type === 'users' ? 'blue' : 'orange'} className="bg-slate-900/50 border-slate-800 rounded-[2rem] p-8">
            <Flex alignItems="start">
              <div className="space-y-2">
                <Text className="text-slate-500 uppercase font-black text-[10px] tracking-widest">{kpi.label}</Text>
                <Title className="text-4xl font-black text-white">{kpi.value}</Title>
              </div>
              {kpi.type === 'users' && <Users className="w-6 h-6 text-blue-500" />}
              {kpi.type === 'content' && <TrendingUp className="w-6 h-6 text-orange-500" />}
              {kpi.type === 'health' && <Target className="w-6 h-6 text-emerald-500" />}
            </Flex>
            <Flex className="mt-4 pt-4 border-t border-slate-800">
              <Text className="text-xs text-slate-400">Live Status</Text>
              <Badge color={kpi.trend === 'Live' ? 'emerald' : 'blue'}>{kpi.trend}</Badge>
            </Flex>
          </Card>
        ))}
      </Grid>

      {/* Main Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
        <Card className="bg-slate-900/40 border-slate-800 rounded-[3rem] p-10">
          <div className="mb-10">
            <Title className="text-2xl font-black text-white tracking-tight">Active Growth Curve</Title>
            <Text className="text-slate-500 text-xs mt-1 uppercase tracking-widest font-bold">Total Operatives Enrolled</Text>
          </div>
          <AreaChart
            className="h-80 mt-4"
            data={data?.details?.growth || []}
            index="month"
            categories={["users"]}
            colors={["orange"]}
            showLegend={false}
            showGridLines={false}
            curveType="natural"
          />
        </Card>

        <Card className="bg-slate-900/40 border-slate-800 rounded-[3rem] p-10">
          <div className="mb-10">
            <Title className="text-2xl font-black text-white tracking-tight">Mission Performance</Title>
            <Text className="text-slate-500 text-xs mt-1 uppercase tracking-widest font-bold">Pass / Fail distribution by Exam</Text>
          </div>
          <BarChart
            className="h-80 mt-4 text-xs font-mono"
            data={data?.details?.performance || []}
            index="name"
            categories={["pass", "fail"]}
            colors={["emerald", "rose"]}
            stack
            showGridLines={false}
          />
        </Card>
      </div>

      {/* Platform Health Logic */}
      <Card className="bg-slate-950 border-slate-800 rounded-[2.5rem] p-10 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="w-4 h-4 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
          <div>
            <Title className="text-white text-lg font-black tracking-tight">Intelligence Stream: Online</Title>
            <Text className="text-slate-500 text-xs font-bold uppercase tracking-widest">Real-time telemetry synced with DynamoDB and Cognito User Streams</Text>
          </div>
        </div>
        <button className="px-6 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-800 hover:bg-slate-800 transition-all">
          View Health Audit
        </button>
      </Card>
    </div>
  );
};

export default AdminAnalytics;
