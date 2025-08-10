#!/bin/bash

# MongoDB Setup Script for Gigateer
# This script handles MongoDB setup and management for the Gigateer application

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# MongoDB configuration
MONGO_PORT=27017
MONGO_DB_NAME="gigateer"
MONGO_DATA_DIR="./data/mongodb"

# Function to print colored output
print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

# Check if MongoDB is installed
check_mongo_installed() {
    if command -v mongod &> /dev/null; then
        print_status "MongoDB is installed"
        mongod --version | head -n 1
        return 0
    else
        print_error "MongoDB is not installed"
        return 1
    fi
}

# Install MongoDB (Ubuntu/Debian)
install_mongo_ubuntu() {
    print_status "Installing MongoDB on Ubuntu/Debian..."
    
    # Import MongoDB public GPG key
    curl -fsSL https://pgp.mongodb.com/server-7.0.asc | \
        sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg \
        --dearmor

    # Create list file for MongoDB
    echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | \
        sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

    # Update package database and install MongoDB
    sudo apt-get update
    sudo apt-get install -y mongodb-org
    
    print_status "MongoDB installed successfully"
}

# Install MongoDB (macOS)
install_mongo_macos() {
    print_status "Installing MongoDB on macOS..."
    
    if ! command -v brew &> /dev/null; then
        print_error "Homebrew is not installed. Please install Homebrew first."
        exit 1
    fi
    
    # Install MongoDB using Homebrew
    brew tap mongodb/brew
    brew install mongodb-community
    
    print_status "MongoDB installed successfully"
}

# Start MongoDB service
start_mongo_service() {
    print_status "Starting MongoDB service..."
    
    # Check OS and start service accordingly
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        sudo systemctl start mongod
        sudo systemctl enable mongod
        print_status "MongoDB service started and enabled"
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        brew services start mongodb-community
        print_status "MongoDB service started"
    else
        print_warning "Unsupported OS. Please start MongoDB manually."
    fi
}

# Start MongoDB in standalone mode (for development)
start_mongo_standalone() {
    print_status "Starting MongoDB in standalone mode..."
    
    # Create data directory if it doesn't exist
    mkdir -p "$MONGO_DATA_DIR"
    
    # Start MongoDB with custom data directory
    mongod --dbpath "$MONGO_DATA_DIR" --port "$MONGO_PORT" &
    
    sleep 3
    print_status "MongoDB started on port $MONGO_PORT with data directory: $MONGO_DATA_DIR"
}

# Stop MongoDB
stop_mongo() {
    print_status "Stopping MongoDB..."
    
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        sudo systemctl stop mongod
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        brew services stop mongodb-community
    else
        # Try to kill mongod process
        pkill mongod || true
    fi
    
    print_status "MongoDB stopped"
}

# Check MongoDB status
check_mongo_status() {
    if pgrep -x "mongod" > /dev/null; then
        print_status "MongoDB is running"
        
        # Try to connect and get status
        if command -v mongosh &> /dev/null; then
            mongosh --port "$MONGO_PORT" --eval "db.adminCommand('ping')" &> /dev/null && \
                print_status "MongoDB is accepting connections on port $MONGO_PORT" || \
                print_warning "MongoDB is running but not accepting connections"
        fi
        
        return 0
    else
        print_warning "MongoDB is not running"
        return 1
    fi
}

# Import sample data
import_sample_data() {
    print_status "Importing sample data..."
    
    # Check if catalog.json exists
    if [ ! -f "./data/catalog.json" ]; then
        print_error "catalog.json not found in ./data/"
        return 1
    fi
    
    # Import data using mongoimport
    if command -v mongoimport &> /dev/null; then
        mongoimport --db "$MONGO_DB_NAME" \
                    --collection gigs \
                    --file ./data/catalog.json \
                    --jsonArray \
                    --port "$MONGO_PORT"
        
        print_status "Sample data imported successfully"
    else
        print_error "mongoimport not found. Please install MongoDB Database Tools."
    fi
}

# Main menu
show_menu() {
    echo ""
    echo "MongoDB Setup for Gigateer"
    echo "=========================="
    echo "1. Check MongoDB installation"
    echo "2. Install MongoDB"
    echo "3. Start MongoDB service"
    echo "4. Start MongoDB (standalone/development)"
    echo "5. Stop MongoDB"
    echo "6. Check MongoDB status"
    echo "7. Import sample data"
    echo "8. Full setup (install, start, import)"
    echo "9. Exit"
    echo ""
    read -p "Choose an option: " choice
    
    case $choice in
        1)
            check_mongo_installed
            ;;
        2)
            if [[ "$OSTYPE" == "linux-gnu"* ]]; then
                install_mongo_ubuntu
            elif [[ "$OSTYPE" == "darwin"* ]]; then
                install_mongo_macos
            else
                print_error "Unsupported operating system"
            fi
            ;;
        3)
            start_mongo_service
            ;;
        4)
            start_mongo_standalone
            ;;
        5)
            stop_mongo
            ;;
        6)
            check_mongo_status
            ;;
        7)
            import_sample_data
            ;;
        8)
            # Full setup
            if ! check_mongo_installed; then
                if [[ "$OSTYPE" == "linux-gnu"* ]]; then
                    install_mongo_ubuntu
                elif [[ "$OSTYPE" == "darwin"* ]]; then
                    install_mongo_macos
                fi
            fi
            start_mongo_service || start_mongo_standalone
            sleep 3
            import_sample_data
            print_status "Full setup completed!"
            ;;
        9)
            exit 0
            ;;
        *)
            print_error "Invalid option"
            ;;
    esac
}

# Quick start option (non-interactive)
if [ "$1" == "--quick-start" ]; then
    print_status "Quick start mode..."
    if check_mongo_status; then
        print_status "MongoDB is already running"
    else
        if check_mongo_installed; then
            start_mongo_standalone
        else
            print_error "MongoDB is not installed. Run without --quick-start to install."
            exit 1
        fi
    fi
    exit 0
fi

# Interactive mode
while true; do
    show_menu
done