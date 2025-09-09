#!/bin/bash

# Markdown Brain Setup Script
# Automated installation for new machines

set -e

echo "🚀 Markdown Brain Setup Script"
echo "=============================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default paths
DEFAULT_DOCS_DIR="$HOME/Documents"
SCRIPTS_DIR="$HOME/scripts"

# Check prerequisites
echo "📋 Checking prerequisites..."

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js not found. Please install Node.js 18+ first.${NC}"
    exit 1
else
    echo -e "${GREEN}✅ Node.js found: $(node --version)${NC}"
fi

# Check Python
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python 3 not found. Please install Python 3.8+ first.${NC}"
    exit 1
else
    echo -e "${GREEN}✅ Python found: $(python3 --version)${NC}"
fi

# Get documents directory
echo ""
read -p "📁 Enter your documents directory path [$DEFAULT_DOCS_DIR]: " DOCS_DIR
DOCS_DIR=${DOCS_DIR:-$DEFAULT_DOCS_DIR}

# Create directories if they don't exist
mkdir -p "$DOCS_DIR"
mkdir -p "$SCRIPTS_DIR"

# Install npm dependencies
echo ""
echo "📦 Installing npm dependencies..."
npm install

# Build the project
echo ""
echo "🔨 Building the MCP server..."
npm run build

# Copy and configure update script
echo ""
echo "📝 Setting up update script..."
cp scripts/update-index.py "$SCRIPTS_DIR/brain-update.py"
chmod +x "$SCRIPTS_DIR/brain-update.py"

# Update the DOCS_DIR in the script
sed -i.bak "s|DOCS_DIR = os.environ.get('DOCS_PATH', '/path/to/your/docs')|DOCS_DIR = os.environ.get('DOCS_PATH', '$DOCS_DIR')|" "$SCRIPTS_DIR/brain-update.py"
rm "$SCRIPTS_DIR/brain-update.py.bak"

# Detect shell and add aliases
echo ""
echo "🐚 Setting up shell aliases..."

SHELL_CONFIG=""
if [ -n "$ZSH_VERSION" ]; then
    SHELL_CONFIG="$HOME/.zshrc"
elif [ -n "$BASH_VERSION" ]; then
    if [ -f "$HOME/.bash_aliases" ]; then
        SHELL_CONFIG="$HOME/.bash_aliases"
    else
        SHELL_CONFIG="$HOME/.bashrc"
    fi
fi

if [ -n "$SHELL_CONFIG" ]; then
    # Check if aliases already exist
    if ! grep -q "brain-update" "$SHELL_CONFIG" 2>/dev/null; then
        echo "" >> "$SHELL_CONFIG"
        echo "# Markdown Brain Aliases" >> "$SHELL_CONFIG"
        echo "alias brain-update='python3 $SCRIPTS_DIR/brain-update.py'" >> "$SHELL_CONFIG"
        echo "alias brain-index='cat $DOCS_DIR/INDEX.md'" >> "$SHELL_CONFIG"
        echo "alias brain-ref='cat $DOCS_DIR/QUICK_REFERENCE.md'" >> "$SHELL_CONFIG"
        echo -e "${GREEN}✅ Aliases added to $SHELL_CONFIG${NC}"
    else
        echo -e "${YELLOW}⚠️  Aliases already exist in $SHELL_CONFIG${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Could not detect shell configuration file. Please add aliases manually.${NC}"
fi

# Configure Claude Desktop
echo ""
echo "🤖 Configuring Claude Desktop..."

# Detect OS and set config path
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    CLAUDE_CONFIG="$HOME/.config/Claude/claude_desktop_config.json"
elif [[ "$OSTYPE" == "darwin"* ]]; then
    CLAUDE_CONFIG="$HOME/Library/Application Support/Claude/claude_desktop_config.json"
else
    echo -e "${YELLOW}⚠️  Could not detect OS. Please configure Claude Desktop manually.${NC}"
    CLAUDE_CONFIG=""
fi

if [ -n "$CLAUDE_CONFIG" ]; then
    mkdir -p "$(dirname "$CLAUDE_CONFIG")"
    
    # Create or update config
    if [ -f "$CLAUDE_CONFIG" ]; then
        echo -e "${YELLOW}⚠️  Claude config already exists. Please add the following manually:${NC}"
    else
        cat > "$CLAUDE_CONFIG" << EOF
{
  "mcpServers": {
    "markdown-brain": {
      "command": "node",
      "args": ["$(pwd)/dist/index.js"],
      "env": {
        "DOCS_PATH": "$DOCS_DIR"
      }
    }
  }
}
EOF
        echo -e "${GREEN}✅ Claude Desktop configured${NC}"
    fi
    
    echo ""
    echo "Claude Desktop configuration:"
    echo "------------------------------"
    cat << EOF
{
  "mcpServers": {
    "markdown-brain": {
      "command": "node",
      "args": ["$(pwd)/dist/index.js"],
      "env": {
        "DOCS_PATH": "$DOCS_DIR"
      }
    }
  }
}
EOF
fi

# Set up cron job
echo ""
echo "⏰ Setting up automatic updates..."
read -p "Do you want to set up hourly automatic updates? (y/n): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    # Check if cron job already exists
    if ! crontab -l 2>/dev/null | grep -q "brain-update.py"; then
        # Add cron job
        (crontab -l 2>/dev/null; echo "0 * * * * /usr/bin/python3 $SCRIPTS_DIR/brain-update.py > /dev/null 2>&1") | crontab -
        echo -e "${GREEN}✅ Cron job added for hourly updates${NC}"
    else
        echo -e "${YELLOW}⚠️  Cron job already exists${NC}"
    fi
fi

# Run initial index generation
echo ""
echo "📚 Generating initial index..."
python3 "$SCRIPTS_DIR/brain-update.py"

# Success message
echo ""
echo -e "${GREEN}✨ Setup complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Reload your shell: source $SHELL_CONFIG"
echo "2. Restart Claude Desktop"
echo "3. Test the commands:"
echo "   - brain-update  # Update the index"
echo "   - brain-index   # View the index"
echo "   - brain-ref     # View quick reference (if available)"
echo ""
echo "Your documents directory: $DOCS_DIR"
echo "Your scripts directory: $SCRIPTS_DIR"
echo ""
echo "Happy documenting! 📝"