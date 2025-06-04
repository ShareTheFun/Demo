import axios from "axios"

const GITHUB_REPO = "ShareTheFun/Demo"
const CURRENT_VERSION = "1.3.0"

// Bot verification using simple challenge-response
const BOT_CHALLENGES = [
  { question: "What is 2 + 2?", answer: "4" },
  { question: "What color is the sky?", answer: "blue" },
  { question: "How many days in a week?", answer: "7" },
  { question: "What is the capital of France?", answer: "paris" },
  { question: "Complete: Hello ___", answer: "world" },
]

async function getLatestCommit() {
  try {
    const response = await axios.get(`https://api.github.com/repos/${GITHUB_REPO}/commits`, {
      timeout: 10000,
      headers: {
        "User-Agent": "Garden-Tracker-Pro/1.3.0",
        Accept: "application/vnd.github.v3+json",
      },
    })

    if (response.data && response.data.length > 0) {
      const latestCommit = response.data[0]
      return {
        sha: latestCommit.sha.substring(0, 7),
        message: latestCommit.commit.message,
        author: latestCommit.commit.author.name,
        date: latestCommit.commit.author.date,
        url: latestCommit.html_url,
      }
    }
    return null
  } catch (error) {
    console.error("Error fetching commits:", error.message)
    return null
  }
}

async function getLatestRelease() {
  try {
    const response = await axios.get(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
      timeout: 10000,
      headers: {
        "User-Agent": "Garden-Tracker-Pro/1.3.0",
        Accept: "application/vnd.github.v3+json",
      },
    })

    if (response.data) {
      return {
        version: response.data.tag_name.replace(/^v/, ""),
        name: response.data.name,
        body: response.data.body,
        publishedAt: response.data.published_at,
        downloadUrl: response.data.zipball_url,
      }
    }
    return null
  } catch (error) {
    console.error("Error fetching releases:", error.message)
    return null
  }
}

function getHostingInfo() {
  const platform = process.env.VERCEL ? "Vercel" : process.env.RENDER ? "Render" : "Local"
  const region = process.env.VERCEL_REGION || process.env.RENDER_REGION || "unknown"
  const environment = process.env.VERCEL_ENV || process.env.NODE_ENV || "development"

  return {
    platform,
    region,
    environment,
    deploymentId: process.env.VERCEL_DEPLOYMENT_ID || process.env.RENDER_SERVICE_ID || "local",
    deploymentUrl: process.env.VERCEL_URL || process.env.RENDER_EXTERNAL_URL || "localhost",
  }
}

function compareVersions(current, latest) {
  const currentParts = current.split(".").map(Number)
  const latestParts = latest.split(".").map(Number)

  for (let i = 0; i < Math.max(currentParts.length, latestParts.length); i++) {
    const currentPart = currentParts[i] || 0
    const latestPart = latestParts[i] || 0

    if (latestPart > currentPart) return 1
    if (latestPart < currentPart) return -1
  }
  return 0
}

async function triggerDeployment(platform, version) {
  // Simulate deployment process
  const steps = [
    "Downloading latest code...",
    "Installing dependencies...",
    "Building application...",
    "Running tests...",
    "Deploying to " + platform + "...",
    "Updating configuration...",
    "Verifying deployment...",
    "Finalizing update...",
  ]

  return new Promise((resolve) => {
    let currentStep = 0
    const interval = setInterval(() => {
      currentStep++
      if (currentStep >= steps.length) {
        clearInterval(interval)
        resolve({
          success: true,
          newVersion: version,
          deploymentUrl: getHostingInfo().deploymentUrl,
        })
      }
    }, 1500)
  })
}

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization")

  if (req.method === "OPTIONS") {
    res.status(200).end()
    return
  }

  try {
    if (req.method === "GET") {
      // Get update information
      const [latestCommit, latestRelease] = await Promise.all([getLatestCommit(), getLatestRelease()])

      const hostingInfo = getHostingInfo()
      const hasUpdate = latestRelease ? compareVersions(CURRENT_VERSION, latestRelease.version) > 0 : false

      // Generate bot challenge
      const challenge = BOT_CHALLENGES[Math.floor(Math.random() * BOT_CHALLENGES.length)]

      res.status(200).json({
        currentVersion: CURRENT_VERSION,
        latestVersion: latestRelease?.version || CURRENT_VERSION,
        hasUpdate,
        latestCommit,
        latestRelease,
        hostingInfo,
        botChallenge: {
          id: Math.random().toString(36).substring(7),
          question: challenge.question,
          // Don't send the answer to client
        },
        challengeAnswer: challenge.answer, // This would normally be stored server-side
      })
    } else if (req.method === "POST") {
      const { action, challengeId, challengeAnswer, confirmUpdate } = req.body

      if (action === "verify-bot") {
        // In a real implementation, you'd store the challenge server-side
        // For demo purposes, we'll accept any reasonable answer
        const isValid = challengeAnswer && challengeAnswer.toString().toLowerCase().length > 0

        res.status(200).json({
          verified: isValid,
          message: isValid ? "Bot verification passed" : "Bot verification failed",
        })
        return
      }

      if (action === "deploy-update" && confirmUpdate) {
        const latestRelease = await getLatestRelease()
        if (!latestRelease) {
          res.status(404).json({ error: "No release found" })
          return
        }

        const hostingInfo = getHostingInfo()
        const deploymentResult = await triggerDeployment(hostingInfo.platform, latestRelease.version)

        res.status(200).json({
          success: true,
          message: "Update deployed successfully",
          oldVersion: CURRENT_VERSION,
          newVersion: latestRelease.version,
          deployment: deploymentResult,
          hostingInfo,
        })
      } else {
        res.status(400).json({ error: "Invalid action or missing confirmation" })
      }
    } else {
      res.status(405).json({ error: "Method not allowed" })
    }
  } catch (error) {
    console.error("Update API Error:", error)
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    })
  }
}
