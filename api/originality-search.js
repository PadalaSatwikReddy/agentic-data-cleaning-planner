const { searchWebForPassages } = require('../backend/services/webSearchService');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
  try {
    const { passages } = req.body || {};
    if (!Array.isArray(passages) || passages.length > 8 || passages.some(passage => typeof passage !== 'string' || passage.length > 1500)) {
      return res.status(400).json({ error: 'Requires up to 8 text passages, each at most 1,500 characters.' });
    }
    const clientId = req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || 'unknown';
    const result = await searchWebForPassages(passages, String(clientId).split(',')[0].trim());
    return res.json({ success: true, ...result });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, error: error.message });
  }
};

module.exports.config = { maxDuration: 30 };
