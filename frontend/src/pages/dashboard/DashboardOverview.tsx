import { Calendar, Users, Zap, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function DashboardOverview() {
  const stats = [
    { title: 'Total Meetings', value: '12', icon: Calendar, description: '+2 from last week' },
    { title: 'Active AI Orchestrations', value: '8', icon: Zap, description: '3 pending user votes' },
    { title: 'Participants Managed', value: '45', icon: Users, description: 'Across all active events' },
    { title: 'Hours Saved', value: '14h', icon: Clock, description: 'Via autonomous scheduling' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard Overview</h2>
        <p className="text-muted-foreground mt-2">Welcome to your core AI Meeting hub. Here is what is happening.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground flex items-center justify-center h-48 border rounded-md bg-muted/20">
              Activity timeline will populate here as users vote on suggested times.
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>AI Actions Pending</CardTitle>
          </CardHeader>
          <CardContent>
             <div className="text-sm text-muted-foreground flex items-center justify-center h-48 border rounded-md bg-muted/20">
              No manual interventions required. Exora is operating autonomously.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
