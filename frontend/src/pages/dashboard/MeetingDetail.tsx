import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ArrowLeft, Clock, Users, Zap, Phone, Loader2 } from 'lucide-react';
import { apiClient } from '@/api/client';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import AISuggestTimes from '@/components/ai/AISuggestTimes';
import AIDraftEmail from '@/components/ai/AIDraftEmail';
import AISummary from '@/components/ai/AISummary';
import AIAssistantPanel from '@/components/ai/AIAssistantPanel';

interface Participant {
  userId: string;
  status: string;
  user: { id: string; name: string; email: string };
}

interface Meeting {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  status: string;
  organizerId: string;
  participants: Participant[];
}

interface ScriptTurn {
  speaker: string;
  line: string;
}

export default function MeetingDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [callingParticipant, setCallingParticipant] = useState<string | null>(null);
  const [simulationScript, setSimulationScript] = useState<ScriptTurn[]>([]);

  const isAdmin = user?.role === 'ADMIN';

  const fetchMeeting = async () => {
    try {
      const res = await apiClient.get(`/meetings/${id}`);
      setMeeting(res.data.data);
    } catch (err: any) {
      toast({ title: 'Error', description: err.response?.data?.message || 'Failed to load meeting.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMeeting(); }, [id]);

  const handleRespond = async (status: 'ACCEPTED' | 'REJECTED') => {
    try {
      await apiClient.put(`/meetings/${id}/respond`, { status });
      toast({ title: 'Response Recorded', description: `You have ${status.toLowerCase()} the invitation.` });
      fetchMeeting();
    } catch (err: any) {
      toast({ title: 'Error', description: err.response?.data?.message || 'Failed to respond.', variant: 'destructive' });
    }
  };

  const handleSimulateCall = async (participant: Participant) => {
    setCallingParticipant(participant.userId);
    setSimulationScript([]);
    try {
      const res = await apiClient.post('/ai/simulate-call', {
        meetingId: meeting!.id,
        participantName: participant.user.name || participant.user.email,
        participantEmail: participant.user.email,
      });
      setSimulationScript(res.data?.data?.script || []);
    } catch (err: any) {
      toast({
        title: 'Simulation Failed',
        description: err.response?.data?.message || 'Could not generate call script.',
        variant: 'destructive',
      });
    } finally {
      setCallingParticipant(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!meeting) {
    return <div className="text-center text-muted-foreground py-12">Meeting not found.</div>;
  }

  const myParticipation = meeting.participants.find(p => p.userId === user?.id);

  return (
    <div className="flex gap-6">
      {/* Main content */}
      <div className="flex-1 space-y-6 min-w-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/dashboard/meetings"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">{meeting.title}</h2>
            <p className="text-muted-foreground">{meeting.description || 'No description provided.'}</p>
          </div>
          <Badge className="ml-auto" variant={meeting.status === 'CONFIRMED' ? 'default' : 'secondary'}>{meeting.status}</Badge>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Meeting Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Clock className="h-4 w-4" /> Schedule</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Start</span>
                <span className="font-medium">{format(new Date(meeting.startTime), 'PPP p')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">End</span>
                <span className="font-medium">{format(new Date(meeting.endTime), 'PPP p')}</span>
              </div>
            </CardContent>
          </Card>

          {/* Participants */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Users className="h-4 w-4" /> Participants</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                    {isAdmin && <TableHead className="text-right">Call</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {meeting.participants.map(p => (
                    <TableRow key={p.userId}>
                      <TableCell>{p.user.name || p.user.email}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={p.status === 'ACCEPTED' ? 'default' : p.status === 'REJECTED' ? 'destructive' : 'secondary'}>
                          {p.status}
                        </Badge>
                      </TableCell>
                      {isAdmin && (
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-amber-500 hover:text-amber-400 hover:bg-amber-500/10"
                            onClick={() => handleSimulateCall(p)}
                            disabled={!!callingParticipant}
                            title={`Simulate call to ${p.user.name || p.user.email}`}
                          >
                            {callingParticipant === p.userId ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Phone className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* User Response Actions */}
        {myParticipation && myParticipation.status === 'PENDING' && (
          <Card>
            <CardHeader>
              <CardTitle>Your Invitation</CardTitle>
              <CardDescription>You have been invited to this meeting. How would you like to respond?</CardDescription>
            </CardHeader>
            <CardContent className="flex gap-3">
              <Button onClick={() => handleRespond('ACCEPTED')}>Accept Invitation</Button>
              <Button variant="destructive" onClick={() => handleRespond('REJECTED')}>Decline</Button>
            </CardContent>
          </Card>
        )}

        {/* Voice Simulation Replay */}
        {simulationScript.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-400">
                <Phone className="h-4 w-4" /> Call Simulation Replay
              </CardTitle>
              <CardDescription>AI-generated negotiation script</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 max-h-72 overflow-y-auto">
              {simulationScript.map((turn, i) => (
                <div key={i} className={`flex gap-3 ${turn.speaker === 'Exora' ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-xs px-3 py-2 rounded-lg text-sm ${
                    turn.speaker === 'Exora'
                      ? 'bg-violet-500/20 text-violet-100 border border-violet-500/20'
                      : 'bg-slate-700 text-slate-100 border border-slate-600'
                  }`}>
                    <span className="text-[10px] font-semibold text-muted-foreground block mb-1">{turn.speaker}</span>
                    {turn.line}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* AI Features — Admin Only */}
        {isAdmin && (
          <>
            <Separator />
            <div>
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2"><Zap className="h-5 w-5 text-primary" /> AI Orchestration</h3>
              <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
                <AISuggestTimes meetingId={meeting.id} />
                <AIDraftEmail meetingId={meeting.id} />
                <AISummary meetingId={meeting.id} />
              </div>
            </div>
          </>
        )}
      </div>

      {/* AI Assistant Panel — Admin only, sticky sidebar */}
      {isAdmin && (
        <div className="w-80 flex-shrink-0 sticky top-6" style={{ height: 'calc(100vh - 6rem)' }}>
          <AIAssistantPanel />
        </div>
      )}
    </div>
  );
}
