'use client';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
  SheetClose
} from '@/components/ui/sheet';
import { MessageSquarePlus, Send } from 'lucide-react';
import { useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormMessage } from '../ui/form';
import { processChatReport } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';

const chatSchema = z.object({
    reportText: z.string().min(10, { message: "Please describe your progress in a bit more detail."}),
});


export function ChatReporter() {
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();

    const form = useForm<z.infer<typeof chatSchema>>({
        resolver: zodResolver(chatSchema),
        defaultValues: {
            reportText: ""
        }
    });

    const onSubmit = (values: z.infer<typeof chatSchema>) => {
        startTransition(async () => {
            const result = await processChatReport({
                reportText: values.reportText,
                userId: 'user-123' // placeholder
            });

            if(result.success) {
                toast({
                    title: "Report Submitted!",
                    description: `We've updated ${result.updatedHabits?.length || 0} habits based on your report.`
                });
                form.reset();
            } else {
                 toast({
                    variant: 'destructive',
                    title: "Uh oh! Something went wrong.",
                    description: result.error,
                });
            }
        });
    }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg">
            <MessageSquarePlus className="h-6 w-6" />
            <span className="sr-only">Open Chat Report</span>
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle className="font-headline">Chat Report</SheetTitle>
          <SheetDescription>
            Tell us about your progress in your own words. Our AI will update your habits for you.
          </SheetDescription>
        </SheetHeader>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="h-full flex flex-col">
                <div className="py-4 flex-grow">
                     <FormField
                        control={form.control}
                        name="reportText"
                        render={({ field }) => (
                            <FormItem>
                            <FormControl>
                                <Textarea
                                    placeholder="e.g., 'I went for my morning run and read a chapter of my book.'"
                                    className="resize-none h-full"
                                    {...field}
                                />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                </div>
                <SheetFooter>
                    <SheetClose asChild>
                        <Button type="button" variant="ghost">Cancel</Button>
                    </SheetClose>
                    <Button type="submit" disabled={isPending}>
                        {isPending ? "Sending..." : <>Send Report <Send className="ml-2 h-4 w-4"/></>}
                    </Button>
                </SheetFooter>
            </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
