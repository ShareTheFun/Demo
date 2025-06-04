import axios from "axios"

// Cache data for 60 seconds to avoid hitting API limits
let cachedData = null
let lastFetch = 0
const CACHE_DURATION = 60000 // 60 seconds
const APP_VERSION = "1.3.0" // Version tracking

// Change log for notifications
const CHANGE_LOG = [
  {
    version: "1.3.0",
    date: "2023-06-04",
    changes: [
      { type: "fix", text: "Fixed API data parsing for raw JSON text responses" },
      { type: "add", text: "Added support for Render hosting platform" },
      { type: "fix", text: "Improved error handling for API requests" },
    ],
  },
  {
    version: "1.2.0",
    date: "2023-06-03",
    changes: [
      { type: "add", text: "Added version tracking and change notifications" },
      { type: "add", text: "Enhanced animations and visual effects" },
      { type: "add", text: "Added copyright disclaimer" },
    ],
  },
  {
    version: "1.1.0",
    date: "2023-05-15",
    changes: [
      { type: "add", text: "Added support for Vercel deployment" },
      { type: "fix", text: "Improved mobile responsiveness" },
      { type: "remove", text: "Removed socket.io dependency" },
    ],
  },
  { version: "1.0.0", date: "2023-04-20", changes: [{ type: "add", text: "Initial release" }] },
]

async function fetchGardenData() {
  try {
    console.log("Fetching garden data from APIs...")

    // Use raw data URLs with text response type
    const [gearSeedsRes, eggsRes, weatherRes] = await Promise.all([
      axios.get("https://growagardenstock.com/api/stock?type=gear-seeds", {
        timeout: 8000,
        responseType: "text",
        headers: {
          "User-Agent": "Garden-Tracker-Pro/1.3.0",
        },
      }),
      axios.get("https://growagardenstock.com/api/stock?type=egg", {
        timeout: 8000,
        responseType: "text",
        headers: {
          "User-Agent": "Garden-Tracker-Pro/1.3.0",
        },
      }),
      axios.get("https://growagardenstock.com/api/stock/weather", {
        timeout: 8000,
        responseType: "text",
        headers: {
          "User-Agent": "Garden-Tracker-Pro/1.3.0",
        },
      }),
    ])

    // Parse raw JSON text responses
    const parseRawJsonResponse = (response) => {
      try {
        if (typeof response.data === "string") {
          // Remove any "Pretty-print" prefix if present
          const cleanJson = response.data.replace(/^Pretty-print\s+/, "")
          return JSON.parse(cleanJson)
        }
        return response.data
      } catch (error) {
        console.error("Error parsing JSON response:", error)
        console.log("Raw response:", response.data)
        return {}
      }
    }

    const gearSeedsData = parseRawJsonResponse(gearSeedsRes)
    const eggsData = parseRawJsonResponse(eggsRes)
    const weatherData = parseRawJsonResponse(weatherRes)

    console.log("Parsed gear/seeds data:", gearSeedsData)
    console.log("Parsed eggs data:", eggsData)
    console.log("Parsed weather data:", weatherData)

    // Parse seeds and gear arrays into structured objects
    const parseItemArray = (items) => {
      if (!Array.isArray(items)) {
        console.error("Expected array but got:", typeof items, items)
        return []
      }

      return items.map((item) => {
        if (typeof item !== "string") {
          console.error("Expected string but got:", typeof item, item)
          return {
            name: String(item),
            type: "Unknown",
            rarity: "common",
            stock: 1,
          }
        }

        // Parse "Item Name x5" format
        const match = item.match(/^(.+?)\s+x(\d+)$/)
        if (match) {
          return {
            name: match[1].trim(),
            type: "Unknown", // API doesn't provide type info
            rarity: "common", // API doesn't provide rarity info
            stock: Number.parseInt(match[2], 10),
          }
        }
        // Fallback for items without quantity
        return {
          name: item,
          type: "Unknown",
          rarity: "common",
          stock: 1,
        }
      })
    }

    const gardenData = {
      seeds: parseItemArray(gearSeedsData.seeds || []),
      gear: parseItemArray(gearSeedsData.gear || []),
      eggs: parseItemArray(eggsData.egg || []),
      weather: {
        icon: weatherData.icon || "☀️",
        description: weatherData.description || "Clear skies",
        visualCue: weatherData.visualCue || "",
        cropBonuses: weatherData.cropBonuses || "",
        mutations: Array.isArray(weatherData.mutations) ? weatherData.mutations : [],
        rarity: weatherData.rarity || "Common",
        updatedAt: weatherData.updatedAt || Date.now(),
        currentWeather: weatherData.currentWeather || "Sunny",
        weatherType: weatherData.weatherType || "normal",
        effectDescription: weatherData.effectDescription || "Perfect growing conditions",
      },
      isOnline: true,
      lastUpdate: Date.now(),
      version: APP_VERSION,
      changeLog: CHANGE_LOG,
    }

    console.log(
      `Data fetched: ${gardenData.seeds.length} seeds, ${gardenData.gear.length} gear, ${gardenData.eggs.length} eggs`,
    )

    return gardenData
  } catch (error) {
    console.error("Error fetching garden data:", error.message)
    if (error.response) {
      console.error("Response status:", error.response.status)
      console.error("Response data:", error.response.data)
    }

    // Return cached data with offline status if available
    if (cachedData) {
      return {
        ...cachedData,
        isOnline: false,
        lastUpdate: cachedData.lastUpdate,
        version: APP_VERSION,
        changeLog: CHANGE_LOG,
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
      version: APP_VERSION,
      changeLog: CHANGE_LOG,
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
      version: APP_VERSION,
      changeLog: CHANGE_LOG,
    })
  }
}
