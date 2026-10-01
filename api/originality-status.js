module.exports = (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed. Use GET.' });
  res.setHeader('Cache-Control', 'no-store');
  return res.json({ configured: Boolean(process.env.BRAVE_SEARCH_API_KEY) });
};
