export default async function handler(req, res) {
  try {
    const { default: app } = await import('../server.js');
    return app(req, res);
  } catch (err) {
    console.error("Vercel Startup Error:", err);
    res.status(500).json({
      error: "STARTUP_CRASH",
      message: err.message,
      stack: err.stack,
    });
  }
}
