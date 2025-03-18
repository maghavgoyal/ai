import { NextRequest, NextResponse } from 'next/server'
import { writeFile } from 'fs/promises'
import { join } from 'path'
import * as csv from 'csv-parse'
import { Readable } from 'stream'

type Passenger = {
  id: string
  name: string
  incomingDate: string
  incomingPlace: string
  outgoingDate: string
  outgoingPlace: string
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      )
    }

    // Ensure it's a CSV
    if (!file.name.toLowerCase().endsWith('.csv')) {
      return NextResponse.json(
        { error: 'Only CSV files are supported' },
        { status: 400 }
      )
    }

    // Convert the file to a buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Parse CSV
    const records: Passenger[] = []
    const parser = csv.parse(buffer, {
      columns: true,
      skip_empty_lines: true
    })

    // Process each row
    for await (const record of parser) {
      records.push({
        id: `passenger-${records.length + 1}`,
        name: record.name || 'Unknown',
        incomingDate: record.arrival_date || '',
        incomingPlace: record.arrival_location || '',
        outgoingDate: record.departure_date || '',
        outgoingPlace: record.departure_location || ''
      })
    }

    return NextResponse.json({
      success: true,
      passengers: records
    })
  } catch (error) {
    console.error('Error processing file:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process file' },
      { status: 500 }
    )
  }
} 