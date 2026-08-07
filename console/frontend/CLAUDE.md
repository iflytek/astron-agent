# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Starting Development Server

```bash
npm run dev                 # Start development server with hot reload on port 3000
npm run test               # Start test server on localhost
```

### Building the Application

```bash
npm run build              # Production build
npm run build:dev          # Development build
npm run build:test         # Test environment build
npm run build-demo         # Demo environment build
npm run preview            # Preview production build locally
```

### Code Quality & Linting

```bash
npm run lint               # Run ESLint
npm run lint:fix           # Fix ESLint errors automatically
npm run format             # Format code with Prettier
npm run format:check       # Check if code is formatted correctly
npm run type-check         # TypeScript type checking without emitting files
npm run quality            # Run all checks: format, lint, and type-check
```

## Architecture Overview

This is a React TypeScript frontend application built with Vite, serving as a console/admin interface for an AI agent platform. The application follows a modern React architecture with several key patterns:

### Core Technologies

- **Build Tool**: Vite with React plugin
- **UI Framework**: React 18 with TypeScript
- **Component Library**: Ant Design (antd) 5.19.1
- **Routing**: React Router v6 with lazy loading
- **State Management**: Multiple approaches:
  - Zustand for global state
  - Recoil with persistence for some state
  - Local component state with hooks
- **Internationalization**: i18next with browser language detection
- **Authentication**: Casdoor JS SDK for SSO authentication
- **HTTP Client**: Axios with comprehensive interceptors

### Key Architecture Patterns

#### 1. Authentication & Authorization

- Uses Casdoor SDK for SSO authentication with PKCE flow
- Automatic token refresh with JWT expiration handling
- Request interceptors add authentication headers and space/enterprise context
- Multi-environment configuration support (development, test, production)

#### 2. Multi-Space Architecture

The application supports both personal and enterprise (team) spaces:

- **Personal Space**: Individual user workspace
- **Enterprise Space**: Team/organization workspace with enterprise-id context
- Space switching is handled through dedicated hooks and stores
- All API requests automatically include space-id and enterprise-id headers

#### 3. Internationalization

- Supports Chinese (zh) and English (en) locales
- Language detection from browser and localStorage
- Dynamic language switching updates HTTP request headers
- Integrated with Ant Design's locale providers

#### 4. Routing Structure

```
/                          # Root redirects to /home
/home                      # Home page
/management/               # Management section
  ├── bot-api              # Bot API management
  ├── model                # Model management
  └── release              # Release management
/space/                    # Personal space management
/enterprise/:enterpriseId # Enterprise space management
/store/plugin              # Plugin store
/chat/:botId/:version?     # Chat interface
/work_flow/:id/arrange     # Workflow editor
```

#### 5. Component Organization

```
src/
├── components/           # Reusable UI components
├── pages/               # Route-based page components
├── layouts/             # Layout components (sidebar, header)
├── hooks/               # Custom React hooks
├── store/               # State management (Zustand/Recoil stores)
├── services/            # API service layer
├── utils/               # Utility functions
├── config/              # Configuration files
├── locales/             # i18n translations
├── styles/              # Global styles and Sass files
└── types/               # TypeScript type definitions
```

#### 6. HTTP Request Architecture

- Centralized Axios configuration with request/response interceptors
- Automatic token refresh handling
- Request deduplication to prevent duplicate API calls
- Comprehensive error handling with business logic error codes
- Environment-specific base URL configuration
- Support for file downloads with authentication headers

#### 7. State Management Pattern

Multiple stores handle different domains:

- `user-store`: User authentication and profile data
- `space-store`: Current space context (personal/enterprise)
- `enterprise-store`: Enterprise management data
- `global-store`: Global application state
- `chat-store`: Chat interface state
- And specialized stores for specific features

### Development Environment Configuration

#### Environment Files

- `.env.development` - Development environment
- `.env.test` - Test environment
- `.env.production` - Production environment

#### Key Environment Variables

- `CONSOLE_CASDOOR_URL` - Casdoor authentication server URL
- `CONSOLE_CASDOOR_ID` - Casdoor client ID
- `CONSOLE_CASDOOR_APP` - Casdoor application name
- `CONSOLE_CASDOOR_ORG` - Casdoor organization name
- `VITE_BASE_URL` - API base URL
- `CONSOLE_API_URL` - Console API URL override

#### Proxy Configuration

Development server proxies API requests:

- `/xingchen-api` → Backend API server
- `/chat-` → Chat service endpoints
- `/workflow` → Workflow service endpoints

### Code Style & Standards

- Uses ESLint with TypeScript and React plugins
- Prettier for code formatting
- Strict TypeScript configuration with comprehensive type checking
- Path aliases: `@/*` maps to `src/*`

### Key Dependencies

- **Monaco Editor**: Code editing capabilities
- **ReactFlow**: Workflow visualization
- **ECharts**: Data visualization
- **Markdown Rendering**: Multiple markdown processors
- **File Handling**: Excel, image processing, QR codes
- **Crypto**: Encryption utilities for sensitive data

This architecture enables a scalable, maintainable frontend for managing AI agents, workflows, and enterprise collaboration features.
