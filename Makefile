.PHONY: dev build preview lint typecheck install clean help

# Default target
help: ## Show this help message
	@echo "Available commands:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

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

typecheck: ## Run TypeScript type checking
	bun run typecheck

# Dependencies
install: ## Install dependencies
	bun install

# Cleanup
clean: ## Clean build artifacts
	rm -rf .output .nuxt node_modules

# Combined commands
check: lint typecheck ## Run all quality checks
setup: install ## Setup the project (alias for install)
