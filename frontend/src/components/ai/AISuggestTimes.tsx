import { useState } from 'react';
import { Clock } from 'lucide-react';
import { apiClient } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

interface TimeSuggestion {
  start: string;
  end: string;
  score: number;
}

export default function AISuggestTimes({ meetingId }: { meetingId: string }) {
  const [suggestions, setSuggestions] = useState<TimeSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSuggest = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/ai/suggest-times/${meetingId}`);
      setSuggestions(res.data.data?.suggestions || []);
    } catch (err: any) {
      toast({ title: 'AI Error', description: err.response?.data?.message || 'Failed to get suggestions.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><Clock className="h-4 w-4" /> Time Suggestions</CardTitle>
        <CardDescription>AI-ranked optimal time slots.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : suggestions.length > 0 ? (
          <div className="space-y-2">
            {suggestions.map((s, i) => (
              <div key={i} className="flex items-center justify-between rounded-md border p-3 text-sm">
                <span>{new Date(s.start).toLocaleString()} → {new Date(s.end).toLocaleString()}</span>
                <span className="font-semibold text-primary">{Math.round(s.score * 100)}%</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Click below to generate AI suggestions.</p>
        )}
        <Button onClick={handleSuggest} disabled={loading} variant="outline" className="w-full">
          {loading ? 'Analyzing...' : 'Generate Suggestions'}
        </Button>
      </CardContent>
    </Card>
  );
}
