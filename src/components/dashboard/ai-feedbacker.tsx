'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/auth-provider';
import { useToast } from '@/hooks/use-toast';
import { invokeAIFeedbacker } from '@/lib/actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Sparkles, RefreshCw } from 'lucide-react';
import { isToday } from 'date-fns';
import { cn } from '@/lib/utils';


type TimeSlot = 'morning' | 'noon' | 'evening';
type CachedFeedback = {
  feedback: string;
  timestamp: number;
  timeSlot: TimeSlot;
};

const getTimeSlot = (): TimeSlot => {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'noon';
  return 'evening';
};

export function AIFeedbacker() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);

  const fetchFeedback = useCallback(async (forceRefresh = false) => {
    if (!user) {
        setLoading(false);
        return;
    }

    setLoading(true);
    const currentTimeSlot = getTimeSlot();
    const storageKey = `thegame-feedback-${user.uid}`;
    
    try {
      if (!forceRefresh) {
        const cachedItem = localStorage.getItem(storageKey);
        if (cachedItem) {
          const cachedData: CachedFeedback = JSON.parse(cachedItem);
          const cacheDate = new Date(cachedData.timestamp);
          
          if (isToday(cacheDate) && cachedData.timeSlot === currentTimeSlot) {
            setFeedback(cachedData.feedback);
            setLoading(false);
            return;
          }
        }
      }
      
      const result = await invokeAIFeedbacker({ userId: user.uid, timeOfDay: currentTimeSlot });
      
      if (result.success && result.feedback) {
        const newCachedData: CachedFeedback = {
          feedback: result.feedback,
          timestamp: Date.now(),
          timeSlot: currentTimeSlot,
        };
        setFeedback(result.feedback);
        localStorage.setItem(storageKey, JSON.stringify(newCachedData));
      } else {
        console.error('AI Feedbacker error:', result.error);
        setFeedback("Could not generate feedback at this time. Please check back later.");
      }
    } catch (error) {
      console.error("Failed to fetch AI feedback:", error);
      setFeedback("An error occurred while fetching your feedback.");
    } finally {
      setLoading(false);
    }
  }, [user, toast]);


  useEffect(() => {
    fetchFeedback(false);
  }, [fetchFeedback]);

  if (!user || (!loading && !feedback)) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 font-headline">
            <Sparkles className="h-5 w-5 text-primary" />
            Your Daily Insight
          </CardTitle>
           <Button
              variant="ghost"
              size="icon"
              onClick={() => fetchFeedback(true)}
              disabled={loading}
              aria-label="Regenerate feedback"
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3 text-center">
            <p className="text-sm text-muted-foreground italic">Your AI coach is crafting some fresh insights for you...</p>
            <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-[90%] mx-auto" />
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{feedback}</p>
        )}
      </CardContent>
    </Card>
  );
}
