# JF Dental Care API

TypeScript and Express API for JF Dental Care.

## Local setup

1. Copy `.env.example` to `.env` and replace every placeholder.
2. Install dependencies with `npm install`.
3. Run database migrations with `npm run migrate:up`.
4. Create the first practice owner with `npm run bootstrap:owner`.
5. Create the technical support account with `npm run bootstrap:tech-support`.
6. Start the API with `npm start`.

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

## Technical support account

`TECH_SUPPORT` is a reserved system role. Owners and other authenticated users
cannot assign it through the API. The account is created only through the
secure `npm run bootstrap:tech-support` command using these variables:

```text
TECH_SUPPORT_USERNAME
TECH_SUPPORT_PASSWORD
```

Only one technical support account may exist. It is displayed as `Technical
Support`, receives a temporary password that expires after 24 hours, and must
replace that password at first login.

`PEPPER` must be a long, stable secret. Changing its value makes existing
password hashes impossible to verify. The misspelled legacy variable `PAPPER`
is temporarily accepted for compatibility, but new environments must use
`PEPPER`.

`POSTGRES_PORT` can point migrations to an isolated local PostgreSQL instance,
so testing does not require changing or stopping another database server.

## Authentication

The compatible login endpoint remains `POST /login`. The canonical endpoint is
`POST /api/auth/login`. Administrative user routes require both a valid bearer
token and an authorized role.

Supported roles are `OWNER`, `MANAGER`, `TECH_SUPPORT`, and `TESTER`. The legacy
`ADMIN` role remains temporarily supported so existing production users can
sign in while their accounts are migrated.
