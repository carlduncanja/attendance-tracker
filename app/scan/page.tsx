'use client'

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useStore } from "@/src/store"
import { ArrowLeft, Camera, CheckCircle, XCircle, AlertCircle, Loader2 } from "lucide-react"
import { Scanner } from "@yudiel/react-qr-scanner"

export default function ScanPage() {
  const router = useRouter()
  const { auth, user, attendanceUser, initializeAuth, validateAndCheckin } = useStore()
  
  const [status, setStatus] = useState<'scanning' | 'processing' | 'success' | 'error' | 'expired' | 'already_checked_in'>('scanning')
  const [errorMessage, setErrorMessage] = useState('')
  const [scannerEnabled, setScannerEnabled] = useState(true)

  useEffect(() => {
    initializeAuth()
  }, [initializeAuth])

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!auth.isLoading && !auth.isAuthenticated) {
      router.replace('/login?redirect=/scan')
    }
  }, [auth.isLoading, auth.isAuthenticated, router])

  const handleScan = async (result: any) => {
    if (!result || status !== 'scanning') return

    const scannedUrl = result[0]?.rawValue
    if (!scannedUrl) return

    // Extract token from the URL
    let token = ''
    try {
      const url = new URL(scannedUrl)
      token = url.searchParams.get('token') || ''
    } catch {
      // If it's not a valid URL, treat it as a token directly
      token = scannedUrl
    }

    if (!token) {
      setStatus('error')
      setErrorMessage('Invalid QR code. Please scan a valid attendance QR code.')
      setScannerEnabled(false)
      setTimeout(() => {
        setStatus('scanning')
        setScannerEnabled(true)
        setErrorMessage('')
      }, 3000)
      return
    }

    setStatus('processing')
    setScannerEnabled(false)

    try {
      const result = await validateAndCheckin(token)

      if (result.success) {
        if ((result as any).alreadyCheckedIn) {
          setStatus('already_checked_in')
        } else {
          setStatus('success')
        }
        // Redirect to home after 2 seconds
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
        setTimeout(() => {
          setStatus('scanning')
          setScannerEnabled(true)
          setErrorMessage('')
        }, 3000)
      }
    } catch (error) {
      console.error('Check-in error:', error)
      setStatus('error')
      setErrorMessage('An unexpected error occurred')
      setTimeout(() => {
        setStatus('scanning')
        setScannerEnabled(true)
        setErrorMessage('')
      }, 3000)
    }
  }

  if (auth.isLoading) {
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
    <div className="min-h-screen bg-transparent flex flex-col p-4">
      <div className="max-w-md mx-auto w-full space-y-4">
        <Button
          variant="ghost"
          onClick={() => router.push('/')}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        <Card>
          <CardHeader className="text-center">
            {status === 'scanning' && (
              <>
                <CardTitle className="flex items-center justify-center gap-2">
                  <Camera className="h-5 w-5" />
                  Scan QR Code
                </CardTitle>
                <CardDescription>
                  Point your camera at the QR code displayed by your instructor
                </CardDescription>
              </>
            )}
            
            {status === 'processing' && (
              <>
                <CardTitle>Processing...</CardTitle>
                <CardDescription>Please wait while we check you in</CardDescription>
              </>
            )}
            
            {status === 'success' && (
              <>
                <CardTitle className="text-green-600">Check-in Successful!</CardTitle>
                <CardDescription>Your attendance has been recorded</CardDescription>
              </>
            )}
            
            {status === 'already_checked_in' && (
              <>
                <CardTitle className="text-green-600">Already Checked In!</CardTitle>
                <CardDescription>You have already checked in today</CardDescription>
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
            {status === 'scanning' && (
              <div className="aspect-square w-full max-w-sm bg-black rounded-lg overflow-hidden">
                {scannerEnabled && (
                  <Scanner
                    onScan={handleScan}
                    constraints={{
                      facingMode: 'environment'
                    }}
                    styles={{
                      container: { width: '100%', height: '100%' }
                    }}
                  />
                )}
              </div>
            )}
            
            {status === 'processing' && (
              <Loader2 className="h-16 w-16 animate-spin text-primary" />
            )}
            
            {(status === 'success' || status === 'already_checked_in') && (
              <>
                <CheckCircle className="h-16 w-16 text-green-600" />
                <p className="text-sm text-muted-foreground">Redirecting...</p>
              </>
            )}
            
            {status === 'expired' && (
              <>
                <AlertCircle className="h-16 w-16 text-yellow-600" />
                <p className="text-sm text-muted-foreground text-center">
                  The QR code changes every 3 minutes. Please scan the new QR code.
                </p>
              </>
            )}
            
            {status === 'error' && (
              <XCircle className="h-16 w-16 text-red-600" />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

