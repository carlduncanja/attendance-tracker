'use client'

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { QRCodeSVG } from "qrcode.react"
import { useStore } from "@/src/store"
import Image from "next/image"
import { LogOut, UserCheck, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
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

export default function QRDisplayPage() {
  const router = useRouter()
  const { auth, attendanceUser, initializeAuth, generateQRSession, signOut, validateAndCheckin, simulatedRole, setSimulatedRole, getEffectiveRole } = useStore()
  const [qrValue, setQrValue] = useState<string>("")
  const [countdown, setCountdown] = useState(180)
  const [currentToken, setCurrentToken] = useState<string>("")
  const [isTestingCheckin, setIsTestingCheckin] = useState(false)
  const [testCheckinResult, setTestCheckinResult] = useState<{ success: boolean; message: string } | null>(null)
  const isGeneratingRef = useRef(false)
  const hasInitializedRef = useRef(false)

  useEffect(() => {
    initializeAuth()
  }, [initializeAuth])

  // Redirect non-admins
  useEffect(() => {
    if (!auth.isLoading && auth.isAuthenticated && attendanceUser !== undefined) {
      if (attendanceUser?.role !== 'admin') {
        router.replace('/login')
      }
    }
  }, [auth.isLoading, auth.isAuthenticated, attendanceUser, router])

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!auth.isLoading && !auth.isAuthenticated) {
      router.replace('/login')
    }
  }, [auth.isLoading, auth.isAuthenticated, router])

  // Generate initial QR and set up regeneration interval
  useEffect(() => {
    if (!auth.isAuthenticated || attendanceUser?.role !== 'admin') return
    if (hasInitializedRef.current) return
    
    hasInitializedRef.current = true

    const generateNewQR = async () => {
      if (isGeneratingRef.current) return
      isGeneratingRef.current = true
      
      try {
        const session = await generateQRSession()
        if (session) {
          const baseUrl = 'https://attendance.intellibus.academy'
          setQrValue(`${baseUrl}/checkin?token=${session.token}`)
          setCurrentToken(session.token)
          setCountdown(180)
        }
      } catch (error) {
        console.error('Error generating QR:', error)
      } finally {
        isGeneratingRef.current = false
      }
    }

    // Generate initial QR
    generateNewQR()
    
    // Set up 3-minute interval
    const interval = setInterval(() => {
      generateNewQR()
    }, 180000)

    return () => {
      clearInterval(interval)
      hasInitializedRef.current = false
    }
  }, [auth.isAuthenticated, attendanceUser?.role, generateQRSession])

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          return 30
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  if (auth.isLoading || attendanceUser === undefined) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (attendanceUser?.role !== 'admin') {
    return null
  }

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
      // Clear message after 3 seconds
      setTimeout(() => setTestCheckinResult(null), 3000)
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8 relative">
      {/* Top Bar with Role Simulator, Test Check-in and Sign Out */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
        {/* Role Simulator */}
        <div className="flex items-center gap-2 bg-card/80 backdrop-blur-sm px-3 py-2 rounded-lg border">
          <Eye className="h-4 w-4 text-muted-foreground" />
          <Label className="text-sm font-medium">View as:</Label>
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
            <SelectTrigger className="w-28 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="attendee">Attendee</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2"
            onClick={handleTestCheckin}
            disabled={isTestingCheckin || !currentToken}
          >
            <UserCheck className="h-4 w-4" />
            {isTestingCheckin ? 'Checking in...' : 'Test Check-in'}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <LogOut className="h-4 w-4" />
                Sign Out
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

      {/* Header with Logo and Title */}
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

      {/* QR Code Display */}
      <div className="bg-white p-8 rounded-2xl shadow-2xl">
        {qrValue ? (
          <QRCodeSVG
            value={qrValue}
            size={320}
            level="H"
            includeMargin={false}
          />
        ) : (
          <div className="w-80 h-80 flex items-center justify-center bg-muted rounded-lg">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        )}
      </div>

      {/* Countdown and Instructions */}
      <div className="mt-8 text-center">
        <p className="text-lg text-muted-foreground mb-2">Scan to check in</p>
        <div className="flex items-center justify-center gap-2">
          <div className="text-sm text-muted-foreground">
            Refreshes in
          </div>
          <div className="bg-primary text-primary-foreground px-3 py-1 rounded-full font-mono font-bold min-w-[3rem] text-center">
            {countdown}s
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-80 mt-4 h-1 bg-muted rounded-full overflow-hidden">
        <div 
          className="h-full bg-primary transition-all duration-1000 ease-linear"
          style={{ width: `${(countdown / 180) * 100}%` }}
        />
      </div>
    </div>
  )
}

