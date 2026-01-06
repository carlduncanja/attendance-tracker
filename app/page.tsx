'use client'

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { QRCodeSVG } from "qrcode.react"
import { useStore } from "@/src/store"
import Image from "next/image"
import { LogOut, UserCheck, Eye, CheckCircle, QrCode, Loader2, User, Copy, Check, Camera } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"

// Admin View - QR Display
function AdminView() {
  const { generateQRSession, signOut, validateAndCheckin, simulatedRole, setSimulatedRole, attendanceUser } = useStore()
  const router = useRouter()
  const [qrValue, setQrValue] = useState<string>("")
  const [countdown, setCountdown] = useState(30)
  const [currentToken, setCurrentToken] = useState<string>("")
  const [isTestingCheckin, setIsTestingCheckin] = useState(false)
  const [testCheckinResult, setTestCheckinResult] = useState<{ success: boolean; message: string } | null>(null)
  const [linkCopied, setLinkCopied] = useState(false)
  const isGeneratingRef = useRef(false)
  const hasInitializedRef = useRef(false)

  // Generate initial QR and set up regeneration interval
  useEffect(() => {
    if (hasInitializedRef.current) return
    hasInitializedRef.current = true

    const generateNewQR = async () => {
      if (isGeneratingRef.current) return
      isGeneratingRef.current = true
      
      try {
        const session = await generateQRSession()
        if (session) {
          const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin
          setQrValue(`${baseUrl}/checkin?token=${session.token}`)
          setCurrentToken(session.token)
          setCountdown(30)
        }
      } catch (error) {
        console.error('Error generating QR:', error)
      } finally {
        isGeneratingRef.current = false
      }
    }

    generateNewQR()
    
    const interval = setInterval(() => {
      generateNewQR()
    }, 30000)

    return () => {
      clearInterval(interval)
      hasInitializedRef.current = false
    }
  }, [generateQRSession])

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) return 30
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const handleSignOut = async () => {
    await signOut()
    router.replace('/login')
  }

  const handleTestCheckin = async () => {
    if (!currentToken || isTestingCheckin) return
    setIsTestingCheckin(true)
    setTestCheckinResult(null)
    
    try {
      const result = await validateAndCheckin(currentToken)
      if (result.success) {
        setTestCheckinResult({ 
          success: true, 
          message: (result as any).alreadyCheckedIn ? 'Already checked in today!' : 'Check-in successful!' 
        })
      } else {
        setTestCheckinResult({ success: false, message: result.error || 'Check-in failed' })
      }
    } catch (error) {
      setTestCheckinResult({ success: false, message: 'An error occurred' })
    } finally {
      setIsTestingCheckin(false)
      setTimeout(() => setTestCheckinResult(null), 3000)
    }
  }

  // Only show role simulator if user is actually an admin
  const isActualAdmin = attendanceUser?.role === 'admin'

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8 relative">
      {/* Top Bar */}
      <div className="absolute top-2 left-2 right-2 md:top-4 md:left-4 md:right-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
        {/* Role Simulator - only for actual admins */}
        {isActualAdmin && (
          <div className="flex items-center gap-2 bg-card/80 backdrop-blur-sm px-2 py-1.5 md:px-3 md:py-2 rounded-lg border">
            <Eye className="h-4 w-4 text-muted-foreground hidden sm:block" />
            <Label className="text-xs md:text-sm font-medium">View as:</Label>
            <Select
              value={simulatedRole || 'admin'}
              onValueChange={(value) => {
                if (value === 'admin') {
                  setSimulatedRole(null)
                } else {
                  setSimulatedRole(value as 'admin' | 'attendee')
                }
              }}
            >
              <SelectTrigger className="w-24 md:w-28 h-7 md:h-8 text-xs md:text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="attendee">Attendee</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        {!isActualAdmin && <div className="hidden sm:block" />}

        {/* Actions */}
        <div className="flex items-center gap-1 md:gap-2 flex-wrap justify-end">
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-1 md:gap-2 px-2 md:px-3 text-xs md:text-sm"
            onClick={() => {
              if (qrValue) {
                navigator.clipboard.writeText(qrValue)
                setLinkCopied(true)
                setTimeout(() => setLinkCopied(false), 2000)
              }
            }}
            disabled={!qrValue}
          >
            {linkCopied ? (
              <>
                <Check className="h-3 w-3 md:h-4 md:w-4" />
                <span className="hidden sm:inline">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="h-3 w-3 md:h-4 md:w-4" />
                <span className="hidden sm:inline">Copy Link</span>
              </>
            )}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-1 md:gap-2 px-2 md:px-3 text-xs md:text-sm"
                disabled={isTestingCheckin || !currentToken}
              >
                <UserCheck className="h-3 w-3 md:h-4 md:w-4" />
                <span className="hidden sm:inline">{isTestingCheckin ? 'Checking in...' : 'Test Check-in'}</span>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Test Check-in</AlertDialogTitle>
                <AlertDialogDescription>
                  This will simulate a check-in for your account using the current QR code. Are you sure you want to proceed?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleTestCheckin}>Check In</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1 md:gap-2 px-2 md:px-3 text-xs md:text-sm">
                <LogOut className="h-3 w-3 md:h-4 md:w-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Sign Out</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to sign out? The QR code display will stop and attendees won't be able to check in.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleSignOut}>Sign Out</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Test Check-in Result Toast */}
      {testCheckinResult && (
        <div className={`absolute top-16 right-4 px-4 py-2 rounded-lg shadow-lg ${
          testCheckinResult.success ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100'
        }`}>
          {testCheckinResult.message}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col items-center mb-8">
        <div className="flex items-center gap-4">
          <Image
            src="/intellibus-logo.png"
            alt="Intellibus Logo"
            width={64}
            height={64}
            className="filter brightness-0 dark:brightness-0 dark:invert"
          />
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">AI Academy</h1>
        </div>
        <p className="text-muted-foreground mt-2 text-lg">Attendance Tracker</p>
      </div>

      {/* QR Code */}
      <div className="bg-white p-8 rounded-2xl">
        {qrValue ? (
          <QRCodeSVG value={qrValue} size={320} level="H" includeMargin={false} />
        ) : (
          <div className="w-80 h-80 flex items-center justify-center bg-muted rounded-lg">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        )}
      </div>

      {/* Countdown */}
      <div className="mt-8 text-center">
        <p className="text-lg text-muted-foreground mb-2">Scan to check in</p>
        <div className="flex items-center justify-center gap-2">
          <div className="text-sm text-muted-foreground">Refreshes in</div>
          <div className="bg-primary text-primary-foreground px-3 py-1 rounded-full font-mono font-bold min-w-[3rem] text-center">
            {countdown}s
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-80 mt-4 h-1 bg-muted rounded-full overflow-hidden">
        <div 
          className="h-full bg-primary transition-all duration-1000 ease-linear"
          style={{ width: `${(countdown / 30) * 100}%` }}
        />
      </div>
    </div>
  )
}

// Attendee View - Check-in or Thank You Page
function AttendeeView() {
  const { user, signOut, attendanceUser, simulatedRole, setSimulatedRole, checkins, loadCheckins, createOrUpdateUser, loadAttendanceUser } = useStore()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [hasCheckedInToday, setHasCheckedInToday] = useState(false)
  const [fullName, setFullName] = useState('')
  const [isSavingName, setIsSavingName] = useState(false)
  const [nameSaved, setNameSaved] = useState(false)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Only show role simulator if user is actually an admin (simulating attendee view)
  const isActualAdmin = attendanceUser?.role === 'admin'
  
  // Get display name
  const userName = attendanceUser?.full_name || user?.name || 'there'
  const needsFullName = !attendanceUser?.full_name

  // Initialize full name field
  useEffect(() => {
    if (attendanceUser?.full_name) {
      setFullName(attendanceUser.full_name)
    } else if (user?.name) {
      setFullName(user.name)
    }
  }, [attendanceUser, user])

  // Check if user has checked in today
  useEffect(() => {
    const checkTodayStatus = async () => {
      setIsLoading(true)
      await loadCheckins()
      setIsLoading(false)
    }
    checkTodayStatus()
  }, [loadCheckins])

  // Determine if checked in today from checkins
  useEffect(() => {
    if (checkins && checkins.length > 0) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const todayCheckin = checkins.find((c: any) => {
        const checkinDate = new Date(c.checked_in_at)
        checkinDate.setHours(0, 0, 0, 0)
        return checkinDate.getTime() === today.getTime()
      })
      setHasCheckedInToday(!!todayCheckin)
    } else {
      setHasCheckedInToday(false)
    }
  }, [checkins])

  // Auto-save name with debounce
  useEffect(() => {
    if (!user || !fullName.trim()) return
    if (fullName === attendanceUser?.full_name) return

    // Clear previous timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    // Set new timeout to save after 800ms of no typing
    saveTimeoutRef.current = setTimeout(async () => {
      setIsSavingName(true)
      setNameSaved(false)
      try {
        await createOrUpdateUser({
          full_name: fullName.trim(),
          email: user.email
        })
        await loadAttendanceUser(user.id)
        setNameSaved(true)
        setTimeout(() => setNameSaved(false), 2000)
      } catch (error) {
        console.error('Error saving name:', error)
      } finally {
        setIsSavingName(false)
      }
    }, 800)

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [fullName, user, attendanceUser?.full_name, createOrUpdateUser, loadAttendanceUser])

  const handleSignOut = async () => {
    await signOut()
    router.replace('/login')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative">
      {/* Top Bar */}
      <div className="absolute top-2 left-2 right-2 md:top-4 md:left-4 md:right-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
        {/* Role Simulator - only for admins */}
        {isActualAdmin ? (
          <div className="flex items-center gap-2 bg-card/80 backdrop-blur-sm px-2 py-1.5 md:px-3 md:py-2 rounded-lg border">
            <Eye className="h-4 w-4 text-muted-foreground hidden sm:block" />
            <Label className="text-xs md:text-sm font-medium">View as:</Label>
            <Select
              value={simulatedRole || 'admin'}
              onValueChange={(value) => {
                if (value === 'admin') {
                  setSimulatedRole(null)
                } else {
                  setSimulatedRole(value as 'admin' | 'attendee')
                }
              }}
            >
              <SelectTrigger className="w-24 md:w-28 h-7 md:h-8 text-xs md:text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="attendee">Attendee</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ) : (
          <div />
        )}
        
        {/* Sign Out Button with Confirmation */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1 md:gap-2 px-2 md:px-3 text-xs md:text-sm">
              <LogOut className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Sign Out</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to sign out?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleSignOut}>Sign Out</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

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
          
          {hasCheckedInToday ? (
            <>
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
            </>
          ) : (
            <>
              <div className="flex justify-center mb-4">
                <div className="h-20 w-20 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <QrCode className="h-12 w-12 text-blue-600" />
                </div>
              </div>
              
              <CardTitle className="text-2xl">
                Welcome{!needsFullName ? `, ${userName}` : ''}!
              </CardTitle>
              <CardDescription className="text-base mt-2">
                {needsFullName 
                  ? 'Please enter your full name, then scan the QR code to check in'
                  : "You haven't checked in today yet"
                }
              </CardDescription>
            </>
          )}
        </CardHeader>
        
        <CardContent>
          {hasCheckedInToday ? (
            <p className="text-sm text-muted-foreground">
              You can close this page now
            </p>
          ) : (
            <div className="space-y-4">
              {/* Full Name Input - Auto-saves */}
              <div className="space-y-2 text-left">
                <Label htmlFor="fullName" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Full Name {needsFullName && <span className="text-red-500">*</span>}
                </Label>
                <div className="relative">
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="Enter your full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="pr-10"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {isSavingName && (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                    {nameSaved && !isSavingName && (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t space-y-3">
                <p className="text-sm text-muted-foreground text-center">
                  Scan the QR code displayed by your instructor to check in
                </p>
                <div className="flex flex-col gap-2">
                  <Button 
                    onClick={() => router.push('/scan')}
                    className="w-full"
                    size="lg"
                  >
                    <QrCode className="mr-2 h-5 w-5" />
                    Open QR Scanner
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => {
                      // Open device camera app
                      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                        // For iOS/Android, try to trigger the native camera
                        const input = document.createElement('input')
                        input.type = 'file'
                        input.accept = 'image/*'
                        input.capture = 'environment'
                        input.click()
                      }
                    }}
                    className="w-full"
                    size="lg"
                  >
                    <Camera className="mr-2 h-5 w-5" />
                    Open Device Camera
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// Loading View
function LoadingView() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  )
}

export default function HomePage() {
  const router = useRouter()
  const { auth, attendanceUser, initializeAuth, simulatedRole } = useStore()

  useEffect(() => {
    if (!auth.isAuthenticated) {
      initializeAuth()
    }
  }, [auth.isAuthenticated, initializeAuth])

  // Handle post-OAuth redirect
  useEffect(() => {
    if (auth.isAuthenticated && typeof window !== 'undefined') {
      const storedRedirect = sessionStorage.getItem('auth_redirect')
      if (storedRedirect) {
        sessionStorage.removeItem('auth_redirect')
        router.replace(storedRedirect)
      }
    }
  }, [auth.isAuthenticated, router])

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!auth.isLoading && !auth.isAuthenticated) {
      router.replace('/login')
    }
  }, [auth.isLoading, auth.isAuthenticated, router])

  if (auth.isLoading || attendanceUser === undefined) {
    return <LoadingView />
  }

  if (!auth.isAuthenticated) {
    return null
  }

  // Compute effective role - only admins can simulate other roles
  const effectiveRole = attendanceUser?.role === 'admin' && simulatedRole 
    ? simulatedRole 
    : (attendanceUser?.role || 'attendee')

  // Render based on effective role
  if (effectiveRole === 'admin') {
    return <AdminView />
  } else {
    return <AttendeeView />
  }
}
