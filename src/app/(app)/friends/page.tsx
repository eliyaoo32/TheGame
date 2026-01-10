'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { UserSummary } from '@/lib/types';
import { getAllUsers } from '@/services/users';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-provider';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

export default function FriendsPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchUsers = async () => {
      if (!currentUser) return;
      setIsLoading(true);
      try {
        const allUsers = await getAllUsers();
        // Filter out the current user from the list
        setUsers(allUsers.filter(u => u.id !== currentUser.uid));
      } catch (error) {
        console.error('Failed to fetch users:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Could not load users. Please check your connection and try again.',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, [currentUser, toast]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center">
        <div>
          <h1 className="text-lg font-semibold md:text-2xl font-headline">Friends</h1>
          <p className="text-sm text-muted-foreground">
            See what your friends are up to and check out their progress.
          </p>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>Click on a user to view their dashboard.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead className="hidden sm:table-cell">Email</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <Skeleton className="h-5 w-32" />
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Skeleton className="h-5 w-48" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Skeleton className="h-10 w-24 ml-auto" />
                    </TableCell>
                  </TableRow>
                ))
              ) : users.length > 0 ? (
                users.map(user => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={user.photoURL ?? undefined} alt={user.displayName ?? 'User'} />
                          <AvatarFallback>
                            {user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{user.displayName || 'Anonymous User'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground">{user.email}</TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/friends/${user.id}`}>
                          View Dashboard
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center">
                    No other users found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
