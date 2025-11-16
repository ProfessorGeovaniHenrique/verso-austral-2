# Welcome to your Lovable project

<!-- Badges de Status - Atualizados em tempo real -->
[![Quality Gate](https://github.com/your-username/your-repo/workflows/Quality%20Gate/badge.svg)](https://github.com/your-username/your-repo/actions/workflows/pre-deployment-check.yml)
[![Test Corpus](https://github.com/your-username/your-repo/workflows/Test%20Corpus/badge.svg)](https://github.com/your-username/your-repo/actions/workflows/test-corpus-integrity.yml)
[![Auto Version](https://github.com/your-username/your-repo/workflows/Auto%20Version/badge.svg)](https://github.com/your-username/your-repo/actions/workflows/auto-version.yml)
[![Update Badges](https://github.com/your-username/your-repo/workflows/Update%20Badges/badge.svg)](https://github.com/your-username/your-repo/actions/workflows/update-badges.yml)

<!-- Badges de Métricas - Via shields.io endpoint -->
[![Version](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/your-username/your-repo/main/public/badges/version.json)](https://github.com/your-username/your-repo/releases)
[![Tests](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/your-username/your-repo/main/public/badges/tests.json)](https://github.com/your-username/your-repo/actions)
[![Coverage](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/your-username/your-repo/main/public/badges/coverage.json)](https://github.com/your-username/your-repo)
[![Corpus](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/your-username/your-repo/main/public/badges/corpus.json)](https://github.com/your-username/your-repo)

<!-- Badges Estáticos -->
[![Semantic Versioning](https://img.shields.io/badge/semver-2.0.0-blue?logo=semanticrelease)](https://semver.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue?logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3+-61DAFB?logo=react)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.0+-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)
[![Vite](https://img.shields.io/badge/Vite-5.0+-646CFF?logo=vite)](https://vitejs.dev/)

## Project info

**URL**: https://lovable.dev/projects/fc1bf733-4b9c-4a2a-a7f4-ecf8aa116226

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/fc1bf733-4b9c-4a2a-a7f4-ecf8aa116226) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/fc1bf733-4b9c-4a2a-a7f4-ecf8aa116226) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)

## 🔢 Versioning

This project uses **Semantic Versioning 2.0.0** with automatic version bumping based on commit types:

- `feat:` → Minor version (0.x.0)
- `fix:` → Patch version (0.0.x)
- `feat!:` or `BREAKING CHANGE` → Major version (x.0.0)

Current version: See [VERSION](VERSION) file or [Releases](https://github.com/your-username/your-repo/releases)

Read more: [Version Guide](.github/VERSION_GUIDE.md)

## 🎨 Badges & Metrics

The badges at the top of this README are **updated in real-time**:

- **Workflow Badges**: Updated automatically by GitHub Actions
- **Metric Badges**: Generated daily and on every push via custom endpoint
- **Static Badges**: Show technology stack and standards

To update badges manually:
```bash
npm run badge:generate
```

Read more: [Badges Documentation](public/badges/README.md)
