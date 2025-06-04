class UpdateManager {
  constructor() {
    this.currentState = "loading"
    this.updateData = null
    this.botVerified = false
    this.challengeData = null

    this.init()
  }

  init() {
    this.setupEventListeners()
    this.checkForUpdates()
  }

  setupEventListeners() {
    // Check updates button
    document.getElementById("check-updates-btn")?.addEventListener("click", () => {
      this.checkForUpdates()
    })

    // Bot verification
    document.getElementById("verify-btn")?.addEventListener("click", () => {
      this.verifyBot()
    })

    // Start update button
    document.getElementById("start-update-btn")?.addEventListener("click", () => {
      this.showUpdateConfirmation()
    })

    // Confirmation buttons
    document.getElementById("confirm-update-btn")?.addEventListener("click", () => {
      this.startUpdate()
    })

    document.getElementById("cancel-update-btn")?.addEventListener("click", () => {
      this.showUpdateInfo()
    })

    // Retry and navigation buttons
    document.getElementById("retry-btn")?.addEventListener("click", () => {
      this.checkForUpdates()
    })

    document.getElementById("back-to-site-btn")?.addEventListener("click", () => {
      window.location.href = "/"
    })

    document.getElementById("redirect-now-btn")?.addEventListener("click", () => {
      this.redirectToSite()
    })

    // Enter key for bot verification
    document.getElementById("challenge-answer")?.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        this.verifyBot()
      }
    })
  }

  async checkForUpdates() {
    this.showState("loading")

    try {
      const response = await fetch("/api/update", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      this.updateData = data
      this.challengeData = data.botChallenge

      this.populateUpdateInfo(data)
      this.showState("info")

      // Show bot verification if update is available
      if (data.hasUpdate) {
        this.showBotVerification()
      }
    } catch (error) {
      console.error("Error checking for updates:", error)
      this.showError("Failed to check for updates. Please try again.")
    }
  }

  populateUpdateInfo(data) {
    // Current status
    document.getElementById("current-version").textContent = data.currentVersion
    document.getElementById("latest-version").textContent = data.latestVersion
    document.getElementById("update-status").textContent = data.hasUpdate ? "✅ Available" : "✅ Up to date"

    // Hosting info
    document.getElementById("hosting-platform").textContent = data.hostingInfo.platform
    document.getElementById("hosting-region").textContent = data.hostingInfo.region
    document.getElementById("hosting-environment").textContent = data.hostingInfo.environment

    // Commit info
    if (data.latestCommit) {
      document.getElementById("commit-message").textContent = data.latestCommit.message
      document.getElementById("commit-author").textContent = data.latestCommit.author
      document.getElementById("commit-date").textContent = new Date(data.latestCommit.date).toLocaleDateString()
      document.getElementById("commit-link").href = data.latestCommit.url
    } else {
      document.getElementById("commit-info").innerHTML = "<p>No commit information available</p>"
    }

    // Bot challenge
    if (data.botChallenge) {
      document.getElementById("challenge-question").textContent = data.botChallenge.question
    }
  }

  showBotVerification() {
    document.getElementById("bot-verification").style.display = "block"
    document.getElementById("challenge-answer").focus()
  }

  async verifyBot() {
    const answer = document.getElementById("challenge-answer").value.trim()
    const resultDiv = document.getElementById("verification-result")

    if (!answer) {
      this.showVerificationResult("Please provide an answer", false)
      return
    }

    try {
      const response = await fetch("/api/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "verify-bot",
          challengeId: this.challengeData?.id,
          challengeAnswer: answer,
        }),
      })

      const result = await response.json()

      if (result.verified) {
        this.botVerified = true
        this.showVerificationResult("✅ Verification successful!", true)
        document.getElementById("start-update-btn").style.display = "inline-flex"
      } else {
        this.showVerificationResult("❌ Verification failed. Please try again.", false)
      }
    } catch (error) {
      console.error("Error verifying bot:", error)
      this.showVerificationResult("❌ Verification error. Please try again.", false)
    }
  }

  showVerificationResult(message, success) {
    const resultDiv = document.getElementById("verification-result")
    resultDiv.textContent = message
    resultDiv.className = `verification-result ${success ? "success" : "error"}`
  }

  showUpdateConfirmation() {
    if (!this.botVerified) {
      alert("Please complete bot verification first")
      return
    }

    const message = `Found update v${this.updateData.latestVersion}. Do you want to update the site?`
    document.getElementById("confirmation-message").textContent = message
    this.showState("confirmation")
  }

  async startUpdate() {
    this.showState("progress")

    const steps = [
      "Downloading latest code...",
      "Installing dependencies...",
      "Building application...",
      "Running tests...",
      `Deploying to ${this.updateData.hostingInfo.platform}...`,
      "Updating configuration...",
      "Verifying deployment...",
      "Finalizing update...",
    ]

    let currentStep = 0
    const progressFill = document.getElementById("progress-fill")
    const progressPercentage = document.getElementById("progress-percentage")
    const progressStep = document.getElementById("progress-step")

    const updateProgress = () => {
      const progress = ((currentStep + 1) / steps.length) * 100
      progressFill.style.width = `${progress}%`
      progressPercentage.textContent = `${Math.round(progress)}%`
      progressStep.textContent = steps[currentStep]

      currentStep++

      if (currentStep < steps.length) {
        setTimeout(updateProgress, 1500)
      } else {
        setTimeout(() => this.completeUpdate(), 1000)
      }
    }

    // Start the progress simulation
    updateProgress()

    // Actually trigger the deployment
    try {
      const response = await fetch("/api/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "deploy-update",
          confirmUpdate: true,
        }),
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.message || "Update failed")
      }

      // Store the result for the success message
      this.deploymentResult = result
    } catch (error) {
      console.error("Error during update:", error)
      this.showError(`Update failed: ${error.message}`)
    }
  }

  completeUpdate() {
    const oldVersion = this.updateData.currentVersion
    const newVersion = this.updateData.latestVersion
    const message = `Successfully updated from v${oldVersion} to v${newVersion}`

    document.getElementById("success-message").textContent = message
    this.showState("success")

    // Start countdown
    this.startCountdown()
  }

  startCountdown() {
    let seconds = 5
    const countdownElement = document.getElementById("countdown")

    const updateCountdown = () => {
      countdownElement.textContent = seconds
      seconds--

      if (seconds >= 0) {
        setTimeout(updateCountdown, 1000)
      } else {
        this.redirectToSite()
      }
    }

    updateCountdown()
  }

  redirectToSite() {
    window.location.href = "/"
  }

  showState(state) {
    // Hide all cards
    const cards = [
      "loading-state",
      "update-info",
      "update-confirmation",
      "update-progress",
      "update-success",
      "error-state",
    ]
    cards.forEach((cardId) => {
      const element = document.getElementById(cardId)
      if (element) {
        element.style.display = "none"
      }
    })

    // Show the requested state
    const targetCard = document.getElementById(
      `${state === "info" ? "update-info" : state === "loading" ? "loading-state" : state === "confirmation" ? "update-confirmation" : state === "progress" ? "update-progress" : state === "success" ? "update-success" : "error-state"}`,
    )

    if (targetCard) {
      targetCard.style.display = "block"
    }

    this.currentState = state
  }

  showUpdateInfo() {
    this.showState("info")
  }

  showError(message) {
    document.getElementById("error-message").textContent = message
    this.showState("error")
  }
}

// Initialize the update manager when the page loads
document.addEventListener("DOMContentLoaded", () => {
  new UpdateManager()
})

// Add some visual feedback for button interactions
document.addEventListener("click", (e) => {
  if (e.target.matches("button, .action-btn")) {
    e.target.style.transform = "scale(0.95)"
    setTimeout(() => {
      e.target.style.transform = ""
    }, 150)
  }
})
