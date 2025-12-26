# WTGT UI - TypeScript React App

A modern, theme-aware React application for synchronized media watching with real-time collaboration features.

## 🚀 Features

- **React 18** with **TypeScript** for type safety
- **Tailwind CSS** with custom color configuration
- **Dark Mode** (Black & Cyan) and **Light Mode** (Pink & White) themes
- **React Router** for navigation
- **6+ Custom Colors** in both dark and light modes
- Responsive design with grid layouts
- Real-time chat and room management UI

## 📁 Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── Layout.tsx      # Main layout wrapper
│   ├── ThemeToggle.tsx # Theme switcher button
│   └── index.ts        # Component exports
├── context/            # React Context providers
│   └── ThemeContext.tsx # Theme state management
├── pages/              # Page components
│   ├── Landing.tsx     # Login/Register page
│   ├── Dashboard.tsx   # Room browser
│   ├── Room.tsx        # Active room with player & chat
│   ├── AdminPanel.tsx  # Admin dashboard
│   ├── Settings.tsx    # User preferences
│   ├── NotFound.tsx    # 404 page
│   └── index.ts        # Page exports
├── types.ts            # TypeScript interfaces
├── App.tsx             # Router setup
├── main.tsx            # Entry point
└── index.css           # Tailwind directives
```

## 🎨 Color Scheme

### Dark Mode (Default)

- **Primary**: Cyan (`#06b6d4`)
- **Background**: Black (`#0a0a0a`)
- **Accents**: Purple, Blue, Orange
- **Borders**: Dark Gray (`#2a2a2a`)

### Light Mode

- **Primary**: Pink (`#ec4899`)
- **Background**: White (`#ffffff`)
- **Accents**: Rose, Indigo, Amber
- **Borders**: Light Gray (`#e5e7eb`)

### Shared Colors

- **Gray**: Different shades for text and borders in each mode
- **6+ Total Colors**: Cyan, Purple, Blue, Orange (Dark) + Pink, Rose, Indigo, Amber (Light)

## 🛠 Setup & Installation

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 📦 Dependencies

- **react-router-dom**: Client-side routing
- **tailwindcss**: Utility-first CSS framework
- **postcss & autoprefixer**: CSS processing

## 🎯 Pages

| Page        | Route           | Purpose                                |
| ----------- | --------------- | -------------------------------------- |
| Landing     | `/`             | Login/Register entry point             |
| Dashboard   | `/dashboard`    | Browse and create rooms                |
| Room        | `/room/:roomId` | Active room with media player and chat |
| Settings    | `/settings`     | User profile and theme preferences     |
| Admin Panel | `/admin`        | Server monitoring and logs             |
| NotFound    | `*`             | 404 error page                         |

## 🌓 Theme System

The theme system uses React Context to manage dark/light mode state:

```tsx
import { useTheme } from "./context/ThemeContext";

function MyComponent() {
  const { isDark, theme, toggleTheme } = useTheme();
  // isDark: boolean
  // theme: 'dark' | 'light'
  // toggleTheme: () => void
}
```

Theme preference is persisted in `localStorage`.

## 🎨 Tailwind Configuration

Custom colors are defined in `tailwind.config.ts`:

```typescript
colors: {
  dark: {
    bg: '#0a0a0a',
    card: '#1a1a1a',
    border: '#2a2a2a',
  },
  cyan: { primary: '#06b6d4', light: '#22d3ee', dark: '#0891b2' },
  // ... more colors
}
```

Use colors in classes:

```tsx
<div className="bg-dark-bg dark:text-cyan-primary">Dark mode content</div>
```

## 🚀 Development

The app uses Vite for fast development with HMR (Hot Module Replacement).

### Environment

- Node.js 16+
- npm 7+

### Building

```bash
# Development
npm run dev

# Production
npm run build

# Type checking
tsc --noEmit
```

## 📝 TypeScript Types

All data structures are typed in `types.ts`:

- `ThemeContextType`: Theme state
- `User`, `UserProfile`: User data
- `Room`, `RoomMember`: Room data
- `Message`: Chat messages
- `ServerLog`, `ServerStats`: Admin data
- `ApiResponse`, `PaginatedResponse`: API responses

## 🔐 Future Features

- WebSocket integration with backend server
- User authentication
- Real-time room synchronization
- File upload for media
- User profiles and avatars
- Admin authentication and controls
- Notification system
- Message history persistence

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(["dist"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ["./tsconfig.node.json", "./tsconfig.app.json"],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
]);
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from "eslint-plugin-react-x";
import reactDom from "eslint-plugin-react-dom";

export default defineConfig([
  globalIgnores(["dist"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs["recommended-typescript"],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ["./tsconfig.node.json", "./tsconfig.app.json"],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
]);
```
