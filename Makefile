.PHONY: dev build preview lint lint-fix typecheck install clean check setup help init prisma-generate prisma-migrate prisma-studio prisma-reset prisma-deploy prisma-seed prisma-dev prisma-dev-stop

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
	@pnpm install
	@echo "🗄️  Starting Prisma Dev DB..."
	@pnpm dlx prisma dev --detach
	@echo "🔗 Updating DATABASE_URL in .env..."
	@URL=$$(pnpm dlx prisma dev ls 2>&1 | cat -v | grep -oE '\^\[\]8;;prisma\+postgres://[^^]+' | head -1 | sed 's/\^\[\]8;;// '); \
	if [ -n "$$URL" ]; then \
		sed -i '' 's|^DATABASE_URL=.*|DATABASE_URL='"$$URL"'|' .env; \
		echo "   DATABASE_URL=$$URL"; \
	else \
		echo "⚠️  Could not extract DATABASE_URL from prisma dev ls"; \
	fi
	@echo "🗄️  Generating Prisma Client..."
	@pnpm exec prisma generate
	@echo "🔄 Running database migrations..."
	@pnpm exec prisma migrate dev
	@echo "✅ Setup complete! Run 'make dev' to start the development server."

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

typecheck: ## Run TypeScript type checking
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

prisma-dev: ## Start Prisma Dev DB (detached)
	pnpm dlx prisma dev --detach

prisma-dev-stop: ## Stop Prisma Dev DB
	pnpm dlx prisma dev stop default

# Dependencies
install: ## Install dependencies
	pnpm install

# Cleanup
clean: ## Clean build artifacts
	rm -rf .output .nuxt node_modules

# Combined commands
check: lint typecheck ## Run all quality checks
setup: install prisma-generate ## Setup the project (install deps + generate Prisma client)
