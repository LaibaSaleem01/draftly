# Draftly — Collaborative Document Editor

Draftly is a lightweight collaborative document editor built with React, TypeScript, TipTap, and Supabase.

## Live Demo
https://draftly-ten-kappa.vercel.app

## Features
- User sign-up and login
- Create, edit, rename, and delete documents
- Rich-text formatting: bold, italic, underline, headings, bullet lists, and numbered lists
- Import `.txt` and `.md` files
- Automatic document persistence using Supabase
- Share documents with other users
- Viewer and editor permissions
- Separate owned and shared document sections

## Tech Stack
- React
- TypeScript
- Vite
- TipTap
- Supabase (Authentication, PostgreSQL, Row Level Security)
- Vercel

## Run Locally

1. Clone the repository:

   ```bash
   git clone https://github.com/LaibaSaleem01/draftly.git
   cd draftly
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a `.env` file in the project root:

   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_publishable_key
   ```

4. Start the development server:

   ```bash
   npm run dev
   ```

5. Create a production build:

   ```bash
   npm run build
   ```

## File Import Support
Draftly currently supports `.txt` and `.md` files.

## Architecture and AI Workflow
See:
- `ARCHITECTURE.md`
- `AI_WORKFLOW.md`

## Source Code
https://github.com/LaibaSaleem01/draftly