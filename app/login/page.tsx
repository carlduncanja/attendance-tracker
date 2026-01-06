"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card"
import { useStore } from "@/src/store"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState, Suspense } from "react"
import Image from "next/image"
import { Loader2 } from "lucide-react"

function LoginSkeleton() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-transparent p-4">
      <div className="w-full max-w-md h-48 bg-card rounded-xl animate-pulse" />
    </div>
  )
}

function LoginPageContent() {
  const { user, auth, signInWithGoogle, initializeAuth } = useStore()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isSigningIn, setIsSigningIn] = useState(false)

  const redirectTo = searchParams.get('redirect') || '/'

  useEffect(() => {
    initializeAuth()
  }, [initializeAuth])

  useEffect(() => {
    if (auth.isAuthenticated && user) {
      // Check for stored redirect from OAuth flow
      const storedRedirect = typeof window !== 'undefined' ? sessionStorage.getItem('auth_redirect') : null
      if (storedRedirect) {
        sessionStorage.removeItem('auth_redirect')
        router.push(storedRedirect)
      } else {
        router.push(redirectTo)
      }
    }
  }, [auth.isAuthenticated, user, router, redirectTo])

  if (auth.isLoading) {
    return <LoginSkeleton />
  }

  if (auth.isAuthenticated && user) {
    return null
  }

  const handleSignIn = async () => {
    setIsSigningIn(true)
    try {
      await signInWithGoogle(redirectTo)
    } catch (error) {
      console.error("Sign in error:", error)
      setIsSigningIn(false)
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-transparent p-4">
      <Card className="w-full max-w-md bg-card text-card-foreground shadow-sm">
        <CardHeader className="text-center space-y-2 pb-2">
          <div className="flex items-center justify-center gap-2">
            <Image
              src="/intellibus-logo.png"
              alt="Intellibus Logo"
              width={48}
              height={48}
              className="filter brightness-0 dark:brightness-0 dark:invert"
            />
            <span className="font-semibold text-xl">AI Academy</span>
          </div>
          <CardDescription>Sign in to mark your attendance</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <Button
            onClick={handleSignIn}
            disabled={isSigningIn}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            size="lg"
          >
            {isSigningIn ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              <>
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Continue with Google
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginSkeleton />}>
      <LoginPageContent />
    </Suspense>
  )
}

