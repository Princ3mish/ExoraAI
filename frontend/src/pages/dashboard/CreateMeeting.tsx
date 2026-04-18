import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { apiClient } from '@/api/client';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';

export default function CreateMeeting() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  
  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState<Date>();
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  useEffect(() => {
    apiClient.get('/users').then((res) => {
      setUsers(res.data.data || []);
    }).catch(console.error);
  }, []);

  const toggleUser = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) {
      toast({ title: "Error", description: "Please select a date.", variant: "destructive" });
      return;
    }
    
    // Combine date and time
    const [startH, startM] = startTime.split(':');
    const startObj = new Date(date);
    startObj.setHours(parseInt(startH, 10), parseInt(startM, 10));

    const [endH, endM] = endTime.split(':');
    const endObj = new Date(date);
    endObj.setHours(parseInt(endH, 10), parseInt(endM, 10));

    setLoading(true);
    try {
      await apiClient.post('/meetings', {
        title,
        description,
        startTime: startObj.toISOString(),
        endTime: endObj.toISOString(),
        participantIds: selectedUsers
      });
      toast({ title: "Success", description: "Meeting created!" });
      navigate('/dashboard/meetings');
    } catch (err: any) {
      toast({ 
        title: "Error failed to create meeting", 
        description: err.response?.data?.message || err.message, 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Create Meeting</h2>
        <p className="text-muted-foreground mt-2">Initialize an event and invite participants.</p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Meeting Details</CardTitle>
            <CardDescription>Fill out the primary structure of the event.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" required value={title} onChange={e => setTitle(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="desc">Description</Label>
              <Textarea id="desc" value={description} onChange={e => setDescription(e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 flex flex-col pt-1">
                <Label>Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? format(date, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label>Start Time</Label>
                  <Input type="time" required value={startTime} onChange={e => setStartTime(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>End Time</Label>
                  <Input type="time" required value={endTime} onChange={e => setEndTime(e.target.value)} />
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t">
              <Label>Participants</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {users.map(user => (
                  <div key={user.id} className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-3 shadow-sm">
                     <Checkbox id={user.id} checked={selectedUsers.includes(user.id)} onCheckedChange={() => toggleUser(user.id)} />
                     <div className="space-y-1 leading-none">
                        <Label htmlFor={user.id} className="font-medium cursor-pointer">{user.name || user.email}</Label>
                     </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating..." : "Launch Meeting"}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
