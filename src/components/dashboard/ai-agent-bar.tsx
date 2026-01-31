'use client';

import { useState, useTransition, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Square, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { invokeHabitAgent } from '@/lib/actions';
import { useAuth } from '@/context/auth-provider';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface AIAgentBarProps {
  onSuccess: () => void;
}

export function AIAgentBar({ onSuccess }: AIAgentBarProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [isRecording, setIsRecording] = useState(false);
  const [agentResponse, setAgentResponse] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        if (audioBlob.size < 100) {
            console.warn('Recording too short/empty');
            setIsRecording(false);
            return;
        }

        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64Audio = reader.result as string;
          handleVoiceCommand(base64Audio);
        };
        // Stop all tracks to release the microphone
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setAgentResponse(null);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      toast({
        variant: 'destructive',
        title: 'Microphone Error',
        description: 'Could not access your microphone. Please check your browser permissions.',
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleVoiceCommand = (audioDataUri: string) => {
    if (!user) return;

    startTransition(async () => {
      console.log('Sending voice command to server...');
      const result = await invokeHabitAgent({ audioDataUri, userId: user.uid });
      if (result?.success && result.message) {
        setAgentResponse({ message: result.message, type: 'success' });
        onSuccess();
      } else {
        const errorMessage = result?.error || 'The AI assistant returned an unexpected response. Please try again.';
        setAgentResponse({ message: errorMessage, type: 'error' });
      }
    });
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-headline">
            <Sparkles className="h-5 w-5 text-primary" />
            Voice Assistant
        </CardTitle>
        <CardDescription>
            Hold the button to record your habit updates. You can speak in Hebrew!
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-6 py-8">
        <div className="flex flex-col items-center gap-4">
            <Button
                size="lg"
                variant={isRecording ? "destructive" : "default"}
                className={cn(
                    "h-24 w-24 rounded-full transition-all duration-300 shadow-xl",
                    isRecording && "animate-pulse scale-110"
                )}
                onMouseDown={startRecording}
                onMouseUp={stopRecording}
                onMouseLeave={stopRecording}
                onTouchStart={startRecording}
                onTouchEnd={stopRecording}
                disabled={isPending}
            >
                {isPending ? (
                    <Loader2 className="h-10 w-10 animate-spin" />
                ) : isRecording ? (
                    <Square className="h-10 w-10" />
                ) : (
                    <Mic className="h-10 w-10" />
                )}
            </Button>
            <p className="text-sm font-medium text-muted-foreground">
                {isPending ? "Processing AI Analysis..." : isRecording ? "Recording... (Release to Stop)" : "Click and Hold to Record"}
            </p>
        </div>

        {agentResponse && (
          <div className={cn(
            "w-full rounded-lg border p-4 text-sm animate-in fade-in slide-in-from-top-2",
            agentResponse.type === 'success' ? "bg-primary/5 border-primary/20" : "bg-destructive/5 border-destructive/20"
          )}>
            <div className="flex items-start gap-2">
                {agentResponse.type === 'error' && <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />}
                <div className="flex-1">
                    <p className={cn(
                        'font-semibold mb-1',
                        agentResponse.type === 'success' ? 'text-primary' : 'text-destructive'
                    )}>
                    {agentResponse.type === 'success' ? 'AI Assistant:' : 'Error details:'}
                    </p>
                    <p className="text-foreground leading-relaxed">{agentResponse.message}</p>
                </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}