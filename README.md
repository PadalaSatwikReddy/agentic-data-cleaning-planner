# Agentic Data Cleaning Planner

A modern, minimal web application for autonomous, safe data cleaning and transformation planning.

## Features
- **Clean, Minimal UI**: Google-style direct multiline text input with 3-column upload cards for Excel, Word, and PowerPoint.
- **Explainable Cleaning Plan**: Review detected anomalies, data type normalizations, and confidence scores.
- **Safe Operations**: Human review for uncertain fields and instant one-click rollback availability.
- **Interactive Workflows**: Upload spreadsheets/documents or paste messy records directly for multi-pass audits.

## Deployment
Deployed on Vercel and version-controlled via GitHub.

### Public web similarity search
- Create a Brave Search API key and configure it as `BRAVE_SEARCH_API_KEY` in the Vercel project's server-side Environment Variables (Production and Preview as needed). Never put this key in browser code or commit it.
- The search is opt-in. With consent, up to eight selected paper passages are sent to Brave Search. The app compares returned indexed excerpts and displays source links; it does not crawl full websites or search private subscription databases.
- A match is a similarity lead for researcher review, not a plagiarism verdict. Search coverage and snippets are incomplete.
- Local development: put the key in `.env` and restart `npm run dev`. `.env` is ignored by Git.
- The API applies a best-effort per-process limit of four checks per minute per client. Configure platform-level rate limiting and spending alerts before making a paid provider key available on a public deployment, because serverless in-memory limits are not global.
