// /api/health.js — simple warm-up/health endpoint
export default function handler(_req, res) {
  return res.status(200).send("OK");
}
