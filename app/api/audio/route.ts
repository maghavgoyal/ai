import { NextRequest, NextResponse } from 'next/server'
import { AudioProcessor, AudioClip } from '@/lib/audio-processor'
import fs from 'fs'
import path from 'path'

export async function POST(request: Request) {
  const processor = new AudioProcessor()
  
  try {
    console.log('Received audio processing request')
    const body = await request.text()
    console.log('Request body:', body)
    
    let clips: AudioClip[]
    try {
      const parsedBody = JSON.parse(body)
      clips = Array.isArray(parsedBody) ? parsedBody : parsedBody.clips
      console.log('Parsed clips:', clips)
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError)
      return NextResponse.json({
        success: false,
        error: 'Invalid JSON in request body'
      }, { status: 400 })
    }
    
    if (!Array.isArray(clips) || clips.length === 0) {
      console.error('Invalid clips array:', clips)
      return NextResponse.json(
        { error: 'Invalid request: clips array is required' },
        { status: 400 }
      )
    }

    // Ensure output directory exists
    const outputDir = path.join(process.cwd(), 'public', 'audio')
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }

    // Initialize clips with pending status
    clips.forEach(clip => {
      clip.status = "pending"
    })
    
    try {
      console.log('Processing clips:', clips)
      const outputPath = await processor.processClips(clips)
      console.log('Generated output path:', outputPath)
      
      // Convert absolute path to URL path
      const urlPath = outputPath.split('/public/')[1]
      if (!urlPath) {
        throw new Error('Failed to generate valid URL path')
      }

      console.log('Returning success response with path:', urlPath)
      return NextResponse.json({
        success: true,
        audioPath: `/${urlPath}`,
        clips: clips // Return updated clip statuses
      })
    } catch (error) {
      console.error('Processing error:', error)
      return NextResponse.json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during processing',
        clips: clips // Return clips with error states
      }, { status: 500 })
    } finally {
      processor.cleanup()
    }
  } catch (error) {
    console.error('Request error:', error)
    processor.cleanup()
    return NextResponse.json({
      success: false,
      error: 'Invalid request format'
    }, { status: 400 })
  }
} 