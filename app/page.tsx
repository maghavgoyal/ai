import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AudioCompilationTool } from "@/components/audio-compilation-tool-updated"
import { TransportationManager } from "@/components/transportation-manager"

export default function Home() {
  return (
    <div className="container mx-auto py-8 px-4 bg-gradient-to-br from-slate-900 to-slate-800 min-h-screen text-white">
      <h1 className="text-4xl font-bold text-center mb-2 bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
        Wedding & Event Organizer
      </h1>
      <p className="text-center text-white/60 mb-8">Streamline your event logistics with ease</p>

      <Tabs defaultValue="audio" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-8">
          <TabsTrigger value="audio" className="data-[state=active]:gradient-primary data-[state=active]:text-white">
            Audio Compilation Tool
          </TabsTrigger>
          <TabsTrigger value="transport" className="data-[state=active]:gradient-primary data-[state=active]:text-white">
            Transportation Manager
          </TabsTrigger>
        </TabsList>

        <TabsContent value="audio">
          <AudioCompilationTool />
        </TabsContent>

        <TabsContent value="transport">
          <TransportationManager />
        </TabsContent>
      </Tabs>
    </div>
  )
}

