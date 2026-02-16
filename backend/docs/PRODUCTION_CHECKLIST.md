# Production Readiness Checklist

This document outlines the necessary steps and configurations before deploying the Hotel PMS to a production environment.

## Licensing
- [ ] **MediatR License Key**: Ensure a valid LuckyPennySoftware MediatR license key is configured.
  - The app looks for the license key in the configuration.
  - Environment variable: `MEDIATR_LICENSE_KEY=your_key_here`

## Security
- [ ] **HTTPS Certificates**: Use valid CA-signed certificates.
- [ ] **Secrets Management**: Use Azure Key Vault, AWS Secrets Manager, or equivalent for production secrets (connection strings, JWT keys).
- [ ] **CORS Policy**: Restrict allowed origins to production domains only.

## Performance
- [ ] **Database Indexing**: Verify all query patterns are supported by appropriate indexes.
- [ ] **Logging**: Set log levels appropriately (e.g., `Information` or `Warning` instead of `Debug`).
