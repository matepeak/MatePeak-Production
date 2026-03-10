# Contributing to MatePeak

Thank you for your interest in contributing to MatePeak! This document provides guidelines and instructions for contributing to the project.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Style](#code-style)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Testing](#testing)
- [Documentation](#documentation)

## 📜 Code of Conduct

We are committed to providing a welcoming and inspiring community for all. Please be respectful and constructive in all interactions.

### Our Standards

- ✅ Use welcoming and inclusive language
- ✅ Be respectful of differing viewpoints
- ✅ Accept constructive criticism gracefully
- ✅ Focus on what's best for the community
- ❌ Use of sexualized language or imagery
- ❌ Trolling, insulting comments, or personal attacks
- ❌ Public or private harassment

## 🚀 Getting Started

### Prerequisites

- Node.js v18+ and npm v9+
- Git installed
- Supabase account (for backend features)
- Code editor (VS Code recommended)

### Setup Development Environment

```bash
# 1. Fork the repository on GitHub

# 2. Clone your fork
git clone https://github.com/YOUR_USERNAME/MatePeak.git
cd MatePeak

# 3. Add upstream remote
git remote add upstream https://github.com/iteshprajapati/MatePeak.git

# 4. Install dependencies
npm install

# 5. Copy environment variables
cp .env.example .env
# Edit .env with your Supabase credentials

# 6. Start development server
npm run dev
```

## 💻 Development Workflow

### Branching Strategy

We follow a simplified Git Flow:

- `main` - Production-ready code
- `develop` - Integration branch for features
- `feature/*` - New features
- `bugfix/*` - Bug fixes
- `hotfix/*` - Urgent production fixes

### Creating a Feature Branch

```bash
# Update your local repository
git checkout main
git pull upstream main

# Create feature branch
git checkout -b feature/your-feature-name

# Work on your feature
# ... make changes ...

# Commit your changes
git add .
git commit -m "feat: add your feature"

# Push to your fork
git push origin feature/your-feature-name
```

## 🎨 Code Style

### TypeScript/React

- Use **TypeScript** for all new code
- Follow **React best practices** and hooks patterns
- Use **functional components** (no class components)
- Prefer **const** over let, avoid var
- Use **async/await** instead of promises where possible

### Naming Conventions

```typescript
// Components: PascalCase
const MentorDashboard = () => { ... }

// Functions/variables: camelCase
const fetchMentorData = () => { ... }
const isLoading = false;

// Constants: UPPER_SNAKE_CASE
const API_ENDPOINT = 'https://api.example.com';

// Interfaces/Types: PascalCase with I prefix for interfaces
interface IUser { ... }
type UserRole = 'student' | 'mentor' | 'admin';

// Files: kebab-case
mentor-dashboard.tsx
use-mentor-data.ts
```

### Component Structure

```typescript
// 1. Imports
import { useState } from 'react';
import { Button } from '@/components/ui/button';

// 2. Types/Interfaces
interface ComponentProps {
  title: string;
}

// 3. Component
export const Component = ({ title }: ComponentProps) => {
  // 4. Hooks
  const [state, setState] = useState(false);
  
  // 5. Event handlers
  const handleClick = () => { ... };
  
  // 6. Render
  return <div>{title}</div>;
};
```

### Formatting

We use **Prettier** and **ESLint**:

```bash
# Lint code
npm run lint

# Auto-fix issues
npm run lint -- --fix
```

## 📝 Commit Guidelines

We follow **Conventional Commits** specification:

### Commit Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation only
- `style` - Code style (formatting, missing semicolons)
- `refactor` - Code refactoring
- `perf` - Performance improvements
- `test` - Adding tests
- `chore` - Maintenance tasks
- `ci` - CI/CD changes

### Examples

```bash
feat(auth): add social login with Google

fix(booking): resolve timezone issue in calendar

docs(readme): update installation instructions

refactor(dashboard): simplify mentor statistics logic

test(api): add unit tests for booking service
```

## 🔄 Pull Request Process

### Before Submitting

- ✅ Run tests and ensure they pass
- ✅ Run linter and fix issues
- ✅ Update documentation if needed
- ✅ Add tests for new features
- ✅ Ensure your code builds successfully
- ✅ Rebase on latest main branch

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
How has this been tested?

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] No new warnings generated
- [ ] Tests added/updated
- [ ] Tests passing
```

### Review Process

1. Submit PR with descriptive title and description
2. Automated checks will run (linting, tests)
3. Maintainers will review your code
4. Address feedback and make requested changes
5. Once approved, maintainer will merge

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage
```

### Writing Tests

```typescript
import { render, screen } from '@testing-library/react';
import { MentorCard } from './MentorCard';

describe('MentorCard', () => {
  it('renders mentor name correctly', () => {
    render(<MentorCard name="John Doe" />);
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });
});
```

## 📚 Documentation

### Code Comments

- Add JSDoc comments for functions
- Explain **why**, not what
- Keep comments up-to-date

```typescript
/**
 * Calculates mentor earnings after platform commission
 * @param totalAmount - Total booking amount
 * @param commissionRate - Platform commission (default 10%)
 * @returns Net earnings for the mentor
 */
export const calculateMentorEarnings = (
  totalAmount: number,
  commissionRate = 0.1
): number => {
  return totalAmount * (1 - commissionRate);
};
```

### Documentation Files

Update relevant documentation in `docs/` when:
- Adding new features
- Changing API endpoints
- Modifying database schema
- Updating deployment process

## 🐛 Reporting Bugs

### Bug Report Template

```markdown
**Describe the bug**
A clear description of the bug

**To Reproduce**
Steps to reproduce:
1. Go to '...'
2. Click on '...'
3. See error

**Expected behavior**
What you expected to happen

**Screenshots**
If applicable, add screenshots

**Environment**
- OS: [e.g. Windows 11]
- Browser: [e.g. Chrome 120]
- Version: [e.g. 1.0.0]

**Additional context**
Any other relevant information
```

## 💡 Feature Requests

### Feature Request Template

```markdown
**Is your feature request related to a problem?**
A clear description of the problem

**Describe the solution you'd like**
What you want to happen

**Describe alternatives you've considered**
Alternative solutions or features

**Additional context**
Any other relevant information, mockups, or examples
```

## 📞 Questions?

- Open a [GitHub Discussion](https://github.com/iteshprajapati/MatePeak/discussions)
- Check existing [Issues](https://github.com/iteshprajapati/MatePeak/issues)
- Read the [Documentation](./docs/INDEX.md)

---

Thank you for contributing to MatePeak! 🎉
