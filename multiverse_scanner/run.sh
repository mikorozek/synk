#!/bin/bash
# Helper script for MultiversX YOLO Trader

set -e

case "$1" in
  start)
    echo "🚀 Starting YOLO Trader..."
    docker-compose up -d
    echo "✅ Started! View logs with: ./run.sh logs"
    ;;
  
  stop)
    echo "🛑 Stopping YOLO Trader..."
    docker-compose down
    echo "✅ Stopped!"
    ;;
  
  restart)
    echo "♻️  Restarting YOLO Trader..."
    docker-compose restart
    echo "✅ Restarted!"
    ;;
  
  logs)
    echo "📋 Viewing logs (Ctrl+C to exit)..."
    docker-compose logs -f yolo-trader
    ;;
  
  build)
    echo "🔨 Building Docker image..."
    docker-compose build
    echo "✅ Build complete!"
    ;;
  
  rebuild)
    echo "🔨 Rebuilding from scratch..."
    docker-compose down
    docker-compose build --no-cache
    docker-compose up -d
    echo "✅ Rebuild complete! View logs with: ./run.sh logs"
    ;;
  
  mock)
    echo "🎭 Inserting mock data..."
    python mock_setup.py
    echo "✅ Mock data inserted!"
    ;;
  
  status)
    echo "📊 Container status:"
    docker-compose ps
    ;;
  
  shell)
    echo "🐚 Opening shell in container..."
    docker-compose exec yolo-trader /bin/bash
    ;;
  
  *)
    echo "MultiversX YOLO Trader - Helper Script"
    echo ""
    echo "Usage: ./run.sh [command]"
    echo ""
    echo "Commands:"
    echo "  start     - Start the trader"
    echo "  stop      - Stop the trader"
    echo "  restart   - Restart the trader"
    echo "  logs      - View live logs"
    echo "  build     - Build Docker image"
    echo "  rebuild   - Rebuild from scratch"
    echo "  mock      - Insert mock test data"
    echo "  status    - Show container status"
    echo "  shell     - Open shell in container"
    echo ""
    ;;
esac
