"use client"

import type React from "react"

import { useState } from "react"
import { Upload, FileUp, Users, Car, Calendar, Filter, Download, ArrowUpDown, Search, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useToast } from "@/hooks/use-toast"

type Vehicle = {
  id: string
  name: string
  capacity: number
}

type Assignment = {
  id: string
  vehicleId: string
  passengerId: string
  date: string
}

type SortConfig = {
  key: keyof Passenger
  direction: "asc" | "desc"
}

// Mock data types
type Passenger = {
  id: string
  name: string
  incomingDate: string
  incomingPlace: string
  outgoingDate: string
  outgoingPlace: string
  assignedDriver?: string
}

type TransportationDay = {
  date: string
  pickups: number
  dropoffs: number
  totalPassengers: number
  driversNeeded: number
}

export function TransportationManager() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [passengers, setPassengers] = useState<Passenger[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null)
  const { toast } = useToast()
  const [isUploading, setIsUploading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [sortField, setSortField] = useState<keyof Passenger>("incomingDate")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  const [transportationSummary, setTransportationSummary] = useState<TransportationDay[]>([])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const fileType = file.name.toLowerCase().split('.').pop() || ''
    if (!['csv', 'pdf'].includes(fileType)) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a CSV or PDF file',
        variant: 'destructive'
      })
      return
    }

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      // Use different endpoints based on file type
      const endpoint = fileType === 'csv' ? '/api/transportation/upload' : '/api/ticket'
      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error(`Failed to process ${fileType.toUpperCase()} file`)
      }

      const data = await response.json()
      
      // Handle different response formats
      const newPassengers = fileType === 'csv' 
        ? data.passengers 
        : data.ticketInfo.map((passenger: any) => ({
            id: `passenger-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: passenger.person_name || 'Unknown',
            incomingDate: passenger.person_source_time ? new Date(passenger.person_source_time).toLocaleString('en-US', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
            }) : 'Not found',
            incomingPlace: passenger.person_source_city || 'Not found',
            outgoingDate: passenger.person_destination_time ? new Date(passenger.person_destination_time).toLocaleString('en-US', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
            }) : 'Not found',
            outgoingPlace: passenger.person_destination_city || 'Not found'
          }))

      // Append new passengers to existing list
      setPassengers(prevPassengers => {
        const updatedPassengers = [...prevPassengers, ...newPassengers]
        const summary = calculateTransportationSummary(updatedPassengers)
        setTransportationSummary(summary)
        return updatedPassengers
      })

      toast({
        title: "Upload successful",
        description: `Added ${newPassengers.length} new passenger${newPassengers.length === 1 ? '' : 's'}`,
      })

      // Reset the file input for the next upload
      if (e.target.form) {
        e.target.form.reset()
      }
    } catch (error) {
      console.error('Error uploading file:', error)
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to process file",
        variant: "destructive"
      })
    } finally {
      setIsUploading(false)
    }
  }

  const handleManualAdd = () => {
    // In a real app, this would open a form to add passenger details
    toast({
      title: "Feature coming soon",
      description: "Manual passenger entry will be available in the next update",
    })
  }

  const handleSort = (field: keyof Passenger) => {
    if (field === sortField) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  const filteredPassengers = passengers.filter(
    (passenger) =>
      passenger.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      passenger.incomingPlace.toLowerCase().includes(searchTerm.toLowerCase()) ||
      passenger.outgoingPlace.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const sortedPassengers = [...filteredPassengers].sort((a, b) => {
    const aValue = a[sortField] ?? ''
    const bValue = b[sortField] ?? ''

    if (aValue < bValue) return sortDirection === "asc" ? -1 : 1
    if (aValue > bValue) return sortDirection === "asc" ? 1 : -1
    return 0
  })

  const calculateDriversNeeded = (passengers: Passenger[], date: string, isArrival: boolean = true) => {
    // Group passengers by location (airport)
    const passengersByLocation = new Map<string, Passenger[]>()
    
    passengers.forEach(passenger => {
      const dateTime = isArrival ? passenger.incomingDate : passenger.outgoingDate
      const location = isArrival ? passenger.incomingPlace : passenger.outgoingPlace
      
      if (dateTime.split(',')[0] === date.split(',')[0] && location !== 'Not found') {
        if (!passengersByLocation.has(location)) {
          passengersByLocation.set(location, [])
        }
        passengersByLocation.get(location)!.push(passenger)
      }
    })

    let totalDrivers = 0
    
    // Process each location's passengers
    passengersByLocation.forEach((locationPassengers, location) => {
      // Sort passengers by time
      locationPassengers.sort((a, b) => {
        const timeA = new Date(isArrival ? a.incomingDate : a.outgoingDate).getTime()
        const timeB = new Date(isArrival ? b.incomingDate : b.outgoingDate).getTime()
        return timeA - timeB
      })

      // Group passengers within 30-minute windows
      let currentGroup: Passenger[] = []
      let currentBaseTime: number | null = null
      
      locationPassengers.forEach(passenger => {
        const passengerTime = new Date(isArrival ? passenger.incomingDate : passenger.outgoingDate).getTime()
        
        if (currentBaseTime === null) {
          currentBaseTime = passengerTime
          currentGroup = [passenger]
        } else {
          const timeDiff = Math.abs(passengerTime - currentBaseTime)
          const thirtyMinutesInMs = 30 * 60 * 1000
          
          if (timeDiff <= thirtyMinutesInMs && currentGroup.length < 4) {
            currentGroup.push(passenger)
          } else {
            // Current group is full or time difference is too large
            totalDrivers += Math.ceil(currentGroup.length / 4)
            currentGroup = [passenger]
            currentBaseTime = passengerTime
          }
        }
      })
      
      // Handle the last group
      if (currentGroup.length > 0) {
        totalDrivers += Math.ceil(currentGroup.length / 4)
      }
    })

    return totalDrivers
  }

  const assignDrivers = () => {
    // Create a map to store driver assignments
    const driverAssignments = new Map<string, Passenger[]>()
    let driverCounter = 1

    // Process arrivals and departures separately
    const dates = new Set<string>(
      passengers.flatMap(p => [p.incomingDate, p.outgoingDate]).filter(date => date !== 'Not found')
    )

    // Sort passengers by date and location
    const sortedPassengers = [...passengers].sort((a, b) => {
      const dateA = new Date(a.incomingDate !== 'Not found' ? a.incomingDate : a.outgoingDate).getTime()
      const dateB = new Date(b.incomingDate !== 'Not found' ? b.incomingDate : b.outgoingDate).getTime()
      if (dateA !== dateB) return dateA - dateB
      
      const locA = a.incomingPlace !== 'Not found' ? a.incomingPlace : a.outgoingPlace
      const locB = b.incomingPlace !== 'Not found' ? b.incomingPlace : b.outgoingPlace
      return locA.localeCompare(locB)
    })

    // Group passengers by date, location, and time window
    const processPassengers = (isArrival: boolean) => {
      const locationGroups = new Map<string, Map<string, Passenger[][]>>()
      
      sortedPassengers.forEach(passenger => {
        const dateTime = isArrival ? passenger.incomingDate : passenger.outgoingDate
        const location = isArrival ? passenger.incomingPlace : passenger.outgoingPlace
        
        if (dateTime === 'Not found' || location === 'Not found') return
        
        const date = dateTime.split(',')[0]
        if (!locationGroups.has(date)) {
          locationGroups.set(date, new Map())
        }
        
        if (!locationGroups.get(date)!.has(location)) {
          locationGroups.get(date)!.set(location, [])
        }
        
        const locationPassengers = locationGroups.get(date)!.get(location)!
        const passengerTime = new Date(dateTime).getTime()
        
        // Try to find a compatible group
        let assigned = false
        for (const group of locationPassengers) {
          if (group.length < 4) {
            const groupTime = new Date(isArrival ? group[0].incomingDate : group[0].outgoingDate).getTime()
            if (Math.abs(passengerTime - groupTime) <= 30 * 60 * 1000) {
              group.push(passenger)
              assigned = true
              break
            }
          }
        }
        
        if (!assigned) {
          locationPassengers.push([passenger])
        }
      })

      // Assign drivers to groups
      locationGroups.forEach((locations, date) => {
        locations.forEach((groups, location) => {
          groups.forEach(group => {
            const driverId = `Driver-${driverCounter}`
            group.forEach(passenger => {
              if (!driverAssignments.has(driverId)) {
                driverAssignments.set(driverId, [])
              }
              driverAssignments.get(driverId)!.push(passenger)
            })
            driverCounter++
          })
        })
      })
    }

    // Process both arrivals and departures
    processPassengers(true)  // Process arrivals
    processPassengers(false) // Process departures

    // Update passengers with assigned drivers
    const updatedPassengers = passengers.map(passenger => {
      let assignedDriver = 'Unassigned'
      driverAssignments.forEach((assignedPassengers, driverId) => {
        if (assignedPassengers.some(p => p.id === passenger.id)) {
          assignedDriver = driverId
        }
      })
      return { ...passenger, assignedDriver }
    })

    setPassengers(updatedPassengers)

    toast({
      title: "Drivers assigned",
      description: `${driverCounter - 1} drivers assigned to ${passengers.length} passengers based on location and time`,
    })
  }

  const exportItinerary = () => {
    // Add actual export functionality
    const summary = transportationSummary.map(day => ({
      date: day.date,
      details: {
        pickups: passengers.filter(p => p.incomingDate === day.date),
        dropoffs: passengers.filter(p => p.outgoingDate === day.date)
      }
    }))

    console.log('Exporting itinerary:', summary)
    toast({
      title: "Exporting itinerary",
      description: `Transportation schedule for ${summary.length} days exported`,
    })
  }

  // Update the transportation summary calculation
  const calculateTransportationSummary = (updatedPassengers: Passenger[]) => {
    const dates = new Set<string>()
    updatedPassengers.forEach((p: Passenger) => {
      if (p.incomingDate !== 'Not found') dates.add(p.incomingDate.split(',')[0])
      if (p.outgoingDate !== 'Not found') dates.add(p.outgoingDate.split(',')[0])
    })

    return Array.from(dates).sort().map(date => {
      const pickups = updatedPassengers.filter((p: Passenger) => p.incomingDate.startsWith(date)).length
      const dropoffs = updatedPassengers.filter((p: Passenger) => p.outgoingDate.startsWith(date)).length
      const totalPassengers = pickups + dropoffs

      // Calculate drivers needed based on the new rules
      const driversForPickups = calculateDriversNeeded(updatedPassengers, date, true)
      const driversForDropoffs = calculateDriversNeeded(updatedPassengers, date, false)

      // Check if pickup and dropoff times overlap
      const needSeparateDrivers = updatedPassengers.some(passenger => {
        if (passenger.incomingDate.startsWith(date) && passenger.outgoingDate.startsWith(date)) {
          const arrivalTime = new Date(passenger.incomingDate).getTime()
          const departureTime = new Date(passenger.outgoingDate).getTime()
          // If departure is within 2 hours of arrival, we need separate drivers
          return (departureTime - arrivalTime) <= 2 * 60 * 60 * 1000
        }
        return false
      })

      // If times overlap, we need separate drivers for pickups and dropoffs
      const driversNeeded = needSeparateDrivers 
        ? driversForPickups + driversForDropoffs 
        : Math.max(driversForPickups, driversForDropoffs)

      return {
        date,
        pickups,
        dropoffs,
        totalPassengers,
        driversNeeded
      }
    })
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-2 hover:border-primary/50 transition-colors">
          <CardHeader>
            <CardTitle>Upload Guest Data</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <Label htmlFor="ticketFile">Upload ticket file (CSV, PDF)</Label>
              <div className="flex gap-2">
                <Input
                  id="ticketFile"
                  type="file"
                  accept=".csv,.pdf,.xlsx"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                  className="flex-1"
                />
                <Button variant="outline" onClick={handleManualAdd} className="hover:border-primary/50">
                  <FileUp className="h-4 w-4 mr-2" />
                  Manual
                </Button>
              </div>
            </div>

            {isUploading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                Processing file...
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4 grid-cols-2">
          <Card className="hover:border-primary/50 transition-colors">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Guests</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <Users className="h-5 w-5 text-primary mr-2" />
                <span className="text-2xl font-bold gradient-text">{passengers.length}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:border-primary/50 transition-colors">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Drivers Needed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <Car className="h-5 w-5 text-primary mr-2" />
                <span className="text-2xl font-bold gradient-text">
                  {transportationSummary.length > 0
                    ? Math.max(...transportationSummary.map((day) => day.driversNeeded))
                    : 0}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="col-span-2 hover:border-primary/50 transition-colors">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Event Duration</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <Calendar className="h-5 w-5 text-primary mr-2" />
                <span className="text-lg font-medium">
                  {transportationSummary.length > 0
                    ? `${transportationSummary[0].date} to ${transportationSummary[transportationSummary.length - 1].date}`
                    : "No data available"}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {passengers.length > 0 && (
        <Tabs defaultValue="passengers">
          <TabsList>
            <TabsTrigger value="passengers" className="data-[state=active]:gradient-primary data-[state=active]:text-white">
              Passenger List
            </TabsTrigger>
            <TabsTrigger value="schedule" className="data-[state=active]:gradient-primary data-[state=active]:text-white">
              Transportation Schedule
            </TabsTrigger>
          </TabsList>

          <TabsContent value="passengers" className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="relative w-full max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search passengers..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="flex gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="hover:border-primary/50">
                      <Filter className="h-4 w-4 mr-2" />
                      Filter
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem>All Passengers</DropdownMenuItem>
                    <DropdownMenuItem>Arriving Today</DropdownMenuItem>
                    <DropdownMenuItem>Departing Today</DropdownMenuItem>
                    <DropdownMenuItem>Unassigned</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button size="sm" className="gradient-primary border-0">
                  Assign Drivers
                </Button>

                <Button variant="outline" size="sm" className="hover:border-primary/50">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">
                      <Button variant="ghost" className="p-0 font-medium" onClick={() => handleSort("name")}>
                        Passenger
                        {sortField === "name" && <ArrowUpDown className="ml-2 h-4 w-4" />}
                      </Button>
                    </TableHead>
                    <TableHead className="min-w-[180px]">
                      <Button variant="ghost" className="p-0 font-medium" onClick={() => handleSort("incomingDate")}>
                        Arrival Date & Time
                        {sortField === "incomingDate" && <ArrowUpDown className="ml-2 h-4 w-4" />}
                      </Button>
                    </TableHead>
                    <TableHead>Arrival Location</TableHead>
                    <TableHead className="min-w-[180px]">
                      <Button variant="ghost" className="p-0 font-medium" onClick={() => handleSort("outgoingDate")}>
                        Departure Date & Time
                        {sortField === "outgoingDate" && <ArrowUpDown className="ml-2 h-4 w-4" />}
                      </Button>
                    </TableHead>
                    <TableHead>Departure Location</TableHead>
                    <TableHead>Assigned Driver</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedPassengers.map((passenger) => (
                    <TableRow key={passenger.id}>
                      <TableCell className="font-medium">{passenger.name}</TableCell>
                      <TableCell>{passenger.incomingDate}</TableCell>
                      <TableCell>{passenger.incomingPlace}</TableCell>
                      <TableCell>{passenger.outgoingDate}</TableCell>
                      <TableCell>{passenger.outgoingPlace}</TableCell>
                      <TableCell>
                        {passenger.assignedDriver || <span className="text-muted-foreground text-sm">Unassigned</span>}
                      </TableCell>
                    </TableRow>
                  ))}

                  {sortedPassengers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">
                        No results found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="schedule">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Daily Transportation Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Pickups</TableHead>
                          <TableHead>Dropoffs</TableHead>
                          <TableHead>Total Passengers</TableHead>
                          <TableHead>Drivers Needed</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {transportationSummary.map((day) => (
                          <TableRow key={day.date}>
                            <TableCell className="font-medium">{day.date}</TableCell>
                            <TableCell>{day.pickups}</TableCell>
                            <TableCell>{day.dropoffs}</TableCell>
                            <TableCell>{day.totalPassengers}</TableCell>
                            <TableCell>{day.driversNeeded}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Transportation Requirements</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">Peak Transportation Days</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {transportationSummary
                        .sort((a, b) => b.totalPassengers - a.totalPassengers)
                        .slice(0, 2)
                        .map((day) => (
                          <Card key={day.date}>
                            <CardContent className="p-4">
                              <div className="text-sm font-medium">{day.date}</div>
                              <div className="text-2xl font-bold">{day.totalPassengers} passengers</div>
                              <div className="text-sm text-muted-foreground">
                                {day.pickups} pickups, {day.dropoffs} dropoffs
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">Resource Allocation</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Maximum drivers needed:</span>
                        <span className="font-medium">
                          {transportationSummary.length > 0
                            ? Math.max(...transportationSummary.map((day) => day.driversNeeded))
                            : 0}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total transportation days:</span>
                        <span className="font-medium">{transportationSummary.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Average passengers per day:</span>
                        <span className="font-medium">
                          {transportationSummary.length > 0
                            ? Math.round(
                                transportationSummary.reduce((sum, day) => sum + day.totalPassengers, 0) /
                                  transportationSummary.length,
                              )
                            : 0}
                        </span>
                      </div>
                    </div>
                  </div>

                  <Button className="w-full" onClick={exportItinerary}>
                    <Download className="h-4 w-4 mr-2" />
                    Export Transportation Schedule
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      )}

      {passengers.length === 0 && !isUploading && (
        <div className="text-center py-12 border rounded-lg bg-muted/20">
          <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No Transportation Data</h3>
          <p className="text-muted-foreground mb-4">
            Upload guest ticket information to generate a transportation schedule
          </p>
          <Button onClick={() => document.getElementById("ticketFile")?.click()}>Upload Guest Data</Button>
        </div>
      )}
    </div>
  )
}

