#!/usr/bin/env sh

set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
REPO_ROOT=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
INSTANCE_PATH=""
INSTANCE_NAME="All the Mods 10"
LIST_CANDIDATES=0

sync_items="config defaultconfigs kubejs datapacks local packmenu"

usage() {
    cat <<'EOF'
Usage: ./scripts/sync-curseforge-instance.sh [options]

Sync this repository's override files into an installed CurseForge ATM10 instance.

Options:
  --instance-path PATH   Copy into this specific instance folder.
  --instance-name NAME   Instance folder name to auto-detect.
  --list-candidates      Print detected ATM10 instance folders and exit.
  --help                 Show this help text.
EOF
}

to_unix_path() {
    input_path=$1
    normalized_path=
    alt_path=
    drive_letter=
    path_rest=

    if [ -z "$input_path" ]; then
        return 1
    fi

    if [ -e "$input_path" ]; then
        printf '%s\n' "$input_path"
        return 0
    fi

    normalized_path=$(printf '%s' "$input_path" | tr '\\' '/')

    if [ -e "$normalized_path" ]; then
        printf '%s\n' "$normalized_path"
        return 0
    fi

    case "$normalized_path" in
        [A-Za-z]:/*)
            drive_letter=$(printf '%s' "$normalized_path" | cut -c1 | tr '[:upper:]' '[:lower:]')
            path_rest=$(printf '%s' "$normalized_path" | cut -c3-)
            alt_path=/$drive_letter$path_rest

            if [ -e "$alt_path" ]; then
                printf '%s\n' "$alt_path"
                return 0
            fi

            normalized_path=/mnt/$drive_letter$path_rest

            if [ -e "$normalized_path" ]; then
                printf '%s\n' "$normalized_path"
                return 0
            fi
            ;;
    esac

    if command -v cygpath >/dev/null 2>&1; then
        converted=$(cygpath -u "$input_path" 2>/dev/null || true)
        if [ -n "$converted" ]; then
            printf '%s\n' "$converted"
            return 0
        fi
    fi

    printf '%s\n' "$input_path"
}

append_candidate_root() {
    raw_root=$1
    if [ -z "$raw_root" ]; then
        return
    fi

    unix_root=$(to_unix_path "$raw_root")
    if [ -d "$unix_root" ]; then
        CANDIDATE_ROOTS="${CANDIDATE_ROOTS}${CANDIDATE_ROOTS:+\n}$unix_root"
    fi
}

collect_instance_candidates() {
    CANDIDATE_ROOTS=""

    append_candidate_root "${USERPROFILE:-}/curseforge/minecraft/Instances"
    append_candidate_root "${USERPROFILE:-}/CurseForge/minecraft/Instances"
    append_candidate_root "${USERPROFILE:-}/Documents/CurseForge/Minecraft/Instances"
    append_candidate_root "${PUBLIC:-}/curseforge/minecraft/Instances"
    append_candidate_root "/mnt/c/Users/${USER:-}/curseforge/minecraft/Instances"
    append_candidate_root "/mnt/c/Users/${USER:-}/CurseForge/minecraft/Instances"
    append_candidate_root "/mnt/c/Users/${USER:-}/Documents/CurseForge/Minecraft/Instances"
    append_candidate_root "/mnt/c/Users/Public/curseforge/minecraft/Instances"

    printf '%b' "$CANDIDATE_ROOTS" | while IFS= read -r root; do
        [ -n "$root" ] || continue
        find "$root" -mindepth 1 -maxdepth 1 -type d \( -iname '*all the mods 10*' -o -iname '*atm10*' \)
    done
}

resolve_instance_path() {
    if [ -n "$INSTANCE_PATH" ]; then
        resolved=$(to_unix_path "$INSTANCE_PATH")
        if [ ! -d "$resolved" ]; then
            printf 'Instance path not found: %s\n' "$INSTANCE_PATH" >&2
            exit 1
        fi

        printf '%s\n' "$resolved"
        return 0
    fi

    matches=$(collect_instance_candidates || true)
    exact_matches=$(printf '%s\n' "$matches" | while IFS= read -r candidate; do
        [ -n "$candidate" ] || continue
        if [ "$(basename "$candidate")" = "$INSTANCE_NAME" ]; then
            printf '%s\n' "$candidate"
        fi
    done)

    match_count=$(printf '%s\n' "$exact_matches" | sed '/^$/d' | wc -l | tr -d ' ')
    if [ "$match_count" -eq 1 ]; then
        printf '%s\n' "$exact_matches"
        return 0
    fi

    if [ "$match_count" -gt 1 ]; then
        printf 'Multiple matching CurseForge instances were found. Re-run with --instance-path:\n%s\n' "$exact_matches" >&2
        exit 1
    fi

    any_count=$(printf '%s\n' "$matches" | sed '/^$/d' | wc -l | tr -d ' ')
    if [ "$any_count" -eq 1 ]; then
        printf '%s\n' "$matches" | sed '/^$/d'
        return 0
    fi

    printf 'Could not auto-detect a CurseForge ATM10 instance. Re-run with --instance-path or use --list-candidates.\n' >&2
    exit 1
}

while [ $# -gt 0 ]; do
    case "$1" in
        --instance-path)
            [ $# -ge 2 ] || { printf 'Missing value for --instance-path\n' >&2; exit 1; }
            INSTANCE_PATH=$2
            shift 2
            ;;
        --instance-name)
            [ $# -ge 2 ] || { printf 'Missing value for --instance-name\n' >&2; exit 1; }
            INSTANCE_NAME=$2
            shift 2
            ;;
        --list-candidates)
            LIST_CANDIDATES=1
            shift
            ;;
        --help|-h)
            usage
            exit 0
            ;;
        *)
            printf 'Unknown argument: %s\n\n' "$1" >&2
            usage >&2
            exit 1
            ;;
    esac
done

if [ "$LIST_CANDIDATES" -eq 1 ]; then
    collect_instance_candidates | sed '/^$/d'
    exit 0
fi

TARGET_INSTANCE=$(resolve_instance_path)

printf 'Repo root: %s\n' "$REPO_ROOT"
printf 'Instance path: %s\n' "$TARGET_INSTANCE"

copied_any=0
for item in $sync_items; do
    source_path="$REPO_ROOT/$item"
    destination_path="$TARGET_INSTANCE/$item"

    if [ ! -d "$source_path" ] && [ ! -f "$source_path" ]; then
        continue
    fi

    mkdir -p "$destination_path"
    cp -a "$source_path/." "$destination_path/"
    printf 'Synced %s\n' "$item"
    copied_any=1
done

if [ "$copied_any" -eq 0 ]; then
    printf 'No known pack override folders were found in the repository.\n' >&2
    exit 1
fi

printf 'Sync complete. mods and CurseForge metadata were not changed.\n'