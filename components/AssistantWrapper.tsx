'use client'

import { AssistantModal } from "@/components/assistant-ui/assistant-modal"
import { AssistantRuntimeProvider } from "@assistant-ui/react"
import { useChatRuntime, AssistantChatTransport } from "@assistant-ui/react-ai-sdk"
import { useStore } from "@/src/store"
import { supabase } from "@/lib/supabase"

export function AssistantWrapper({ children }: { children: React.ReactNode }) {
  const { attendanceUser } = useStore()

  const runtime = useChatRuntime({
    transport: new AssistantChatTransport({
      api: "/api/chat",
      headers: async () => {
        const { data: { session } } = await supabase.auth.getSession()
        return {
          'Authorization': `Bearer ${session?.access_token}`,
        }
      },
    }),
  })

  // Only show assistant for admins
  const isAdmin = attendanceUser?.role === 'admin'

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div className="flex-1 flex flex-col">
        {children}
      </div>
      {isAdmin && <AssistantModal />}
    </AssistantRuntimeProvider>
  )
}

