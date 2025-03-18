import fs from 'fs'
import path from 'path'
import { GoogleGenerativeAI } from '@google/generative-ai'

export type TicketInfo = {
  person_name: string
  person_source_city: string
  person_source_time: string
  person_destination_time: string
  person_destination_city: string
}

export class TicketParser {
  private genAI: GoogleGenerativeAI

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not set')
    }
    this.genAI = new GoogleGenerativeAI(apiKey)
  }

  public async parseTicket(pdfPath: string): Promise<TicketInfo[]> {
    try {
      console.log('Reading PDF file:', pdfPath)
      const fileBuffer = await fs.promises.readFile(pdfPath)
      
      console.log('Sending request to Gemini Vision API')
      const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

      const prompt = `Analyze this travel ticket and extract passenger information for ALL passengers in the ticket.
      Return ONLY a valid JSON array containing objects for each passenger with these exact keys:
      [
        {
          "person_name": "Full name of the passenger",
          "person_source_city": "Departure city",
          "person_source_time": "Departure date and time",
          "person_destination_time": "Arrival date and time",
          "person_destination_city": "Arrival city"
        },
        // ... more passengers if present
      ]
      
      Rules:
      1. Return ONLY the JSON array, no other text or markdown
      2. Use exactly these key names
      3. Use "Not found" for missing values
      4. Format dates as "YYYY-MM-DD HH:mm" if possible
      5. Ensure the response is valid JSON
      6. Include ALL passengers found in the ticket`

      const result = await model.generateContent({
        contents: [
          {
            role: 'user',
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: 'application/pdf',
                  data: fileBuffer.toString('base64')
                }
              }
            ]
          }
        ]
      })

      const response = await result.response
      const text = response.text()
      console.log('Received response from Gemini:', text)

      // Extract and validate the JSON
      let ticketInfo: TicketInfo[]
      try {
        // Clean the content string to ensure it only contains the JSON array
        const cleanedContent = text
          .replace(/```json\s*|\s*```/g, '') // Remove markdown code blocks
          .replace(/[\u200B-\u200D\uFEFF]/g, '') // Remove zero-width spaces
          .trim()

        console.log('Cleaned content:', cleanedContent)
        ticketInfo = JSON.parse(cleanedContent)
        
        // Ensure we have an array
        if (!Array.isArray(ticketInfo)) {
          ticketInfo = [ticketInfo]
        }

        // Validate all required fields are present for each passenger
        const requiredFields: (keyof TicketInfo)[] = [
          'person_name',
          'person_source_city',
          'person_source_time',
          'person_destination_time',
          'person_destination_city'
        ]
        
        ticketInfo = ticketInfo.map(passenger => {
          const validatedPassenger = { ...passenger }
          for (const field of requiredFields) {
            if (!validatedPassenger[field]) {
              validatedPassenger[field] = 'Not found'
            }
          }
          return validatedPassenger
        })
        
        console.log('Successfully parsed ticket information:', ticketInfo)
        return ticketInfo
      } catch (error) {
        console.error('Error parsing Gemini response:', error)
        console.error('Raw response:', text)
        throw new Error('Failed to parse ticket information from Gemini response')
      }
    } catch (error) {
      console.error('Error parsing ticket:', error)
      throw error
    }
  }
} 