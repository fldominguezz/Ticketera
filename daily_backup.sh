#!/bin/bash
# Ticketera Backup Script
BACKUP_DIR="/root/Ticketera/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
mkdir -p $BACKUP_DIR

echo "Starting backup of Ticketera..."

# Backup Database (assuming PostgreSQL inside docker or local)
# docker exec ticketera_db_1 pg_dump -U ticketera_user ticketera_db > $BACKUP_DIR/db_backup_$TIMESTAMP.sql

# Backup Uploads and Config
tar -czf $BACKUP_DIR/files_backup_$TIMESTAMP.tar.gz /root/Ticketera/uploads /root/Ticketera/.env

# Clean old backups (keep last 7 days)
find $BACKUP_DIR -type f -mtime +7 -delete

echo "Backup completed: $BACKUP_DIR/files_backup_$TIMESTAMP.tar.gz"
