# Draftly — Architecture

## 1. Overview
Draftly is a lightweight collaborative document editor built using React, TypeScript, Vite, TipTap, and Supabase.

## 2. Technology Stack
- **Frontend:** React, TypeScript, Vite
- **Rich-text editor:** TipTap
- **Backend and database:** Supabase and PostgreSQL
- **Authentication:** Supabase Auth
- **Deployment:** Vercel
- **Source control:** GitHub

## 3. Application Architecture

### Frontend
The React application provides the dashboard, document management interface, authentication screens, and rich-text editor.

### Authentication
Supabase Auth handles user registration and login and provides authenticated user sessions.

### Document Storage
Document content and metadata are stored in Supabase, allowing users to save, reopen, and continue editing their documents.

### Sharing and Access Control
Document owners can share documents with other users and assign viewer or editor permissions. Supabase Row Level Security policies enforce access restrictions.

## 4. Main Application Flow
1. Users register or log in.
2. The dashboard displays owned and shared documents.
3. Users create, open, edit, rename, or delete documents.
4. TipTap handles rich-text formatting.
5. Documents are persisted in Supabase.
6. Users can import `.txt` and `.md` files.
7. Owners can share documents with viewer or editor permissions.

## 5. Security
Supabase authentication and Row Level Security policies control access to documents and sharing operations. The Supabase publishable key is used through environment configuration.

## 6. Deployment
The application is deployed through Vercel and connected to its GitHub repository.