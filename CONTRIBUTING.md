# Contributing to OpenSafe

Thank you for your interest in contributing to OpenSafe! This document provides guidelines and information for contributors.

## Code of Conduct

We are committed to providing a welcoming and inclusive environment. Please read and follow our [Code of Conduct](CODE_OF_CONDUCT.md).

## Getting Started

### Prerequisites
- Node.js 18+
- TypeScript 5.3+
- Rust 1.70+
- PostgreSQL 15+
- Redis 7+
- Docker (optional)

### Development Setup

1. **Fork and Clone**
   ```bash
   git clone https://github.com/yourusername/OpenSafe.git
   cd OpenSafe
   ```

2. **Install Dependencies**
   ```bash
   npm install
   cd native && cargo build --release && cd ..
   ```

3. **Setup Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Run Tests**
   ```bash
   npm test
   ```

## Development Workflow

### Branch Strategy
- `main` - Production-ready code
- `develop` - Integration branch for features
- `feature/*` - Feature development
- `hotfix/*` - Critical bug fixes
- `release/*` - Release preparation

### Commit Convention
We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

**Types:**
- `feat` - New features
- `fix` - Bug fixes
- `docs` - Documentation changes
- `style` - Code style changes
- `refactor` - Code refactoring
- `test` - Test additions/changes
- `chore` - Build/tooling changes
- `perf` - Performance improvements
- `security` - Security fixes

**Examples:**
```bash
git commit -m "feat(safety): add constitutional AI principle validation"
git commit -m "fix(api): resolve memory leak in stream processing"
git commit -m "docs: update API documentation for safety endpoints"
```

## Pull Request Process

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```

2. **Make Changes**
   - Write clean, documented code
   - Add comprehensive tests
   - Update documentation

3. **Test Your Changes**
   ```bash
   npm test
   npm run lint
   npm run type-check
   ```

4. **Commit and Push**
   ```bash
   git add .
   git commit -m "feat: add amazing feature"
   git push origin feature/amazing-feature
   ```

5. **Create Pull Request**
   - Use the PR template
   - Provide clear description
   - Link related issues
   - Add screenshots if UI changes

### PR Requirements
- [ ] Tests pass (`npm test`)
- [ ] Linting passes (`npm run lint`)
- [ ] TypeScript compiles (`npm run type-check`)
- [ ] Documentation updated
- [ ] Change log entry added
- [ ] No security vulnerabilities
- [ ] Performance impact assessed

## Testing Guidelines

### Test Structure
```
tests/
├── unit/           # Unit tests
├── integration/    # Integration tests
├── e2e/           # End-to-end tests
└── load/          # Load/performance tests
```

### Writing Tests
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)
- Mock external dependencies
- Test edge cases and error conditions

```typescript
describe('SafetyAnalyzer', () => {
  it('should detect harmful content with high confidence', async () => {
    // Arrange
    const analyzer = new SafetyAnalyzer();
    const harmfulText = "Content with harmful intent";
    
    // Act
    const result = await analyzer.analyze(harmfulText);
    
    // Assert
    expect(result.safe).toBe(false);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0].confidence).toBeGreaterThan(0.8);
  });
});
```

## Documentation Standards

### Code Documentation
- Use TSDoc for TypeScript
- Use Rustdoc for Rust
- Document public APIs
- Include examples

```typescript
/**
 * Analyzes text content for safety violations
 * @param text - The text content to analyze
 * @param options - Analysis configuration options
 * @returns Promise resolving to safety analysis result
 * @example
 * ```typescript
 * const result = await analyzer.analyze("Hello world", {
 *   mode: 'comprehensive'
 * });
 * ```
 */
async analyze(text: string, options?: AnalysisOptions): Promise<SafetyResult>
```

### API Documentation
- Update OpenAPI specs
- Include request/response examples
- Document error conditions
- Provide curl examples

## Security Guidelines

### Security Best Practices
- Never commit secrets
- Use environment variables
- Validate all inputs
- Sanitize outputs
- Follow OWASP guidelines

### Reporting Vulnerabilities
Report security issues to: security@opensafe.ai

**Do not** create public issues for security vulnerabilities.

## Areas for Contribution

### High Priority
- [ ] Performance optimizations
- [ ] Additional safety detection algorithms
- [ ] Mobile SDK development
- [ ] Multi-language support

### Medium Priority
- [ ] Dashboard UI improvements
- [ ] Documentation enhancements
- [ ] Test coverage improvements
- [ ] CI/CD optimizations

### Beginner Friendly
- [ ] Code style improvements
- [ ] Documentation fixes
- [ ] Test additions
- [ ] Example applications

## Labels and Issues

### Issue Labels
- `bug` - Something isn't working
- `enhancement` - New feature request
- `documentation` - Documentation improvements
- `good first issue` - Good for newcomers
- `help wanted` - Extra attention needed
- `priority:high` - High priority items
- `security` - Security-related issues

### Issue Templates
Use the provided templates for:
- Bug reports
- Feature requests
- Documentation improvements
- Security reports

## Release Process

### Version Strategy
We use [Semantic Versioning](https://semver.org/):
- `MAJOR.MINOR.PATCH`
- Breaking changes increment MAJOR
- New features increment MINOR
- Bug fixes increment PATCH

### Release Checklist
- [ ] Update version numbers
- [ ] Update CHANGELOG.md
- [ ] Run full test suite
- [ ] Security audit
- [ ] Performance benchmarks
- [ ] Documentation review
- [ ] Release notes

## Performance Guidelines

### Benchmarks
- Safety analysis: <50ms p95
- API responses: <100ms p95
- Memory usage: <500MB baseline
- Test coverage: >90%

### Profiling
```bash
# Performance profiling
npm run benchmark

# Memory profiling
npm run profile:memory

# Load testing
npm run test:load
```

## Development Tools

### Recommended Extensions (VS Code)
- TypeScript Importer
- ESLint
- Prettier
- Rust Analyzer
- GitLens
- Docker

### Useful Commands
```bash
# Development server with hot reload
npm run dev

# Build production version
npm run build

# Run specific test suites
npm run test:unit
npm run test:integration

# Lint and format
npm run lint
npm run format

# Type checking
npm run type-check

# Database operations
npm run migrate
npm run seed
```

## Getting Help

### Communication Channels
- **Discord**: [AI Security Community](https://discord.gg/aisecurity)
- **GitHub Discussions**: For technical questions
- **Issues**: For bug reports and feature requests
- **Email**: dev@opensafe.ai

### Mentorship
New contributors can request mentorship from maintainers. We're here to help!

## Recognition

Contributors are recognized in:
- CONTRIBUTORS.md file
- Release notes
- Monthly contributor highlights
- Conference speaking opportunities

## Resources

### Learning Materials
- [AI Safety Fundamentals](https://aisafety.com)
- [TypeScript Handbook](https://typescriptlang.org)
- [Rust Book](https://doc.rust-lang.org/book/)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)

### Technical References
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Constitutional AI Paper](https://arxiv.org/abs/2212.08073)
- [Anthropic Safety Research](https://www.anthropic.com/research)

Thank you for contributing to making AI more secure! 