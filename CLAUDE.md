# MCP Career Intelligence Platform - Development Guide

## PROJECT OVERVIEW
This is Mark Cena's career intelligence platform - a dual-interface system demonstrating backend engineering capabilities for Calgary tech market positioning. The system serves both personal career optimization and portfolio presentation.

**Architecture:** Custom MCP server connecting to Notion API, serving both Claude.ai integration and public portfolio API.

**Strategic Goal:** Differentiate from typical CS student projects by building production-grade developer tools that solve real problems.

## TECHNICAL STACK & STANDARDS

### Core Technologies
- **Backend:** Node.js/TypeScript (MCP server + REST API)
- **Frontend:** Next.js with TypeScript, Tailwind CSS
- **Database:** Notion API (primary data source)
- **Containerization:** Docker for development and production
- **Testing:** Jest, Supertest, React Testing Library
- **Deployment:** Docker containers on Render (backend) + Vercel (frontend)

### Code Quality Standards
```typescript
// Always use TypeScript with strict mode
// Prefer explicit typing over 'any'
// Use meaningful variable names (not abbreviated)
// Include comprehensive error handling
// Add JSDoc comments for complex functions

interface NotionCareerData {
  initiatives: Initiative[];
  achievements: Achievement[];
  tasks: Task[];
}
```

### Architecture Principles
1. **Separation of Concerns:** MCP server handles Notion integration, REST API serves public portfolio
2. **Error Resilience:** Graceful degradation when Notion API is unavailable
3. **Performance First:** Implement caching, connection pooling, and query optimization
4. **Production Ready:** Include logging, monitoring, and proper security practices
5. **Docker Native:** All services containerized for consistent deployment

## CLAUDE CODE GENERATION GUIDELINES

### File Structure Expectations
```
/mcp-career-intelligence/
├── /server/           # MCP protocol implementation
│   ├── src/
│   │   ├── server.ts      # Main MCP server
│   │   ├── notion-client.ts # Notion API wrapper
│   │   ├── handlers/      # MCP tool handlers
│   │   └── types/         # TypeScript definitions
│   ├── Dockerfile
│   └── package.json
├── /portfolio-api/        # Public REST API
│   ├── src/
│   │   ├── app.ts         # Express server
│   │   ├── routes/        # API endpoints
│   │   └── middleware/    # Auth, logging, etc.
│   └── Dockerfile
├── /portfolio-frontend/   # Next.js portfolio site
│   ├── components/
│   ├── pages/
│   └── styles/
└── /shared/              # Common types and utilities
    └── types/
```

### Code Generation Preferences

#### When generating MCP server code:
- Always include comprehensive error handling
- Use structured logging (Winston or similar)
- Implement rate limiting for Notion API calls
- Include proper TypeScript interfaces
- Add JSDoc documentation for all public methods

#### When generating API endpoints:
- Use express-validator for input validation
- Include proper HTTP status codes
- Implement CORS with specific origins
- Add request/response logging middleware
- Use async/await with proper error catching

#### When generating React components:
- Use TypeScript with proper prop interfaces
- Implement loading and error states
- Follow accessibility best practices (ARIA labels, semantic HTML)
- Use Tailwind classes for styling (no custom CSS)
- Include proper SEO meta tags for portfolio pages

### Specific Implementation Requirements

#### Notion Integration:
```typescript
// Always structure Notion queries like this:
const queryNotionDatabase = async (databaseId: string, filter?: any) => {
  try {
    const response = await notion.databases.query({
      database_id: databaseId,
      filter,
      sorts: [{ timestamp: 'created_time', direction: 'descending' }]
    });
    return response.results;
  } catch (error) {
    logger.error('Notion query failed', { databaseId, error });
    throw new APIError('Failed to fetch career data', 500);
  }
};
```

#### Docker Configuration:
- Use multi-stage builds for optimization
- Include health checks in containers
- Set up proper environment variable handling
- Configure non-root user for security

#### Testing Strategy:
- Unit tests for all business logic
- Integration tests for Notion API interactions  
- API endpoint testing with supertest
- React component testing with Testing Library
- Mock Notion API responses in tests

## CONTEXT FOR AI RESPONSES

### Mark's Background
- CS student (3.7 GPA, graduating 2026) at University of Calgary
- Current: Power Platform Developer Intern at Intelbyte Corp
- Previous: Grey Bruce Plumbing (React/TypeScript), GEOPSI (C#/.NET)
- Target: Backend engineering roles in Calgary tech ecosystem

### Career Data Structure (Notion)
**Initiatives Database:** Current career development activities
- Properties: Name, Type, Priority, Status, lookup to related achievements table, lookup to tasks table, date started and completed
- Relations: Connected to Tasks and Achievements

**Achievements Database:** Comprehensive accomplishment record
- Properties: Achievement, Date, Description, Skills Used, Category, lookup to related initiative
- Categories: Technical/SWE, Business/Leadership, Academic, Networking

**Tasks Database:** Action items for career development
- Properties: Task, Status, Priority, Related Initiative, due date, tags

### Business Context
This isn't just a portfolio project - it's a technical differentiator designed to position Mark as someone who builds developer tools and systems-level solutions. Every architectural decision should reinforce backend engineering capabilities.

## CODING ASSISTANCE OPTIMIZATION

### When I ask for code generation:
1. **Assume production environment** - include error handling, logging, security
2. **Follow established patterns** - use the file structure and coding standards above
3. **Include comprehensive examples** - don't generate incomplete snippets
4. **Add explanatory comments** - especially for complex business logic
5. **Consider performance** - implement caching, optimization where appropriate

### For debugging assistance:
1. **Focus on root cause analysis** - not just quick fixes
2. **Suggest testing strategies** - how to prevent similar issues
3. **Consider production implications** - monitoring, logging, user impact

### For architecture decisions:
1. **Explain trade-offs** - why one approach over another
2. **Consider Calgary market** - technologies that employers prefer
3. **Think long-term** - maintainability and extensibility

## PROJECT CONSTRAINTS

- **Timeline:** 30-day development cycle with quality focus
- **Learning Goals:** Docker integration, comprehensive testing, production practices
- **No Shortcuts:** Use proper tooling even if more complex (Docker vs simple deployment)
- **Documentation First:** Technical blog posts and case studies throughout development
- **Portfolio Ready:** Every component should demonstrate senior-level engineering thinking

## SUCCESS METRICS

**Technical Excellence:**
- Comprehensive test coverage (>80%)
- Production-ready error handling and logging
- Docker containerization with proper security
- Performance optimization (API response times <500ms)

**Career Positioning:**
- Demonstrates backend engineering capabilities beyond typical student work
- Shows systems thinking and developer tool building experience
- Creates compelling interview talking points and technical presentations

When generating code for this project, always consider: "Does this demonstrate the level of engineering sophistication that Calgary tech companies expect from backend developers?"