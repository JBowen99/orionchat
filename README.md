# Welcome to Orion Chat!

An Open Source AI Chat App

## Features

- Model select
- Themes
- Context management
- Context preview sidebar
- Message retry, message editing, branch chats, shared chats
- Supabase for online sync and Dexie.js for local cache

## Tech Stack

- React Router v7 in framework mode
- Shadcn + Tailwind for components and styling
- Supabase for database and authentication
- Dexie.js for caching

## Getting Started

### Installation

Clone the repo:

```bash
git clone https://github.com/JBowen99/orionchat.git
```

Navigate inside the repository and install the dependencies:

```bash
npm install
```

### Supabase setup

Setup your Supbase Project
Go to the SQL editor and run the setup script.
Copy the url and anon key to the .env file, refer to the .env.example.

You're ready to start the server

### API Keys

Once you start the server, go to the settings page and add your api keys.
Keys are stored encrypted on your machine locally. They are not stored online.

### Development

Start the development server:

```bash
npm run dev
```

Your application will be available at `http://localhost:3000`.

## Building for Production

Create a production build:

```bash
npm run build
```

## Deployment

The project is setup for deployment to Netlify. You'll need a different adapter to use it with Vercel or other hosting platforms.

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/remix-run/react-router-templates&create_from_path=netlify)

---
