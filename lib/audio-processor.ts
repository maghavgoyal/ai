import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'
import path from 'path'

const execAsync = promisify(exec)

export type AudioClip = {
  id: string
  url: string
  startTime: string
  endTime: string
  title: string
  duration: number
  status: "pending" | "processing" | "ready" | "error"
}

type ProcessError = {
  message: string
  command?: string
  stderr?: string
}

export class AudioProcessor {
  private tempDir: string
  private outputDir: string
  private static fileCounter = 0

  constructor() {
    this.tempDir = path.join(process.cwd(), 'temp')
    this.outputDir = path.join(process.cwd(), 'public', 'audio')
    this.ensureDirectories()
  }

  private ensureDirectories() {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true })
    }
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true })
    }
  }

  private async ensureFileDeleted(filePath: string): Promise<void> {
    try {
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath)
        console.log(`Removed existing file: ${filePath}`)
      }
    } catch (error) {
      console.error(`Failed to delete file ${filePath}:`, error)
      throw error
    }
  }

  private async downloadAudio(url: string, outputPath: string): Promise<void> {
    try {
      console.log(`Starting download from ${url} to ${outputPath}`)
      await this.ensureFileDeleted(outputPath)
      const command = `yt-dlp -x --audio-format mp3 -o "${outputPath}" "${url}"`
      console.log('Running command:', command)
      const { stdout, stderr } = await execAsync(command)
      console.log('Download stdout:', stdout)
      if (stderr) console.error('Download stderr:', stderr)
      
      // Verify the file was created
      if (!fs.existsSync(outputPath)) {
        throw new Error(`Failed to create output file: ${outputPath}`)
      }
      console.log('Download completed successfully')
    } catch (error: unknown) {
      const processError: ProcessError = {
        message: error instanceof Error ? error.message : 'Unknown error during download',
        command: 'yt-dlp',
        stderr: (error as { stderr?: string })?.stderr
      }
      console.error('Download error:', processError)
      throw processError
    }
  }

  private async extractAudioSegment(
    inputPath: string,
    outputPath: string,
    startTime: string,
    endTime: string
  ): Promise<void> {
    try {
      console.log(`Starting extraction from ${inputPath} to ${outputPath}`)
      console.log(`Time range: ${startTime} to ${endTime}`)
      await this.ensureFileDeleted(outputPath)
      
      const [startMin, startSec] = startTime.split(':').map(Number)
      const [endMin, endSec] = endTime.split(':').map(Number)
      const duration = (endMin * 60 + endSec) - (startMin * 60 + startSec)
      console.log(`Calculated duration: ${duration} seconds`)

      const command = `ffmpeg -y -ss ${startTime} -i "${inputPath}" -t ${duration} -c copy "${outputPath}"`
      console.log('Running command:', command)
      const { stdout, stderr } = await execAsync(command)
      console.log('Extract stdout:', stdout)
      if (stderr) console.error('Extract stderr:', stderr)
      
      // Verify the file was created
      if (!fs.existsSync(outputPath)) {
        throw new Error(`Failed to create output file: ${outputPath}`)
      }
      console.log('Extraction completed successfully')
    } catch (error: unknown) {
      const processError: ProcessError = {
        message: error instanceof Error ? error.message : 'Unknown error during extraction',
        command: 'ffmpeg',
        stderr: (error as { stderr?: string })?.stderr
      }
      console.error('Extract error:', processError)
      throw processError
    }
  }

  private async concatenateAudio(inputFiles: string[], outputPath: string): Promise<void> {
    try {
      console.log('Starting concatenation')
      console.log('Input files:', inputFiles)
      console.log('Output path:', outputPath)
      
      // Verify all input files exist
      for (const file of inputFiles) {
        if (!fs.existsSync(file)) {
          throw new Error(`Input file does not exist: ${file}`)
        }
      }
      
      await this.ensureFileDeleted(outputPath)
      
      const listPath = path.join(this.tempDir, 'files.txt')
      const fileList = inputFiles.map(file => `file '${file}'`).join('\n')
      console.log('Generated file list:', fileList)
      await fs.promises.writeFile(listPath, fileList)

      const command = `ffmpeg -y -f concat -safe 0 -i "${listPath}" -c copy "${outputPath}"`
      console.log('Running command:', command)
      const { stdout, stderr } = await execAsync(command)
      console.log('Concatenate stdout:', stdout)
      if (stderr) console.error('Concatenate stderr:', stderr)
      
      await this.ensureFileDeleted(listPath)
      
      // Verify the output file was created
      if (!fs.existsSync(outputPath)) {
        throw new Error(`Failed to create output file: ${outputPath}`)
      }
      console.log('Concatenation completed successfully')
    } catch (error: unknown) {
      const processError: ProcessError = {
        message: error instanceof Error ? error.message : 'Unknown error during concatenation',
        command: 'ffmpeg',
        stderr: (error as { stderr?: string })?.stderr
      }
      console.error('Concatenate error:', processError)
      throw processError
    }
  }

  public async processClips(clips: AudioClip[]): Promise<string> {
    try {
      console.log('Starting to process clips:', clips)
      const processedFiles: string[] = []
      
      for (const clip of clips) {
        console.log(`Processing clip ${clip.id}`)
        clip.status = "processing"
        const tempFile = path.join(this.tempDir, `temp-${clip.id}.mp3`)
        const segmentFile = path.join(this.tempDir, `segment-${clip.id}.mp3`)
        
        try {
          console.log('Downloading audio...')
          await this.downloadAudio(clip.url, tempFile)
          console.log('Extracting segment...')
          await this.extractAudioSegment(tempFile, segmentFile, clip.startTime, clip.endTime)
          processedFiles.push(segmentFile)
          clip.status = "ready"
          console.log(`Successfully processed clip ${clip.id}`)
        } catch (error) {
          clip.status = "error"
          console.error(`Failed to process clip ${clip.id}:`, error)
          // Clean up any temporary files
          if (fs.existsSync(tempFile)) {
            fs.unlinkSync(tempFile)
            console.log(`Cleaned up temp file: ${tempFile}`)
          }
          if (fs.existsSync(segmentFile)) {
            fs.unlinkSync(segmentFile)
            console.log(`Cleaned up segment file: ${segmentFile}`)
          }
          throw error
        }
      }

      // Generate a unique output filename
      const outputFile = path.join(this.outputDir, `merged-${++AudioProcessor.fileCounter}.mp3`)
      console.log('Merging clips into:', outputFile)
      await this.concatenateAudio(processedFiles, outputFile)

      // Clean up temporary files
      for (const file of processedFiles) {
        if (fs.existsSync(file)) {
          fs.unlinkSync(file)
          console.log(`Cleaned up processed file: ${file}`)
        }
      }

      console.log('Successfully processed all clips')
      return outputFile
    } catch (error) {
      console.error('Error during clip processing:', error)
      // Set all pending clips to error state
      clips.forEach(clip => {
        if (clip.status === "pending" || clip.status === "processing") {
          clip.status = "error"
        }
      })
      throw error
    }
  }

  public cleanup(): void {
    console.log('Running cleanup...')
    // Clean up any remaining files in temp directory
    if (fs.existsSync(this.tempDir)) {
      const files = fs.readdirSync(this.tempDir)
      for (const file of files) {
        try {
          const filePath = path.join(this.tempDir, file)
          fs.unlinkSync(filePath)
          console.log(`Cleaned up file: ${filePath}`)
        } catch (error) {
          console.error(`Failed to clean up file ${file}:`, error)
        }
      }
    }
  }
} 