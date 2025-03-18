"use client"

import { useState } from "react"
import { Upload, FileText, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import type { TicketInfo } from "@/lib/ticket-parser"

export function TicketUpload() {
  const { toast } = useToast()
  const [isUploading, setIsUploading] = useState(false)
  const [ticketInfo, setTicketInfo] = useState<TicketInfo | null>(null)

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a PDF file',
        variant: 'destructive'
      })
      return
    }

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/ticket', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to process ticket')
      }

      setTicketInfo(data.ticketInfo)
      toast({
        title: 'Success',
        description: 'Ticket information extracted successfully'
      })
    } catch (error) {
      console.error('Error uploading ticket:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to process ticket',
        variant: 'destructive'
      })
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <CardContent className="space-y-4">
          <div className="flex items-center justify-center w-full">
            <label
              htmlFor="ticket-upload"
              className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50"
            >
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                {isUploading ? (
                  <Loader2 className="w-8 h-8 mb-2 animate-spin text-primary" />
                ) : (
                  <Upload className="w-8 h-8 mb-2 text-primary" />
                )}
                <p className="mb-2 text-sm text-muted-foreground">
                  {isUploading ? 'Processing...' : 'Upload your ticket (PDF)'}
                </p>
              </div>
              <input
                id="ticket-upload"
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={handleFileChange}
                disabled={isUploading}
              />
            </label>
          </div>

          {ticketInfo && (
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Ticket Information</h3>
              <div className="grid gap-2">
                <div className="flex justify-between p-2 bg-muted/50 rounded">
                  <span className="font-medium">Name:</span>
                  <span>{ticketInfo.person_name}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 bg-muted/50 rounded">
                    <div className="font-medium">From</div>
                    <div>{ticketInfo.person_source_city}</div>
                    <div className="text-sm text-muted-foreground">
                      {ticketInfo.person_source_time}
                    </div>
                  </div>
                  <div className="p-2 bg-muted/50 rounded">
                    <div className="font-medium">To</div>
                    <div>{ticketInfo.person_destination_city}</div>
                    <div className="text-sm text-muted-foreground">
                      {ticketInfo.person_destination_time}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 