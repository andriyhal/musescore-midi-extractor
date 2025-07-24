# MuseScore MIDI Extractor

An automated system for collecting, processing, and storing musical scores from MuseScore. The project consists of an API server, a consumer for queue processing, and AWS S3 integration for MIDI file storage.

## 🎵 Project Overview

MuseScore MIDI Extractor is a system that:

-   Automatically extracts score links from MuseScore sitemap
-   Parses score metadata (title, composer, genre, instruments, etc.)
-   Downloads MIDI files using browser automation
-   Stores files in AWS S3 and metadata in PostgreSQL database
-   Provides REST API for data management

## 🏗️ Architecture

### System Components

-   **Express.js API Server** - REST API for system interaction
-   **RabbitMQ Consumer** - Queue processing for score parsing
-   **PostgreSQL + Prisma** - Database for metadata storage
-   **AWS S3** - Cloud storage for MIDI files
-   **Puppeteer** - Browser automation for file downloads

## 📋 Requirements

-   Node.js 20+
-   Docker and Docker Compose
-   PostgreSQL database
-   AWS S3 bucket
-   RabbitMQ
-   MuseScore credentials for file downloads

## 🚀 Quick Start

### 1. Clone Repository

```bash
git clone <repository-url>
cd musescore-midi-extractor
```

### 2. Environment Variables Setup

Create a `.env` file in the project root.

### 3. Run with Docker Compose

```bash
docker-compose up -d
```

This will start:

-   API server on port 3001
-   RabbitMQ on ports 5672 (AMQP) and 15672 (Management UI)
-   Consumer for queue processing

### 4. Alternative Development Setup

```bash
# Install dependencies
npm install

# Generate Prisma client
npm run prisma-generate

# Run database migrations
npx prisma migrate deploy

# Start API server
npm run dev

# Start consumer (in another terminal)
npm run con
```

### RabbitMQ Management

RabbitMQ Management UI is available at: `http://localhost:15672`

-   Login: `guest`
-   Password: `guest`

### Prisma

To work with the database, use the Prisma CLI:

```bash
# Apply migrations
npx prisma migrate deploy

# Generate client
npx prisma generate

```

### Monitoring

-   API Health check: `GET /api/ping`
-   RabbitMQ Management: `http://localhost:15672`
-   Logs: `docker-compose logs -f`
