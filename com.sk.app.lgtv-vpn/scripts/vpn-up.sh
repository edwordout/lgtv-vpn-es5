#!/bin/sh
# vpn-up.sh
#
# OpenVPN up script:
# - reads foreign_option_* env vars
# - extracts pushed DNS servers
# - updates /etc/resolv.conf directly
# - preserves the pre-VPN resolver config in /tmp for vpn-down.sh
# 
# Requires:
#   --script-security 2
#   --up /path/to/vpn-up.sh
# 
# Notes:
# - This script logs to /tmp/vpn-up.log
# - The original resolver config is backed up only once per VPN session

LOG_FILE=/tmp/vpn-up.log
BACKUP_FILE=/tmp/lgtv-vpn.resolv.conf.backup
TMP_RESOLV_CONF=/tmp/lgtv-vpn.resolv.conf.$$

log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') [vpn-up] $*" >> "$LOG_FILE"
}

get_pushed_dns() {
    i=1
    while :; do
        eval opt=\${foreign_option_$i}
        [ -z "$opt" ] && break

        case "$opt" in
            "dhcp-option DNS "*)
                echo "$opt" | awk '{print $3}'
                ;;
        esac

        i=$((i + 1))
    done
}

main() {
    log "script start"
    log "dev=$dev script_type=$script_type"

    DNS_LIST="$(get_pushed_dns | awk '!seen[$0]++')"
    if [ -z "$DNS_LIST" ]; then
        log "no pushed DNS found in foreign_option_*"
        exit 0
    fi

    if [ ! -f "$BACKUP_FILE" ]; then
        if ! cp /etc/resolv.conf "$BACKUP_FILE"; then
            log "failed to back up /etc/resolv.conf"
            exit 1
        fi
        log "resolver backup created at $BACKUP_FILE"
    else
        log "reusing existing resolver backup at $BACKUP_FILE"
    fi

    : > "$TMP_RESOLV_CONF" || {
        log "failed to create temporary resolver file"
        exit 1
    }

    i=1
    for dns in $DNS_LIST; do
        log "dns_$i=$dns"
        echo "nameserver $dns" >> "$TMP_RESOLV_CONF" || {
            log "failed to write DNS entry to temporary resolver file"
            rm -f "$TMP_RESOLV_CONF"
            exit 1
        }
        i=$((i + 1))
    done

    if ! cp "$TMP_RESOLV_CONF" /etc/resolv.conf; then
        log "failed to update /etc/resolv.conf"
        rm -f "$TMP_RESOLV_CONF"
        exit 1
    fi

    rm -f "$TMP_RESOLV_CONF"

    log "/etc/resolv.conf updated!"
    exit 0
}

main "$@"
