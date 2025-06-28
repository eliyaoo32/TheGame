'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-provider';
import { useToast } from '@/hooks/use-toast';
import { invokeAIFeedbacker } from '@/lib/actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkles } from 'lucide-react';
import { isToday } from 'date-fns';

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

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchFeedback = async () => {
      setLoading(true);
      const currentTimeSlot = getTimeSlot();
      const storageKey = `habitverse-feedback-${user.uid}`;
      
      try {
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
    };

    fetchFeedback();
  }, [user, toast]);

  if (!user || (!loading && !feedback)) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-headline">
          <Sparkles className="h-5 w-5 text-primary" />
          Your Daily Insight
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-[90%]" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-[75%]" />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{feedback}</p>
        )}
      </CardContent>
    </Card>
  );
}
