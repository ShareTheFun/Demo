import axios from "axios"

// Cache data for 60 seconds to avoid hitting API limits
let cachedData = null
let lastFetch = 0
const CACHE_DURATION = 60000 // 60 seconds

async function fetchGardenData() {
  try {
    console.log("Fetching garden data from APIs...")

    const [gearSeedsRes, eggsRes, weatherRes] = await Promise.all([
      axios.get("https://growagardenstock.com/api/stock?type=gear-seeds", {
        timeout: 8000,
        headers: {
          "User-Agent": "Garden-Tracker-Pro/1.0",
        },
      }),
      axios.get("https://growagardenstock.com/api/stock?type=egg", {
        timeout: 8000,
        headers: {
          "User-Agent": "Garden-Tracker-Pro/1.0",
        },
      }),
      axios.get("https://growagardenstock.com/api/stock/weather", {
        timeout: 8000,
        headers: {
          "User-Agent": "Garden-Tracker-Pro/1.0",
        },
      }),
    ])

    const gardenData = {
      seeds: gearSeedsRes.data.seeds || [],
      gear: gearSeedsRes.data.gear || [],
      eggs: eggsRes.data.egg || [],
      weather: {
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
      },
      isOnline: true,
      lastUpdate: Date.now(),
    }

    console.log(
      `Data fetched: ${gardenData.seeds.length} seeds, ${gardenData.gear.length} gear, ${gardenData.eggs.length} eggs`,
    )

    return gardenData
  } catch (error) {
    console.error("Error fetching garden data:", error.message)

    // Return cached data with offline status if available
    if (cachedData) {
      return {
        ...cachedData,
        isOnline: false,
        lastUpdate: cachedData.lastUpdate,
      }
    }

    // Return empty data structure if no cache available
    return {
      seeds: [],
      gear: [],
      eggs: [],
      weather: {
        icon: "❌",
        description: "Unable to fetch weather data",
        visualCue: "",
        cropBonuses: "None",
        mutations: [],
        rarity: "Unknown",
        updatedAt: Date.now(),
        currentWeather: "Offline",
        weatherType: "error",
        effectDescription: "Service temporarily unavailable",
      },
      isOnline: false,
      lastUpdate: Date.now(),
    }
  }
}

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization")

  if (req.method === "OPTIONS") {
    res.status(200).end()
    return
  }

  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" })
    return
  }

  try {
    const now = Date.now()

    // Check if we have cached data that's still fresh
    if (cachedData && now - lastFetch < CACHE_DURATION) {
      console.log("Returning cached data")
      res.status(200).json({
        ...cachedData,
        cached: true,
        cacheAge: now - lastFetch,
      })
      return
    }

    // Fetch fresh data
    const data = await fetchGardenData()

    // Update cache
    cachedData = data
    lastFetch = now

    res.status(200).json(data)
  } catch (error) {
    console.error("API Error:", error)
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
      isOnline: false,
      lastUpdate: Date.now(),
    })
  }
}
