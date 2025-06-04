const express = require("express")
const http = require("http")
const { Server } = require("socket.io")
const path = require("path")
const axios = require("axios")

const app = express()
const server = http.createServer(app)
const io = new Server(server)

const gardenData = {
  seeds: [],
  gear: [],
  eggs: [],
  weather: {
    icon: "",
    description: "",
    visualCue: "",
    cropBonuses: "",
    mutations: [],
    rarity: "",
    updatedAt: 0,
    currentWeather: "",
    weatherType: "",
    effectDescription: "",
  },
}

let isOnline = true
let lastUpdate = Date.now()

async function fetchGardenData() {
  try {
    console.log("Fetching garden data...")

    const [gearSeedsRes, eggsRes, weatherRes] = await Promise.all([
      axios.get("https://growagardenstock.com/api/stock?type=gear-seeds", { timeout: 10000 }),
      axios.get("https://growagardenstock.com/api/stock?type=egg", { timeout: 10000 }),
      axios.get("https://growagardenstock.com/api/stock/weather", { timeout: 10000 }),
    ])

    gardenData.seeds = gearSeedsRes.data.seeds || []
    gardenData.gear = gearSeedsRes.data.gear || []
    gardenData.eggs = eggsRes.data.egg || []
    gardenData.weather = {
      icon: weatherRes.data.icon || "☀️",
      description: weatherRes.data.description || "Clear skies",
      visualCue: weatherRes.data.visualCue || "",
      cropBonuses: weatherRes.data.cropBonuses || "",
      mutations: weatherRes.data.mutations || [],
      rarity: weatherRes.data.rarity || "Common",
      updatedAt: weatherRes.data.updatedAt || Date.now(),
      currentWeather: weatherRes.data.currentWeather || "Sunny",
      weatherType: weatherRes.data.weatherType || "normal",
      effectDescription: weatherRes.data.effectDescription || "Perfect growing conditions",
    }

    lastUpdate = Date.now()
    isOnline = true

    // Emit update to all connected clients
    io.emit("update", { ...gardenData, isOnline, lastUpdate })

    console.log(
      `Data updated: ${gardenData.seeds.length} seeds, ${gardenData.gear.length} gear, ${gardenData.eggs.length} eggs`,
    )
  } catch (error) {
    console.error("Error fetching garden data:", error.message)
    isOnline = false
    io.emit("update", { ...gardenData, isOnline, lastUpdate })
  }
}

// Fetch data immediately and then every 60 seconds
fetchGardenData()
setInterval(fetchGardenData, 60000)

// Serve static files
app.use(express.static(path.join(__dirname, "public")))

// API endpoint for garden data
app.get("/api/data", (req, res) => {
  res.json({ ...gardenData, isOnline, lastUpdate })
})

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    uptime: process.uptime(),
    isOnline,
    lastUpdate: new Date(lastUpdate).toISOString(),
  })
})

// Socket.IO connection handling
io.on("connection", (socket) => {
  console.log("Client connected:", socket.id)

  // Send current data to newly connected client
  socket.emit("update", { ...gardenData, isOnline, lastUpdate })

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id)
  })

  // Handle manual refresh request
  socket.on("refresh", () => {
    console.log("Manual refresh requested by:", socket.id)
    fetchGardenData()
  })
})

const PORT = process.env.PORT || 3000
server.listen(PORT, () => {
  console.log(`🌱 Garden Tracker Server running on http://localhost:${PORT}`)
  console.log("📊 Real-time updates every 60 seconds")
})
