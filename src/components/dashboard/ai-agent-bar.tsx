'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';
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

const agentSchema = z.object({
  query: z.string().min(3, { message: "Please enter a command." }),
});

export function AIAgentBar({ onSuccess }: AIAgentBarProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [agentResponse, setAgentResponse] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const form = useForm<z.infer<typeof agentSchema>>({
    resolver: zodResolver(agentSchema),
    defaultValues: { query: "" },
  });

  const onSubmit = (values: z.infer<typeof agentSchema>) => {
    if (!user) {
        toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to use the AI assistant.' });
        return;
    }
    setAgentResponse(null);
    startTransition(async () => {
      const result = await invokeHabitAgent({ ...values, userId: user.uid });
      if (result.success && result.message) {
        setAgentResponse({ message: result.message, type: 'success' });
        form.reset();
        onSuccess();
      } else if (result.error) {
        setAgentResponse({ message: result.error, type: 'error' });
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-headline">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Assistant
        </CardTitle>
        <CardDescription>
            Tell the AI what you want to do. For example: "I read 15 pages today" or "Create a new weekly habit to call my parents".
        </CardDescription>
      </CardHeader>
      <CardContent>
        {agentResponse && (
          <div className="mb-4 rounded-md border p-3 text-sm">
            <p
              className={cn(
                'font-medium',
                agentResponse.type === 'success' ? 'text-primary' : 'text-destructive'
              )}
            >
              {agentResponse.type === 'success' ? 'AI Response:' : 'Error:'}
            </p>
            <p className="text-muted-foreground">{agentResponse.message}</p>
          </div>
        )}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex items-center gap-2">
            <FormField
              control={form.control}
              name="query"
              render={({ field }) => (
                <FormItem className="flex-grow">
                  <FormControl>
                    <Input placeholder="Type your command here..." {...field} disabled={isPending} />
                  </FormControl>
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isPending}>
              {isPending ? "Thinking..." : "Send"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
