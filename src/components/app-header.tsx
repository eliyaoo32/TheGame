'use client';

import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useAuth } from '@/context/auth-provider';
import {
  LogOut,
  Menu,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { AppSidebar } from './app-sidebar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';

export function AppHeader() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/login');
      toast({
        title: 'Signed out',
        description: 'You have been successfully signed out.',
      });
    } catch (error) {
      console.error('Error signing out:', error);
      toast({
        variant: 'destructive',
        title: 'Sign-out failed',
        description: 'Could not sign out. Please try again.',
      });
    }
  };

  return (
    <header className="flex h-14 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4 lg:h-[60px] lg:px-6 sticky top-0 z-30">
        <Sheet>
            <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="shrink-0 md:hidden">
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Toggle navigation menu</span>
                </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex flex-col p-0">
                <AppSidebar />
            </SheetContent>
        </Sheet>
        <div className="w-full flex-1">
            {/* Can add breadcrumbs or search here */}
        </div>
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="secondary" size="icon" className="rounded-full">
                    <Avatar className="h-8 w-8">
                        <AvatarImage src={user?.photoURL || ''} alt={user?.displayName || ''} />
                        <AvatarFallback>{user?.displayName?.charAt(0) || user?.email?.charAt(0) || 'U'}</AvatarFallback>
                    </Avatar>
                    <span className="sr-only">Toggle user menu</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                    <p className="font-semibold">{user?.displayName}</p>
                    <p className="text-xs text-muted-foreground font-normal">{user?.email}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Logout</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    </header>
  );
}
