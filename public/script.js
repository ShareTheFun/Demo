class GardenTracker {
  constructor() {
    this.currentTab = "seeds"
    this.data = {
      seeds: [],
      gear: [],
      eggs: [],
      weather: {},
      isOnline: false,
      lastUpdate: Date.now(),
    }
    this.refreshInterval = null

    this.init()
  }

  init() {
    this.setupIntro()
    this.setupEventListeners()
    this.setupTabs()
    this.loadInitialData()
    this.startAutoRefresh()
  }

  setupIntro() {
    // Hide intro after 5 seconds
    setTimeout(() => {
      const intro = document.getElementById("intro")
      if (intro) {
        intro.style.display = "none"
      }
    }, 5000)
  }

  setupEventListeners() {
    // Refresh button
    const refreshBtn = document.getElementById("refreshBtn")
    refreshBtn.addEventListener("click", () => {
      this.refreshData()
    })

    // Handle visibility change to pause/resume auto-refresh
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        this.stopAutoRefresh()
      } else {
        this.startAutoRefresh()
        this.refreshData() // Refresh when tab becomes visible
      }
    })
  }

  setupTabs() {
    const tabBtns = document.querySelectorAll(".tab-btn")
    tabBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const tabName = btn.dataset.tab
        this.switchTab(tabName)
      })
    })
  }

  switchTab(tabName) {
    // Update active tab button
    document.querySelectorAll(".tab-btn").forEach((btn) => {
      btn.classList.remove("active")
    })
    document.querySelector(`[data-tab="${tabName}"]`).classList.add("active")

    // Update active tab panel
    document.querySelectorAll(".tab-panel").forEach((panel) => {
      panel.classList.remove("active")
    })
    document.getElementById(`${tabName}Tab`).classList.add("active")

    this.currentTab = tabName
  }

  async loadInitialData() {
    await this.fetchData()
  }

  startAutoRefresh() {
    // Clear existing interval
    this.stopAutoRefresh()

    // Refresh every 60 seconds
    this.refreshInterval = setInterval(() => {
      this.refreshData()
    }, 60000)
  }

  stopAutoRefresh() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval)
      this.refreshInterval = null
    }
  }

  async refreshData() {
    const refreshBtn = document.getElementById("refreshBtn")
    refreshBtn.classList.add("spinning")

    try {
      await this.fetchData()
    } finally {
      setTimeout(() => {
        refreshBtn.classList.remove("spinning")
      }, 1000)
    }
  }

  async fetchData() {
    try {
      console.log("Fetching data from API...")

      const response = await fetch("/api/data", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      console.log("Data received:", data)

      this.data = data
      this.updateUI()
    } catch (error) {
      console.error("Error fetching data:", error)
      this.updateConnectionStatus(false)

      // Show error message to user
      this.showErrorMessage("Failed to fetch garden data. Please try again.")
    }
  }

  showErrorMessage(message) {
    // Create or update error notification
    let errorDiv = document.getElementById("error-notification")
    if (!errorDiv) {
      errorDiv = document.createElement("div")
      errorDiv.id = "error-notification"
      errorDiv.className = "error-notification"
      document.body.appendChild(errorDiv)
    }

    errorDiv.textContent = message
    errorDiv.style.display = "block"

    // Hide after 5 seconds
    setTimeout(() => {
      errorDiv.style.display = "none"
    }, 5000)
  }

  updateConnectionStatus(isOnline) {
    const statusDot = document.getElementById("statusDot")
    const statusText = document.getElementById("statusText")

    if (isOnline) {
      statusDot.classList.remove("offline")
      statusDot.classList.add("online")
      statusText.textContent = "Online"
    } else {
      statusDot.classList.remove("online")
      statusDot.classList.add("offline")
      statusText.textContent = "Offline"
    }
  }

  updateUI() {
    this.updateWeatherSection()
    this.updateStatsSection()
    this.updateDataTables()
    this.updateConnectionStatus(this.data.isOnline)
  }

  updateWeatherSection() {
    const weather = this.data.weather || {}

    document.getElementById("weatherIcon").textContent = weather.icon || "☀️"
    document.getElementById("weatherType").textContent = weather.currentWeather || "Unknown"
    document.getElementById("weatherDescription").textContent = weather.effectDescription || "No description available"
    document.getElementById("weatherRarity").textContent = weather.rarity || "Common"
    document.getElementById("cropBonuses").textContent = weather.cropBonuses || "None"

    // Handle mutations
    const mutations = weather.mutations || []
    const mutationsText = mutations.length > 0 ? mutations.join(", ") : "None"
    document.getElementById("mutations").textContent = mutationsText

    // Update last updated time
    const lastUpdated = this.data.lastUpdate ? this.formatTime(this.data.lastUpdate) : "Never"
    document.getElementById("lastUpdated").textContent = lastUpdated
  }

  updateStatsSection() {
    document.getElementById("seedsCount").textContent = this.data.seeds?.length || 0
    document.getElementById("gearCount").textContent = this.data.gear?.length || 0
    document.getElementById("eggsCount").textContent = this.data.eggs?.length || 0
  }

  updateDataTables() {
    this.updateTable("seeds", this.data.seeds || [])
    this.updateTable("gear", this.data.gear || [])
    this.updateTable("eggs", this.data.eggs || [])
  }

  updateTable(type, data) {
    const tableBody = document.querySelector(`#${type}Table tbody`)
    if (!tableBody) return

    tableBody.innerHTML = ""

    if (data.length === 0) {
      const row = tableBody.insertRow()
      const cell = row.insertCell()
      cell.colSpan = 4
      cell.textContent = `No ${type} data available`
      cell.style.textAlign = "center"
      cell.style.color = "var(--text-muted)"
      cell.style.fontStyle = "italic"
      cell.style.padding = "2rem"
      return
    }

    data.forEach((item) => {
      const row = tableBody.insertRow()

      // Name
      const nameCell = row.insertCell()
      nameCell.textContent = item.name || "Unknown"

      // Type
      const typeCell = row.insertCell()
      typeCell.textContent = item.type || "Unknown"

      // Rarity
      const rarityCell = row.insertCell()
      const rarity = item.rarity || "common"
      rarityCell.textContent = this.capitalizeFirst(rarity)
      rarityCell.className = `rarity-${rarity.toLowerCase()}`

      // Stock
      const stockCell = row.insertCell()
      const stock = item.stock !== undefined ? item.stock : item.quantity || 0
      stockCell.textContent = stock

      // Add stock indicator styling
      if (stock === 0) {
        stockCell.style.color = "var(--error-color)"
        stockCell.style.fontWeight = "600"
      } else if (stock < 5) {
        stockCell.style.color = "var(--warning-color)"
        stockCell.style.fontWeight = "600"
      } else {
        stockCell.style.color = "var(--success-color)"
        stockCell.style.fontWeight = "600"
      }
    })
  }

  formatTime(timestamp) {
    const now = Date.now()
    const diff = now - timestamp

    if (diff < 60000) {
      // Less than 1 minute
      return "Just now"
    } else if (diff < 3600000) {
      // Less than 1 hour
      const minutes = Math.floor(diff / 60000)
      return `${minutes} minute${minutes > 1 ? "s" : ""} ago`
    } else if (diff < 86400000) {
      // Less than 1 day
      const hours = Math.floor(diff / 3600000)
      return `${hours} hour${hours > 1 ? "s" : ""} ago`
    } else {
      return new Date(timestamp).toLocaleDateString()
    }
  }

  capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1)
  }
}

// Initialize the application when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new GardenTracker()
})

// Add some visual feedback for interactions
document.addEventListener("click", (e) => {
  if (e.target.matches("button, .tab-btn")) {
    e.target.style.transform = "scale(0.95)"
    setTimeout(() => {
      e.target.style.transform = ""
    }, 150)
  }
})

// Add keyboard navigation for tabs
document.addEventListener("keydown", (e) => {
  if (e.key === "Tab" && e.target.matches(".tab-btn")) {
    e.preventDefault()
    const tabs = Array.from(document.querySelectorAll(".tab-btn"))
    const currentIndex = tabs.indexOf(e.target)
    const nextIndex = e.shiftKey ? (currentIndex - 1 + tabs.length) % tabs.length : (currentIndex + 1) % tabs.length
    tabs[nextIndex].focus()
    tabs[nextIndex].click()
  }
})
