const express = require("express")
const path = require("path")
const { createProxyMiddleware } = require("http-proxy-middleware")
const app = express()

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, "public")))

// Proxy API requests to the API handlers
app.use(
  "/api",
  createProxyMiddleware({
    target: "http://localhost:3000",
    router: {
      "/api/data": "http://localhost:3000/api/data",
      "/api/health": "http://localhost:3000/api/health",
    },
    pathRewrite: {
      "^/api/data": "/api/data",
      "^/api/health": "/api/health",
    },
    changeOrigin: true,
  }),
)

// Serve index.html for all other routes
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"))
})

// Start the server
const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`🌱 Garden Tracker Server running on http://localhost:${PORT}`)
  console.log(`📊 Render-compatible server started`)
})
