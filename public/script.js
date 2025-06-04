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
      version: "1.0.0",
      changeLog: [],
    }
    this.refreshInterval = null
    this.notificationShown = false
    this.retryCount = 0
    this.maxRetries = 3

    this.init()
  }

  init() {
    this.setupIntro()
    this.setupEventListeners()
    this.setupTabs()
    this.setupParticles()
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

  setupParticles() {
    // Initialize particles.js
    const particlesJS = window.particlesJS // Declare particlesJS variable
    if (particlesJS) {
      particlesJS("particles-js", {
        particles: {
          number: {
            value: 30,
            density: {
              enable: true,
              value_area: 800,
            },
          },
          color: {
            value: ["#10b981", "#3b82f6", "#f59e0b"],
          },
          shape: {
            type: "circle",
            stroke: {
              width: 0,
              color: "#000000",
            },
          },
          opacity: {
            value: 0.3,
            random: true,
            anim: {
              enable: true,
              speed: 1,
              opacity_min: 0.1,
              sync: false,
            },
          },
          size: {
            value: 5,
            random: true,
            anim: {
              enable: true,
              speed: 2,
              size_min: 0.1,
              sync: false,
            },
          },
          line_linked: {
            enable: true,
            distance: 150,
            color: "#10b981",
            opacity: 0.2,
            width: 1,
          },
          move: {
            enable: true,
            speed: 1,
            direction: "none",
            random: true,
            straight: false,
            out_mode: "out",
            bounce: false,
            attract: {
              enable: false,
              rotateX: 600,
              rotateY: 1200,
            },
          },
        },
        interactivity: {
          detect_on: "canvas",
          events: {
            onhover: {
              enable: true,
              mode: "grab",
            },
            onclick: {
              enable: true,
              mode: "push",
            },
            resize: true,
          },
          modes: {
            grab: {
              distance: 140,
              line_linked: {
                opacity: 0.5,
              },
            },
            push: {
              particles_nb: 3,
            },
          },
        },
        retina_detect: true,
      })
    }
  }

  setupEventListeners() {
    // Refresh button
    const refreshBtn = document.getElementById("refreshBtn")
    refreshBtn.addEventListener("click", () => {
      this.refreshData()
    })

    // Notification button
    const notificationBtn = document.getElementById("notificationBtn")
    notificationBtn.addEventListener("click", () => {
      this.toggleNotificationPanel()
    })

    // Close notification button
    const closeNotificationBtn = document.getElementById("close-notification")
    closeNotificationBtn.addEventListener("click", () => {
      this.hideNotificationPanel()
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

    // Handle escape key to close notification panel
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.notificationShown) {
        this.hideNotificationPanel()
      }
    })

    // Close notification panel when clicking outside
    document.addEventListener("click", (e) => {
      const panel = document.getElementById("notification-panel")
      const notificationBtn = document.getElementById("notificationBtn")

      if (
        this.notificationShown &&
        !panel.contains(e.target) &&
        e.target !== notificationBtn &&
        !notificationBtn.contains(e.target)
      ) {
        this.hideNotificationPanel()
      }
    })
  }

  toggleNotificationPanel() {
    const panel = document.getElementById("notification-panel")
    if (panel.classList.contains("show")) {
      this.hideNotificationPanel()
    } else {
      this.showNotificationPanel()
    }
  }

  showNotificationPanel() {
    const panel = document.getElementById("notification-panel")
    panel.classList.add("show")
    this.notificationShown = true
  }

  hideNotificationPanel() {
    const panel = document.getElementById("notification-panel")
    panel.classList.remove("show")
    this.notificationShown = false
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
    this.retryCount = 0

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
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
          Expires: "0",
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      let data
      try {
        data = await response.json()
      } catch (jsonError) {
        console.error("Error parsing JSON response:", jsonError)

        // Try to get the raw text and parse it manually
        const rawText = await response.text()
        console.log("Raw response text:", rawText)

        try {
          // Remove any "Pretty-print" prefix if present
          const cleanJson = rawText.replace(/^Pretty-print\s+/, "")
          data = JSON.parse(cleanJson)
        } catch (parseError) {
          throw new Error(`Failed to parse API response: ${parseError.message}`)
        }
      }

      console.log("Data received:", data)

      // Update version information
      this.updateVersionInfo(data.version, this.data.version)

      // Store the data
      this.data = data

      // Update UI
      this.updateUI()

      // Reset retry count on success
      this.retryCount = 0
    } catch (error) {
      console.error("Error fetching data:", error)
      this.updateConnectionStatus(false)

      // Retry logic
      if (this.retryCount < this.maxRetries) {
        this.retryCount++
        console.log(`Retrying (${this.retryCount}/${this.maxRetries})...`)

        // Exponential backoff
        const backoffTime = Math.pow(2, this.retryCount) * 1000
        setTimeout(() => this.fetchData(), backoffTime)

        this.showErrorMessage(`Connection issue. Retrying in ${backoffTime / 1000} seconds...`)
      } else {
        // Show error message to user after max retries
        this.showErrorMessage("Failed to fetch garden data. Please try again later.")
      }
    }
  }

  updateVersionInfo(newVersion, oldVersion) {
    // Update version display
    document.getElementById("version-badge").textContent = `v${newVersion}`
    document.getElementById("intro-version").textContent = `v${newVersion}`

    // Check if version changed and show notification
    if (newVersion !== oldVersion && oldVersion !== "1.0.0") {
      this.showUpdateNotification(newVersion)
    }

    // Populate notification panel
    this.populateNotificationPanel()
  }

  populateNotificationPanel() {
    const notificationContent = document.getElementById("notification-content")
    notificationContent.innerHTML = ""

    if (!this.data.changeLog || !Array.isArray(this.data.changeLog)) {
      notificationContent.innerHTML = "<p>No update history available.</p>"
      return
    }

    this.data.changeLog.forEach((version) => {
      const versionGroup = document.createElement("div")
      versionGroup.className = "notification-group"

      const versionHeader = document.createElement("div")
      versionHeader.className = "notification-version"
      versionHeader.innerHTML = `
        <span>Version ${version.version}</span>
        <span class="notification-date">${version.date}</span>
      `
      versionGroup.appendChild(versionHeader)

      if (version.changes && Array.isArray(version.changes)) {
        version.changes.forEach((change) => {
          const changeItem = document.createElement("div")
          changeItem.className = "notification-item"
          changeItem.innerHTML = `
            <span class="notification-badge ${change.type}">${change.type}</span>
            <span class="notification-text">${change.text}</span>
          `
          versionGroup.appendChild(changeItem)
        })
      }

      notificationContent.appendChild(versionGroup)
    })
  }

  showUpdateNotification(version) {
    this.showErrorMessage(`Updated to version ${version}! Click the bell icon to see what's new.`)
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

    // Add animation classes
    document.getElementById("weatherIcon").classList.add("floating")
  }

  updateStatsSection() {
    document.getElementById("seedsCount").textContent = this.data.seeds?.length || 0
    document.getElementById("gearCount").textContent = this.data.gear?.length || 0
    document.getElementById("eggsCount").textContent = this.data.eggs?.length || 0

    // Add animation to stats
    document.querySelectorAll(".stat-number").forEach((el) => {
      el.classList.add("glowing")
    })
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

      // Type - Try to infer from name or use category
      const typeCell = row.insertCell()
      let itemType = item.type || "Unknown"

      // Infer type from item name for better categorization
      if (type === "seeds") {
        itemType = "Seed"
      } else if (type === "gear") {
        itemType = "Tool"
      } else if (type === "eggs") {
        if (item.name.toLowerCase().includes("common")) {
          itemType = "Common"
        } else if (item.name.toLowerCase().includes("rare")) {
          itemType = "Rare"
        } else if (item.name.toLowerCase().includes("epic")) {
          itemType = "Epic"
        } else {
          itemType = "Egg"
        }
      }

      typeCell.textContent = itemType

      // Rarity - Infer from name if possible
      const rarityCell = row.insertCell()
      let rarity = item.rarity || "common"

      // Try to infer rarity from item name
      const itemName = item.name.toLowerCase()
      if (itemName.includes("legendary")) {
        rarity = "legendary"
      } else if (itemName.includes("epic")) {
        rarity = "epic"
      } else if (itemName.includes("rare")) {
        rarity = "rare"
      } else if (itemName.includes("uncommon")) {
        rarity = "uncommon"
      }

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
