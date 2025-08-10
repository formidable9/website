// /api/health.js — simple health check (GET)
export default function handler(req, res) {
  return res.status(200).send("OK");
}
