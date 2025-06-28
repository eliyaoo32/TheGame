'use client';

import { useRouter } from 'next/navigation';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-provider';
import { useEffect, useState } from 'react';
import { Logo } from '@/components/icons';

const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props}>
    <title>Google</title>
    <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.85 3.18-1.73 4.1-1.02 1.02-2.62 1.9-5.02 1.9-4.52 0-8.22-3.66-8.22-8.18s3.7-8.18 8.22-8.18c2.42 0 4.08.98 5.4 2.22l2.6-2.6C18.2 1.08 15.6.01 12.48 0 5.88 0 .01 5.88.01 12.5S5.88 25 12.48 25c6.72 0 12.28-4.44 12.28-12.38 0-1.12-.12-2.2-.32-3.28H12.48z" />
  </svg>
);

export default function LoginPage() {
  const { user, loading, signInWithTestUser } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.push('/');
    }
  }, [user, loading, router]);

  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      // Don't show an error toast if the user simply closes the popup.
      if (error.code === 'auth/popup-closed-by-user') {
        setIsSigningIn(false);
        return;
      }
      
      console.error('Error signing in with Google:', error);
      let description = 'Could not sign in with Google. Please try again.';
      if (error.code === 'auth/unauthorized-domain') {
        description = "This app's domain is not authorized for sign-in. Please go to your Firebase project's Authentication settings and add it to the list of authorized domains.";
      }
      
      toast({
        variant: 'destructive',
        title: 'Sign-in failed',
        description: description,
      });
      setIsSigningIn(false);
    }
  };

  const handleTestUserSignIn = () => {
    setIsSigningIn(true);
    signInWithTestUser();
  };

  if (loading || user) {
      return (
        <div className="flex h-screen w-full items-center justify-center">
            <Logo className="h-12 w-12 animate-pulse text-primary" />
        </div>
      );
  }

  return (
    <Card>
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl font-headline">Welcome to HabitVerse</CardTitle>
        <CardDescription>
          Sign in to continue
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <Button 
            variant="outline" 
            className="w-full" 
            onClick={handleGoogleSignIn}
            disabled={isSigningIn}
        >
          <GoogleIcon className="mr-2 h-4 w-4" />
          {isSigningIn ? 'Signing In...' : 'Sign in with Google'}
        </Button>
        {process.env.NODE_ENV === 'development' && (
          <>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or for development
                </span>
              </div>
            </div>
            <Button
              variant="secondary"
              className="w-full"
              onClick={handleTestUserSignIn}
              disabled={isSigningIn}
            >
              Sign In as Test User
            </Button>
          </>
        )}
      </CardContent>
      <CardFooter />
    </Card>
  );
}
