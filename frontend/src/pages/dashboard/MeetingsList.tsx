import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar as CalendarIcon, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { apiClient } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface Meeting {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  status: string;
  participants: any[];
}

export default function MeetingsList() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMeetings = async () => {
      try {
        const res = await apiClient.get('/meetings');
        setMeetings(res.data.data);
      } catch (err) {
         console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchMeetings();
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Meetings</h2>
          <p className="text-muted-foreground mt-2">Manage your scheduled events and AI orchestrations.</p>
        </div>
        <Button asChild>
          <Link to="/dashboard/meetings/new">
            <Plus className="mr-2 h-4 w-4" />
            Create Meeting
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Meetings</CardTitle>
          <CardDescription>A complete directory of all events.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center p-8 text-muted-foreground">Loading meetings...</div>
          ) : meetings.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center bg-muted/20 rounded-md border border-dashed">
              <CalendarIcon className="h-10 w-10 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">No meetings found</h3>
              <p className="text-sm text-muted-foreground">You haven't constructed any events yet.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {meetings.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{m.title}</TableCell>
                    <TableCell>{format(new Date(m.startTime), 'PPP p')}</TableCell>
                    <TableCell>
                      <Badge variant={m.status === 'CONFIRMED' ? 'default' : 'secondary'}>{m.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link to={`/dashboard/meetings/${m.id}`}>View</Link>
                      </Button>
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
