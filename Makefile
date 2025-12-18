.PHONY: dev build preview lint lint-fix typecheck install clean check setup help init prisma-generate prisma-migrate prisma-studio prisma-reset prisma-deploy prisma-seed

# Default target
help: ## Show this help message
	@echo "Available commands:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

# Initial setup
init: ## Complete project setup (install deps, setup env, init database)
	@echo "🚀 Starting project setup..."
	@if [ ! -f .env ]; then \
		echo "📝 Creating .env file from .env.example..."; \
		cp .env.example .env; \
		echo "⚠️  Please edit .env with your Clerk credentials before continuing!"; \
		echo "   Get your keys from: https://dashboard.clerk.com"; \
		exit 1; \
	fi
	@echo "📦 Installing dependencies..."
	@bun install
	@echo "🗄️  Generating Prisma Client..."
	@bunx prisma generate
	@echo "🔄 Running database migrations..."
	@bunx prisma migrate dev
	@echo "✅ Setup complete! Run 'make dev' to start the development server."

# Development
dev: ## Start development server
	bun run dev

build: ## Build the application
	bun run build

preview: ## Preview the built application
	bun run preview

# Quality checks
lint: ## Run ESLint
	bun run lint

lint-fix: ## Run ESLint and auto-fix issues
	bun run lint --fix

typecheck: ## Run TypeScript type checking
	bun run typecheck

# Database (Prisma)
prisma-generate: ## Generate Prisma Client
	bunx prisma generate

prisma-migrate: ## Create and apply a new migration
	@read -p "Enter migration name: " name; \
	bunx prisma migrate dev --name $$name

prisma-studio: ## Open Prisma Studio GUI
	bunx prisma studio

prisma-reset: ## Reset database (dev only - WARNING: deletes all data)
	bunx prisma migrate reset

prisma-deploy: ## Apply migrations in production
	bunx prisma migrate deploy

prisma-seed: ## Seed the database with mock data
	bun run seed

# Dependencies
install: ## Install dependencies
	bun install

# Cleanup
clean: ## Clean build artifacts
	rm -rf .output .nuxt node_modules

# Combined commands
check: lint typecheck ## Run all quality checks
setup: install ## Setup the project (alias for install)
