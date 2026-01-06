'use client'

import { useEffect } from "react"
import { useStore } from "@/src/store"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle } from "lucide-react"
import Image from "next/image"

export default function ThankYouPage() {
  const { auth, user, initializeAuth } = useStore()

  useEffect(() => {
    initializeAuth()
  }, [initializeAuth])

  if (auth.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  const userName = user?.name || 'there'

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="flex items-center justify-center gap-2 mb-6">
            <Image
              src="/intellibus-logo.png"
              alt="Intellibus Logo"
              width={48}
              height={48}
              className="filter brightness-0 dark:brightness-0 dark:invert"
            />
            <span className="font-semibold text-xl">AI Academy</span>
          </div>
          
          <div className="flex justify-center mb-4">
            <div className="h-20 w-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle className="h-12 w-12 text-green-600" />
            </div>
          </div>
          
          <CardTitle className="text-2xl">
            Thank you for signing in, {userName}!
          </CardTitle>
          <CardDescription className="text-base mt-2">
            Your attendance has been recorded
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <p className="text-sm text-muted-foreground">
            You can close this page now
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

