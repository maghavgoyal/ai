"use client"

import { useState } from "react"
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd"
import { PlusCircle, Trash2, Music, ArrowDownToLine, Loader2, GripVertical, Share2, Sparkles, Youtube } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/hooks/use-toast"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

type AudioClip = {
  id: string
  url: string
  startTime: string
  endTime: string
  title: string
  duration: number
  status: "pending" | "processing" | "ready" | "error"
  platform: "youtube" | "spotify" | null
}

export function AudioCompilationTool() {
  const { toast } = useToast()
  const [url, setUrl] = useState("")
  const [startMinutes, setStartMinutes] = useState("")
  const [startSeconds, setStartSeconds] = useState("")
  const [endMinutes, setEndMinutes] = useState("")
  const [endSeconds, setEndSeconds] = useState("")
  const [audioClips, setAudioClips] = useState<AudioClip[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingProgress, setProcessingProgress] = useState(0)
  const [isMerging, setIsMerging] = useState(false)
  const [isHovering, setIsHovering] = useState(false)
  const [showInputs, setShowInputs] = useState(false)

  const formatTimeValue = (min: string, sec: string) => {
    const minutes = min ? Number.parseInt(min) : 0
    const seconds = sec ? Number.parseInt(sec) : 0
    return `${minutes}:${seconds.toString().padStart(2, "0")}`
  }

  const getPlatform = (url: string): "youtube" | "spotify" | null => {
    if (url.includes("youtube.com") || url.includes("youtu.be")) return "youtube"
    if (url.includes("spotify.com")) return "spotify"
    return null
  }

  const addAudioClip = () => {
    if (!url) {
      toast({
        title: "✨ Oops!",
        description: "Drop a link to get started!",
        variant: "destructive",
      })
      return
    }

    const platform = getPlatform(url)
    if (!platform) {
      toast({
        title: "🎵 Hold up!",
        description: "We only vibe with YouTube and Spotify links rn",
        variant: "destructive",
      })
      return
    }

    const startTime = formatTimeValue(startMinutes, startSeconds)
    const endTime = formatTimeValue(endMinutes, endSeconds) || "3:00"

    const newClip: AudioClip = {
      id: Date.now().toString(),
      url,
      startTime,
      endTime,
      title: `Clip ${audioClips.length + 1}`,
      duration: 180,
      status: "pending",
      platform
    }

    setAudioClips([...audioClips, newClip])
    setUrl("")
    setStartMinutes("")
    setStartSeconds("")
    setEndMinutes("")
    setEndSeconds("")

    processAudioClip(newClip)
  }

  const processAudioClip = async (clip: AudioClip) => {
    setIsProcessing(true)
    setProcessingProgress(0)

    setAudioClips((clips) => clips.map((c) => (c.id === clip.id ? { ...c, status: "processing" } : c)))

    try {
      const response = await fetch('/api/audio/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ clips: [clip] }),
      })

      if (!response.ok) {
        throw new Error('Failed to process audio clip')
      }

      const data = await response.json()
      if (data.success) {
        setAudioClips((clips) => clips.map((c) => (c.id === clip.id ? { ...c, status: "ready" } : c)))
        setProcessingProgress(100)
      } else {
        throw new Error(data.error || 'Failed to process audio clip')
      }
    } catch (error) {
      console.error('Error processing audio clip:', error)
      setAudioClips((clips) => clips.map((c) => (c.id === clip.id ? { ...c, status: "error" } : c)))
      toast({
        title: "❌ Oops!",
        description: error instanceof Error ? error.message : "Failed to process audio clip",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
      setProcessingProgress(0)
    }
  }

  const removeAudioClip = (id: string) => {
    setAudioClips(audioClips.filter((clip) => clip.id !== id))
  }

  const handleDragEnd = (result: any) => {
    if (!result.destination) return

    const items = Array.from(audioClips)
    const [reorderedItem] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, reorderedItem)

    setAudioClips(items)
  }

  const handleMergeAndDownload = async () => {
    if (audioClips.length === 0) {
      toast({
        title: "🎧 Yo!",
        description: "Add some clips to create your mix!",
        variant: "destructive",
      })
      return
    }

    setIsMerging(true)

    try {
      const response = await fetch('/api/audio/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ clips: audioClips }),
      })

      if (!response.ok) {
        const contentType = response.headers.get('content-type')
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to merge and download audio')
        } else {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
      }

      const data = await response.json()
      
      if (data.success && data.audioPath) {
        // Create a temporary link to trigger the download
        const link = document.createElement('a')
        link.href = data.audioPath
        link.download = 'your-mix.mp3'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        
        toast({
          title: "🔥 Let's go!",
          description: "Your mix is ready to drop!",
        })
      } else {
        throw new Error(data.error || 'Failed to process audio')
      }
    } catch (error) {
      console.error('Error merging and downloading audio:', error)
      toast({
        title: "❌ Oops!",
        description: error instanceof Error ? error.message : "Something went wrong while merging your audio.",
        variant: "destructive",
      })
    } finally {
      setIsMerging(false)
    }
  }

  const formatTime = (timeStr: string) => {
    return timeStr
  }

  const shareProject = () => {
    toast({
      title: "🚀 Coming Soon!",
      description: "Share your fire mixes with the world!",
    })
  }

  const startMixing = () => {
    setShowInputs(true)
    // Focus the URL input after a short delay to allow for animation
    setTimeout(() => {
      const urlInput = document.querySelector('input[placeholder*="YouTube"]') as HTMLInputElement
      if (urlInput) urlInput.focus()
    }, 100)
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <AnimatePresence mode="wait">
        {!showInputs && audioClips.length === 0 ? (
          <motion.div
            key="welcome"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="text-center py-12 rounded-lg bg-gradient-to-br from-purple-500/5 to-pink-500/5 backdrop-blur-sm border-0"
          >
            <Music className="h-12 w-12 mx-auto text-white/20 mb-4" />
            <h3 className="text-lg font-medium mb-2 bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
              Start Your Mix
            </h3>
            <p className="text-white/50 mb-4">
              Drop some YouTube or Spotify links to create your perfect mix
            </p>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                onClick={startMixing}
                className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0"
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Add First Track
              </Button>
            </motion.div>
          </motion.div>
        ) : (
          <motion.div
            key="inputs"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card className="border-0 bg-gradient-to-br from-purple-500/10 to-pink-500/10 backdrop-blur-xl shadow-xl">
              <CardContent className="p-6 space-y-6">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-pink-500/20 blur-xl" />
                  <Input
                    placeholder="Paste YouTube or Spotify URL here..."
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="bg-white/10 border-0 backdrop-blur-sm text-lg placeholder:text-white/50 focus-visible:ring-2 focus-visible:ring-purple-500/50"
                    onMouseEnter={() => setIsHovering(true)}
                    onMouseLeave={() => setIsHovering(false)}
                  />
                  <motion.div
                    animate={{ scale: isHovering ? 1.1 : 1 }}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                  >
                    {getPlatform(url) === "youtube" ? (
                      <Youtube className="h-5 w-5 text-red-500" />
                    ) : getPlatform(url) === "spotify" ? (
                      <Music className="h-5 w-5 text-green-500" />
                    ) : (
                      <Music className="h-5 w-5 text-muted-foreground" />
                    )}
                  </motion.div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-white/70">Start Time</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={startMinutes}
                          onChange={(e) => setStartMinutes(e.target.value)}
                          className="bg-white/10 border-0 backdrop-blur-sm"
                          aria-label="Minutes"
                        />
                        <span className="text-xs text-white/50">mins</span>
                      </div>
                      <div>
                        <Input
                          type="number"
                          min="0"
                          max="59"
                          placeholder="00"
                          value={startSeconds}
                          onChange={(e) => setStartSeconds(e.target.value)}
                          className="bg-white/10 border-0 backdrop-blur-sm"
                          aria-label="Seconds"
                        />
                        <span className="text-xs text-white/50">secs</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-white/70">End Time</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Input
                          type="number"
                          min="0"
                          placeholder="3"
                          value={endMinutes}
                          onChange={(e) => setEndMinutes(e.target.value)}
                          className="bg-white/10 border-0 backdrop-blur-sm"
                          aria-label="Minutes"
                        />
                        <span className="text-xs text-white/50">mins</span>
                      </div>
                      <div>
                        <Input
                          type="number"
                          min="0"
                          max="59"
                          placeholder="00"
                          value={endSeconds}
                          onChange={(e) => setEndSeconds(e.target.value)}
                          className="bg-white/10 border-0 backdrop-blur-sm"
                          aria-label="Seconds"
                        />
                        <span className="text-xs text-white/50">secs</span>
                      </div>
                    </div>
                  </div>
                </div>

                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button 
                    onClick={addAudioClip} 
                    disabled={isProcessing}
                    className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add to Mix
                  </Button>
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {isProcessing && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-2"
        >
          <div className="flex justify-between text-sm">
            <span className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-500" />
              Creating magic...
            </span>
            <span className="text-purple-500 font-medium">{processingProgress}%</span>
          </div>
          <Progress 
            value={processingProgress} 
            className="h-2 bg-white/10"
          >
            <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500" style={{ width: `${processingProgress}%` }} />
          </Progress>
        </motion.div>
      )}

      <AnimatePresence>
        {audioClips.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
                Your Mix
              </h2>
              <Button variant="ghost" size="sm" onClick={shareProject}>
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
            </div>

            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="audioClips">
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
                    {audioClips.map((clip, index) => (
                      <Draggable key={clip.id} draggableId={clip.id} index={index}>
                        {(provided) => (
                          <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                          >
                            <Card 
                              ref={provided.innerRef} 
                              {...provided.draggableProps} 
                              className={cn(
                                "border-0 bg-white/5 backdrop-blur-lg hover:bg-white/10 transition-all duration-300",
                                clip.status === "ready" && "bg-gradient-to-r from-purple-500/5 to-pink-500/5"
                              )}
                            >
                              <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center">
                                    <div
                                      {...provided.dragHandleProps}
                                      className="mr-2 p-1 rounded-md hover:bg-white/10 cursor-grab active:cursor-grabbing"
                                    >
                                      <GripVertical className="h-5 w-5 text-white/50" />
                                    </div>
                                    <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 p-2 rounded-full mr-3">
                                      {clip.platform === "youtube" ? (
                                        <Youtube className="h-5 w-5 text-red-500" />
                                      ) : (
                                        <Music className="h-5 w-5 text-green-500" />
                                      )}
                                    </div>
                                    <div>
                                      <h3 className="font-medium text-white/90">{clip.title}</h3>
                                      <p className="text-sm text-white/50">
                                        {formatTime(clip.startTime)} - {formatTime(clip.endTime)}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {clip.status === "processing" && (
                                      <Loader2 className="h-4 w-4 animate-spin text-purple-500" />
                                    )}
                                    {clip.status === "ready" && (
                                      <span className="text-xs bg-gradient-to-r from-purple-500 to-pink-500 px-2 py-1 rounded-full font-medium text-white">
                                        Ready
                                      </span>
                                    )}
                                    <motion.button
                                      whileHover={{ scale: 1.1 }}
                                      whileTap={{ scale: 0.9 }}
                                      onClick={() => removeAudioClip(clip.id)}
                                      className="text-white/50 hover:text-pink-500 transition-colors"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </motion.button>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </motion.div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>

            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300"
                size="lg"
                onClick={handleMergeAndDownload}
                disabled={isMerging || audioClips.some((clip) => clip.status !== "ready")}
              >
                {isMerging ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Your Mix...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Drop the Beat
                  </>
                )}
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

