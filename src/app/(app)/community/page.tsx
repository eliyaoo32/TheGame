import Image from 'next/image';
import { placeholderCommunityUsers } from '@/lib/placeholder-data';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { HabitIcon } from '@/components/habit-icon';

export default function CommunityPage() {
  return (
    <>
      <div className="flex items-center">
        <h1 className="text-lg font-semibold md:text-2xl font-headline">
          Community Progress
        </h1>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {placeholderCommunityUsers.map((user) => (
          <Card key={user.id} className="transition-shadow duration-200 hover:shadow-lg">
            <CardHeader>
              <div className="flex items-center gap-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={user.avatarUrl} alt={user.name} data-ai-hint="person face" />
                  <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <CardTitle>{user.name}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Tracked Habits
                </h3>
                {user.habits.length > 0 ? (
                  <ul className="space-y-3">
                    {user.habits.map((habit) => (
                      <li key={habit.name} className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2 text-sm">
                           <HabitIcon name={habit.icon} className="h-4 w-4 text-muted-foreground" />
                           <span>{habit.name}</span>
                        </div>
                        <Progress value={habit.progress} aria-label={`${habit.name} progress`} />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No public habits to show.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
