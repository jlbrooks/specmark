const SAMPLE_MARKDOWN = `# Project Specification

## Overview

This document outlines the requirements for the new **user authentication system**. The goal is to provide a secure, scalable solution that supports multiple authentication methods.

## Requirements

### Functional Requirements

1. Users must be able to register with email and password
2. Support for OAuth providers (Google, GitHub)
3. Two-factor authentication via SMS or authenticator app
4. Password reset functionality via email

### Non-Functional Requirements

- Response time under 200ms for authentication requests
- Support for 10,000 concurrent users
- 99.9% uptime SLA

## Technical Approach

We will use \`JWT tokens\` for session management with the following structure:

\`\`\`json
{
  "sub": "user-id",
  "exp": 1234567890,
  "roles": ["user", "admin"]
}
\`\`\`

## Timeline

| Phase | Description | Duration |
|-------|-------------|----------|
| Design | Architecture and API design | 2 weeks |
| Implementation | Core authentication logic | 4 weeks |
| Testing | Security audit and QA | 2 weeks |

## Open Questions

- Should we support biometric authentication?
- What is the session timeout policy?
`

export default SAMPLE_MARKDOWN
