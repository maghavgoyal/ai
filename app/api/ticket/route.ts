import { NextRequest, NextResponse } from 'next/server'
import { writeFile, unlink, mkdir } from 'fs/promises'
import { join } from 'path'
import { TicketParser } from '@/lib/ticket-parser'

export async function POST(request: NextRequest) {
  try {
    console.log('Received ticket upload request')
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      console.error('No file uploaded')
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      )
    }

    // Ensure it's a PDF
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      console.error('Invalid file type:', file.name)
      return NextResponse.json(
        { error: 'Only PDF files are supported' },
        { status: 400 }
      )
    }

    // Create temp directory if it doesn't exist
    const tempDir = join(process.cwd(), 'temp')
    try {
      await mkdir(tempDir, { recursive: true })
    } catch (error) {
      console.log('Temp directory already exists or error creating:', error)
    }

    // Generate a unique filename
    const tempFilePath = join(tempDir, `ticket-${Date.now()}.pdf`)
    console.log('Saving file to:', tempFilePath)

    // Convert the file to a Buffer and save it
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(tempFilePath, buffer)
    console.log('File saved successfully')

    // Parse the ticket
    console.log('Starting ticket parsing')
    const parser = new TicketParser()
    const ticketInfo = await parser.parseTicket(tempFilePath)
    console.log('Ticket parsed successfully:', ticketInfo)

    // Delete the temporary file
    try {
      await unlink(tempFilePath)
      console.log('Temporary file deleted')
    } catch (error) {
      console.error('Error deleting temporary file:', error)
    }

    return NextResponse.json({
      success: true,
      ticketInfo
    })
  } catch (error) {
    console.error('Error processing ticket:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process ticket' },
      { status: 500 }
    )
  }
} 