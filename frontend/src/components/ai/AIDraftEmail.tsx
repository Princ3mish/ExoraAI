import { useState } from 'react';
import { Mail } from 'lucide-react';
import { apiClient } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

interface EmailDraft {
  subject: string;
  body: string;
}

export default function AIDraftEmail({ meetingId }: { meetingId: string }) {
  const [draft, setDraft] = useState<EmailDraft | null>(null);
  const [contextType, setContextType] = useState<string>('invite');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleDraft = async () => {
    setLoading(true);
    try {
      const res = await apiClient.post('/ai/draft-email', { meetingId, contextType });
      setDraft(res.data.data);
    } catch (err: any) {
      toast({ title: 'AI Error', description: err.response?.data?.message || 'Failed to draft email.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><Mail className="h-4 w-4" /> Email Draft</CardTitle>
        <CardDescription>AI-generated contextual emails.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Select value={contextType} onValueChange={setContextType}>
          <SelectTrigger>
            <SelectValue placeholder="Email type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="invite">Invitation</SelectItem>
            <SelectItem value="reminder">Reminder</SelectItem>
            <SelectItem value="follow-up">Follow-up</SelectItem>
          </SelectContent>
        </Select>

        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : draft ? (
          <div className="space-y-2 rounded-md border p-3">
            <p className="text-sm font-semibold">Subject: {draft.subject}</p>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{draft.body}</p>
          </div>
        ) : null}

        <Button onClick={handleDraft} disabled={loading} variant="outline" className="w-full">
          {loading ? 'Drafting...' : 'Generate Email'}
        </Button>
      </CardContent>
    </Card>
  );
}
