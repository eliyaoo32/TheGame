import { placeholderHabits } from '@/lib/placeholder-data';
import { HabitCard } from '@/components/dashboard/habit-card';
import { AddHabitDialog } from '@/components/dashboard/add-habit-dialog';
import { ChatReporter } from '@/components/dashboard/chat-reporter';
import { DashboardSummary } from '@/components/dashboard/dashboard-summary';

export default function DashboardPage() {
  return (
    <>
      <div className="flex flex-col gap-6">
        <div className="flex items-center">
          <h1 className="text-lg font-semibold md:text-2xl font-headline">
            Dashboard
          </h1>
          <div className="ml-auto flex items-center gap-2">
            <AddHabitDialog />
          </div>
        </div>

        <DashboardSummary habits={placeholderHabits} />

        <div>
          <h2 className="text-lg font-semibold md:text-xl font-headline mb-4">
            My Habits
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {placeholderHabits.map((habit) => (
              <HabitCard key={habit.id} habit={habit} />
            ))}
          </div>
        </div>
      </div>
      <ChatReporter />
    </>
  );
}
