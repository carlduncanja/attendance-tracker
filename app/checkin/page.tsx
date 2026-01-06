'use client'

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useStore } from "@/src/store"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, CheckCircle, XCircle, AlertCircle } from "lucide-react"
import Image from "next/image"

function CheckinSkeleton() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md h-64 bg-card rounded-xl animate-pulse" />
    </div>
  )
}

function CheckinContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { auth, user, attendanceUser, initializeAuth, validateAndCheckin, createOrUpdateUser, loadAttendanceUser } = useStore()
  
  const [status, setStatus] = useState<'loading' | 'name_required' | 'checking' | 'success' | 'error' | 'expired'>('loading')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [alreadyCheckedIn, setAlreadyCheckedIn] = useState(false)
  const [fullName, setFullName] = useState('')
  const [isSubmittingName, setIsSubmittingName] = useState(false)

  const token = searchParams.get('token')

  useEffect(() => {
    initializeAuth()
  }, [initializeAuth])

  // Handle authentication and check-in
  useEffect(() => {
    if (auth.isLoading) return

    // If not authenticated, redirect to login with this page as redirect
    if (!auth.isAuthenticated) {
      const currentUrl = `/checkin?token=${token}`
      router.replace(`/login?redirect=${encodeURIComponent(currentUrl)}`)
      return
    }

    // If no token, show error
    if (!token) {
      setStatus('error')
      setErrorMessage('No check-in token provided. Please scan a valid QR code.')
      return
    }

    // Wait for attendanceUser to be loaded
    if (attendanceUser === undefined) {
      return
    }

    // If no attendance user record exists, ask for full name
    if (attendanceUser === null) {
      setFullName(user?.name || '')
      setStatus('name_required')
      return
    }

    // Proceed with check-in
    performCheckin()
  }, [auth.isLoading, auth.isAuthenticated, token, attendanceUser])

  const handleNameSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fullName.trim() || !user) return

    setIsSubmittingName(true)
    try {
      await createOrUpdateUser({
        full_name: fullName.trim(),
        email: user.email
      })
      // Reload attendance user after creation
      await loadAttendanceUser(user.id)
      // Then perform check-in
      performCheckin()
    } catch (error) {
      console.error('Error creating user:', error)
      setStatus('error')
      setErrorMessage('Failed to save your information. Please try again.')
    } finally {
      setIsSubmittingName(false)
    }
  }

  const performCheckin = async () => {
    if (!token) return
    
    setStatus('checking')

    try {
      const result = await validateAndCheckin(token)

      if (result.success) {
        if ((result as any).alreadyCheckedIn) {
          setAlreadyCheckedIn(true)
        }
        setStatus('success')
        
        // Redirect to home page after short delay
        setTimeout(() => {
          router.replace('/')
        }, 2000)
      } else {
        if (result.error?.includes('expired')) {
          setStatus('expired')
        } else {
          setStatus('error')
        }
        setErrorMessage(result.error || 'Check-in failed')
      }
    } catch (error) {
      console.error('Check-in error:', error)
      setStatus('error')
      setErrorMessage('An unexpected error occurred')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Image
              src="/intellibus-logo.png"
              alt="Intellibus Logo"
              width={40}
              height={40}
              className="filter brightness-0 dark:brightness-0 dark:invert"
            />
            <span className="font-semibold text-lg">AI Academy</span>
          </div>
          
          {status === 'loading' && (
            <>
              <CardTitle>Initializing...</CardTitle>
              <CardDescription>Please wait</CardDescription>
            </>
          )}

          {status === 'name_required' && (
            <>
              <CardTitle>Welcome to AI Academy!</CardTitle>
              <CardDescription>Please enter your full name to complete check-in</CardDescription>
            </>
          )}
          
          {status === 'checking' && (
            <>
              <CardTitle>Checking you in...</CardTitle>
              <CardDescription>Please wait while we record your attendance</CardDescription>
            </>
          )}
          
          {status === 'success' && (
            <>
              <CardTitle className="text-green-600">
                {alreadyCheckedIn ? 'Already Checked In!' : 'Check-in Successful!'}
              </CardTitle>
              <CardDescription>
                {alreadyCheckedIn 
                  ? 'You have already checked in today'
                  : 'Your attendance has been recorded'}
              </CardDescription>
            </>
          )}
          
          {status === 'expired' && (
            <>
              <CardTitle className="text-yellow-600">QR Code Expired</CardTitle>
              <CardDescription>Please scan the current QR code</CardDescription>
            </>
          )}
          
          {status === 'error' && (
            <>
              <CardTitle className="text-red-600">Check-in Failed</CardTitle>
              <CardDescription>{errorMessage}</CardDescription>
            </>
          )}
        </CardHeader>
        
        <CardContent className="flex flex-col items-center gap-4">
          {status === 'loading' && (
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
          )}

          {status === 'name_required' && (
            <form onSubmit={handleNameSubmit} className="w-full space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Enter your full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  autoFocus
                  disabled={isSubmittingName}
                />
              </div>
              <Button 
                type="submit" 
                className="w-full"
                disabled={!fullName.trim() || isSubmittingName}
              >
                {isSubmittingName ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Continue to Check-in'
                )}
              </Button>
            </form>
          )}
          
          {status === 'checking' && (
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
          )}
          
          {status === 'success' && (
            <CheckCircle className="h-16 w-16 text-green-600" />
          )}
          
          {status === 'expired' && (
            <>
              <AlertCircle className="h-16 w-16 text-yellow-600" />
              <p className="text-sm text-muted-foreground text-center">
                The QR code changes every 30 seconds for security. 
                Please scan the new QR code shown on the display.
              </p>
            </>
          )}
          
          {status === 'error' && (
            <>
              <XCircle className="h-16 w-16 text-red-600" />
              <Button 
                onClick={() => router.push('/login')}
                variant="outline"
              >
                Go to Login
              </Button>
            </>
          )}
          
          {status === 'success' && (
            <p className="text-sm text-muted-foreground">
              Redirecting to confirmation...
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function CheckinPage() {
  return (
    <Suspense fallback={<CheckinSkeleton />}>
      <CheckinContent />
    </Suspense>
  )
}
