import { useState } from 'react';
import { FileText } from 'lucide-react';
import { apiClient } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

interface SummaryResult {
  summary: string;
  bulletPoints: string[];
  actionItems: { owner: string; task: string; deadline: string }[];
  decisions: string[];
}

export default function AISummary({ meetingId }: { meetingId: string }) {
  const [result, setResult] = useState<SummaryResult | null>(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSummarize = async () => {
    if (!notes.trim()) {
      toast({ title: 'Missing notes', description: 'Please provide meeting notes to summarize.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const res = await apiClient.post('/ai/summary', { meetingId, notes });
      setResult(res.data.data);
    } catch (err: any) {
      toast({ title: 'AI Error', description: err.response?.data?.message || 'Failed to summarize.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><FileText className="h-4 w-4" /> Meeting Summary</CardTitle>
        <CardDescription>AI-powered meeting note analysis.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <Label>Meeting Notes</Label>
          <Textarea placeholder="Paste your meeting notes here..." value={notes} onChange={e => setNotes(e.target.value)} rows={3} />
        </div>

        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : result ? (
          <div className="space-y-3 rounded-md border p-3 text-sm">
            <div>
              <p className="font-semibold mb-1">Summary</p>
              <p className="text-muted-foreground">{result.summary}</p>
            </div>
            {result.bulletPoints.length > 0 && (
              <div>
                <p className="font-semibold mb-1">Key Points</p>
                <ul className="list-disc pl-4 text-muted-foreground">
                  {result.bulletPoints.map((b, i) => <li key={i}>{b}</li>)}
                </ul>
              </div>
            )}
            {result.actionItems.length > 0 && (
              <div>
                <p className="font-semibold mb-1">Action Items</p>
                {result.actionItems.map((a, i) => (
                  <p key={i} className="text-muted-foreground">• <strong>{a.owner}</strong>: {a.task} (by {a.deadline})</p>
                ))}
              </div>
            )}
            {result.decisions.length > 0 && (
              <div>
                <p className="font-semibold mb-1">Decisions</p>
                <ul className="list-disc pl-4 text-muted-foreground">
                  {result.decisions.map((d, i) => <li key={i}>{d}</li>)}
                </ul>
              </div>
            )}
          </div>
        ) : null}

        <Button onClick={handleSummarize} disabled={loading} variant="outline" className="w-full">
          {loading ? 'Analyzing...' : 'Generate Summary'}
        </Button>
      </CardContent>
    </Card>
  );
}
