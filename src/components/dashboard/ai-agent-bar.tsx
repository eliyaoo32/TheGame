'use client';

import { useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { invokeHabitAgent } from '@/lib/actions';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';


interface AIAgentBarProps {
  onSuccess: () => void;
}

const agentSchema = z.object({
  query: z.string().min(3, { message: "Please enter a command." }),
});

export function AIAgentBar({ onSuccess }: AIAgentBarProps) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof agentSchema>>({
    resolver: zodResolver(agentSchema),
    defaultValues: { query: "" },
  });

  const onSubmit = (values: z.infer<typeof agentSchema>) => {
    startTransition(async () => {
      const result = await invokeHabitAgent(values);
      if (result.success) {
        toast({
          title: "AI Assistant",
          description: result.message,
        });
        form.reset();
        onSuccess();
      } else {
        toast({
          variant: 'destructive',
          title: "Error",
          description: result.error,
        });
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
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex items-center gap-2">
            <FormField
              control={form.control}
              name="query"
              render={({ field }) => (
                <FormItem className="flex-grow">
                  <FormControl>
                    <Input placeholder="Type your command here..." {...field} />
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
