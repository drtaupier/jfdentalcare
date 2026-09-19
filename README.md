# JF Dental Care API

TypeScript and Express API for JF Dental Care.

## Local setup

1. Copy `.env.example` to `.env` and replace every placeholder.
2. Install dependencies with `npm install`.
3. Run database migrations with `npm run migrate:up`.
4. Create the first practice owner with `npm run bootstrap:owner`.
5. Start the API with `npm start`.

## First owner account

Migrations create database structure and system roles, but never store account
credentials. The one-time bootstrap command reads the initial owner credentials
from the local environment. It refuses to create a second `OWNER` account and
marks the temporary password for replacement after the first login.

Required variables:

```text
INITIAL_OWNER_USERNAME
INITIAL_OWNER_PASSWORD
INITIAL_OWNER_FIRST_NAME
INITIAL_OWNER_LAST_NAME
```

Never commit `.env` or real credentials.

## Authentication

The compatible login endpoint remains `POST /login`. The canonical endpoint is
`POST /api/auth/login`. Administrative user routes require both a valid bearer
token and an authorized role.

Supported roles are `OWNER`, `MANAGER`, `TECH_SUPPORT`, and `TESTER`. The legacy
`ADMIN` role remains temporarily supported so existing production users can
sign in while their accounts are migrated.
