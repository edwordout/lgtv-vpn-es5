#!/bin/sh
# vpn-down.sh

LOG_FILE=/tmp/vpn-down.log
BACKUP_FILE=/tmp/lgtv-vpn.resolv.conf.backup

log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') [vpn-down] $*" >> "$LOG_FILE"
}

main() {
    log "script start"
    log "dev=$dev script_type=$script_type"

    if [ -s "$BACKUP_FILE" ]; then
        if ! cp "$BACKUP_FILE" /etc/resolv.conf; then
            log "failed to restore /etc/resolv.conf from $BACKUP_FILE"
            exit 1
        fi
        rm -f "$BACKUP_FILE"
        log "restored resolver configuration from $BACKUP_FILE"
    else
        log "no resolver backup found, leaving /etc/resolv.conf unchanged"
    fi

    exit 0
}

main "$@"
