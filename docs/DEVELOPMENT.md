# Development Guide

## Development Environment Setup

### Prerequisites

- Node.js v16 or higher
- npm or yarn package manager
- Git
- IDE (VS Code recommended)
- Docker (optional)

### Initial Setup

1. Clone the repository:
```bash
git clone https://github.com/your-username/ortak-tg-signaler.git
cd ortak-tg-signaler
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Set up development environment:
```bash
cp .env.example .env
```

4. Configure your IDE:
    - Install recommended extensions
    - Configure ESLint and Prettier
    - Set up debugging configuration

## Project Structure

```
ortak-tg-signaler/
├── src/
│   ├── config/         # Configuration files
│   ├── services/       # Business logic services
│   ├── utils/          # Utility functions
│   ├── types/          # TypeScript type definitions
│   └── index.ts        # Application entry point
├── tests/              # Test files
├── docs/               # Documentation
├── scripts/            # Build and utility scripts
└── package.json        # Project dependencies and scripts
```

## Development Workflow

### Branching Strategy

1. Main branches:
    - `main`: Production-ready code
    - `develop`: Development branch
    - `feature/*`: Feature branches
    - `bugfix/*`: Bug fix branches
    - `release/*`: Release preparation branches

2. Branch naming convention:
    - Feature: `feature/description`
    - Bug fix: `bugfix/issue-number`
    - Release: `release/version`

### Commit Guidelines

Follow conventional commits:
```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Test changes
- `chore`: Build process changes

### Pull Request Process

1. Create a feature branch
2. Make changes
3. Write tests
4. Update documentation
5. Create pull request
6. Code review
7. Merge to develop

## Testing

### Unit Tests

Run unit tests:
```bash
npm run test
# or
yarn test
```

### Integration Tests

Run integration tests:
```bash
npm run test:integration
# or
yarn test:integration
```

### Test Coverage

Generate coverage report:
```bash
npm run test:coverage
# or
yarn test:coverage
```

## Code Quality

### Linting

Run linter:
```bash
npm run lint
# or
yarn lint
```

### Code Formatting

Format code:
```bash
npm run format
# or
yarn format
```

### Type Checking

Check types:
```bash
npm run type-check
# or
yarn type-check
```

## Debugging

### VS Code Configuration

Add to `.vscode/launch.json`:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Program",
      "skipFiles": ["<node_internals>/**"],
      "program": "${workspaceFolder}/src/index.ts"
    }
  ]
}
```

### Debug Commands

1. Start debugger:
```bash
npm run debug
# or
yarn debug
```

2. Attach to process:
```bash
node --inspect src/index.ts
```

## Performance Optimization

### Profiling

1. CPU Profiling:
```bash
node --prof src/index.ts
```

2. Memory Profiling:
```bash
node --inspect src/index.ts
```

### Performance Testing

Run performance tests:
```bash
npm run test:performance
# or
yarn test:performance
```

## Documentation

### Code Documentation

1. Use JSDoc comments:
```typescript
/**
 * Function description
 * @param {string} param1 - Parameter description
 * @returns {Promise<void>} Return description
 */
async function example(param1: string): Promise<void> {
  // Implementation
}
```

2. Update API documentation:
```bash
npm run docs:generate
# or
yarn docs:generate
```

### Architecture Documentation

Keep architecture documentation up to date:
- Update `ARCHITECTURE.md`
- Update sequence diagrams
- Update component diagrams

## Dependency Management

### Adding Dependencies

1. Install new dependency:
```bash
npm install package-name
# or
yarn add package-name
```

2. Update `package.json`:
```json
{
  "dependencies": {
    "package-name": "^1.0.0"
  }
}
```

### Updating Dependencies

1. Check for updates:
```bash
npm outdated
# or
yarn outdated
```

2. Update dependencies:
```bash
npm update
# or
yarn upgrade
```

## Security

### Security Best Practices

1. Regular security audits:
```bash
npm audit
# or
yarn audit
```

2. Dependency scanning:
```bash
npm run security:scan
# or
yarn security:scan
```

### Secure Coding Guidelines

1. Input validation
2. Output encoding
3. Error handling
4. Authentication
5. Authorization
6. Data encryption
7. Secure communication

## Release Process

### Version Management

1. Update version:
```bash
npm version patch|minor|major
# or
yarn version
```

2. Update changelog:
```bash
npm run changelog
# or
yarn changelog
```

### Release Steps

1. Create release branch
2. Update version
3. Update changelog
4. Run tests
5. Build artifacts
6. Create release tag
7. Deploy to production

## Contributing

### Contribution Guidelines

1. Fork the repository
2. Create feature branch
3. Make changes
4. Write tests
5. Update documentation
6. Create pull request

### Code Review Process

1. Self-review
2. Peer review
3. Automated checks
4. Manual testing
5. Documentation review

## Support

### Getting Help

1. Check documentation
2. Search issues
3. Ask in discussions
4. Contact maintainers

### Reporting Issues

1. Use issue template
2. Provide reproduction steps
3. Include error logs
4. Add screenshots if applicable 