import packageJson from '../../package.json'

export default function Footer() {
  const version = packageJson.version || '0.1.0'

  return (
    <footer className="w-full border-t border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>AI Academy Attendance Tracker</span>
          </div>
          <div className="flex items-center gap-2">
            <span>Version {version}</span>
          </div>
        </div>
      </div>
    </footer>
  )
}

