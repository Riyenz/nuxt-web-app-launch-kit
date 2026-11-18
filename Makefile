.PHONY: dev build preview lint lint-fix typecheck test test-unit test-e2e shot storybook storybook-build install clean check check-changed check-all setup help init doctor setup-secrets prisma-generate prisma-migrate prisma-studio prisma-reset prisma-deploy prisma-seed db-local db-local-setup db-local-studio dev-local

# Default target
help: ## Show this help message
	@echo "Available commands:"
	@grep -E '^[a-zA-Z0-9_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

# Initial setup
init: ## Complete project setup (install deps, setup env, init local database)
	@echo "🚀 Starting project setup..."
	@if [ ! -f .env ]; then \
		echo "📝 Creating .env file from .env.example..."; \
		cp .env.example .env; \
		echo "⚠️  Please edit .env with your Clerk credentials before continuing!"; \
		echo "   Get your keys from: https://dashboard.clerk.com"; \
		exit 1; \
	fi
	@echo "📦 Installing dependencies and generating the Prisma client..."
	@pnpm bootstrap
	@echo "✅ Dependencies ready."
	@echo ""
	@echo "Next, start the local PGlite database and initialize it:"
	@echo "  1. make db-local        # in a terminal you leave running"
	@echo "  2. make db-local-setup  # in a second terminal (first run only)"
	@echo "  3. make dev-local       # start the dev server against it"

# Development
dev: ## Start development server
	pnpm run dev

build: ## Build the application
	pnpm run build

preview: ## Preview the built application
	pnpm run preview

# Quality checks
lint: ## Run ESLint
	pnpm run lint

lint-fix: ## Run ESLint and auto-fix issues
	pnpm run lint --fix

test: test-unit ## Run the unit tests

test-unit: ## Run the Vitest unit tests
	pnpm run test:unit

test-e2e: ## Run the Playwright end-to-end suite
	pnpm run test:e2e

shot: ## Screenshot a screen, e.g. make shot SCREEN=dashboard
	pnpm shot $(SCREEN)

storybook: ## Start Storybook on port 6006
	pnpm run storybook

storybook-build: ## Build the static Storybook
	pnpm run storybook:build

# Local database (PGlite — no Neon account, no Docker)
db-local: ## Start the local Postgres server (keep running)
	pnpm run db:local

db-local-setup: ## Migrate, generate the client and seed the local database
	pnpm run db:local:setup

db-local-studio: ## Open Prisma Studio against the local database
	pnpm run db:local:studio

dev-local: ## Start the dev server against the local database
	pnpm run dev:local

typecheck: ## Run TypeScript type checking (app and tests)
	pnpm run typecheck

# Database (Prisma)
prisma-generate: ## Generate Prisma Client
	pnpm exec prisma generate

prisma-migrate: ## Create and apply a new migration
	@read -p "Enter migration name: " name; \
	pnpm exec prisma migrate dev --name $$name

prisma-studio: ## Open Prisma Studio GUI
	pnpm exec prisma studio

prisma-reset: ## Reset database (dev only - WARNING: deletes all data)
	pnpm exec prisma migrate reset

prisma-deploy: ## Apply migrations in production
	pnpm exec prisma migrate deploy

prisma-seed: ## Seed the database with mock data
	pnpm run seed

# Dependencies
install: ## Install dependencies
	pnpm install

# Cleanup
clean: ## Clean build artifacts
	rm -rf .output .nuxt node_modules

# Diagnostics
doctor: ## Check environment variables and service connectivity
	node scripts/doctor.mjs

setup-secrets: ## Sync .env CI/CD variables to GitHub Actions secrets (requires gh CLI)
	./scripts/setup/sync-github-secrets.sh

# Combined commands
check: lint typecheck ## Run all quality checks (lint + typecheck)

check-changed: ## Fast inner loop: cached lint + only the TS projects you changed
	pnpm run check:changed

check-all: lint typecheck test-unit ## Run every check CI runs on a release PR

setup: ## Setup the project (install deps + generate Prisma client)
	pnpm bootstrap
