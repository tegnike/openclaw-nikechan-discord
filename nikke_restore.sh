#!/bin/bash
# nikke_restore.sh - NIKKE自己復元システム: 復元
# バックアップアーカイブからファイルを復元し、整合性チェックを実施
# バージョン5.0: 自己完結型、堅牢なハッシュ検証、安全なパスワード入力、クロスプラットフォーム対応、暗号化強化

set -euo pipefail

# ============================================
# 自己完結型関数定義（外部依存なし）
# ============================================
nikke_detect_lang() {
    local lang="${LANG:-${LC_ALL:-${LC_MESSAGES:-en}}}"
    if [[ "${lang}" == ja* ]] || [[ "${lang}" == jp* ]]; then
        echo "ja"
    else
        echo "en"
    fi
}

nikke_msg() {
    local key="$1"
    local lang="${2:-$(nikke_detect_lang)}"
    case "${lang}" in
        ja*)
            case "${key}" in
                MSG_USAGE) echo "使用方法: ./nikke_restore.sh <backup_name_or_archive> [--lang ja|en]" ;;
                MSG_NO_BACKUPS) echo "（なし）" ;;
                MSG_ARCHIVE_NOT_FOUND) echo "エラー: アーカイブが見つかりません: " ;;
                MSG_ARCHIVE_CORRUPTED) echo "エラー: アーカイブが破損しているか、有効なtar.gzファイルではありません" ;;
                MSG_NO_DIR_IN_ARCHIVE) echo "エラー: アーカイブ内にディレクトリが見つかりません" ;;
                MSG_MANIFEST_NOT_FOUND) echo "警告: バックアップ内にmanifest.mdが見つかりません" ;;
                MSG_ARCHIVE_HASH_OK) echo "アーカイブハッシュ検証: OK" ;;
                MSG_ARCHIVE_HASH_MISMATCH) echo "アーカイブハッシュ検証: 不一致！" ;;
                MSG_ARCHIVE_HASH_EXPECTED) echo "期待値: " ;;
                MSG_ARCHIVE_HASH_ACTUAL) echo "実際値: " ;;
                MSG_ARCHIVE_HASH_WARNING) echo "警告: アーカイブが改ざんされているか、破損している可能性があります。" ;;
                MSG_ARCHIVE_HASH_NOT_FOUND) echo "注意: マニフェストにアーカイブハッシュが見つかりません（古いバージョンのバックアップかもしれません）" ;;
                MSG_RESTORE_CANCELLED) echo "復元がキャンセルされました。" ;;
                MSG_VERIFY_COMPLETE) echo "検証完了: " ;;
                MSG_OK) echo "OK" ;;
                MSG_FAIL) echo "失敗" ;;
                MSG_ALL_VERIFIED) echo "すべてのファイルが正常に検証されました。" ;;
                MSG_ROLLBACK) echo "=== ロールバック ===" ;;
                MSG_ROLLBACK_FAIL) echo "検証に失敗しました！前の状態にロールバックします..." ;;
                MSG_ROLLBACK_COMPLETE) echo "ロールバック完了。" ;;
                MSG_FILES_FAILED) echo "個のファイルが検証に失敗しました。" ;;
                MSG_DECRYPTING) echo "アーカイブを復号化しています..." ;;
                MSG_DECRYPT_ERROR) echo "エラー: opensslが見つかりません、復号化できません" ;;
                MSG_DECRYPT_PASSWORD) echo "注意: 復号化にはバックアップ時のパスワードが必要です" ;;
                MSG_DECRYPT_MANUAL) echo "手動で復号化して.tar.gzファイルを提供してください" ;;
                MSG_NON_INTERACTIVE) echo "非インタラクティブ環境検出: 自動確認モード" ;;
                MSG_AUTO_YES) echo "自動確認: yes" ;;
                MSG_PASSWORD_PROMPT) echo "バックアップパスワードを入力してください: " ;;
                MSG_PASSWORD_INCORRECT) echo "エラー: パスワードが正しくないか、ファイルが破損しています" ;;
                *) echo "${key}" ;;
            esac
            ;;
        *)
            case "${key}" in
                MSG_USAGE) echo "Usage: ./nikke_restore.sh <backup_name_or_archive> [--lang ja|en]" ;;
                MSG_NO_BACKUPS) echo "(none)" ;;
                MSG_ARCHIVE_NOT_FOUND) echo "Error: Archive not found: " ;;
                MSG_ARCHIVE_CORRUPTED) echo "Error: Archive is corrupted or not a valid tar.gz file" ;;
                MSG_NO_DIR_IN_ARCHIVE) echo "Error: No directory found in archive" ;;
                MSG_MANIFEST_NOT_FOUND) echo "Warning: manifest.md not found in backup" ;;
                MSG_ARCHIVE_HASH_OK) echo "Archive hash verification: OK" ;;
                MSG_ARCHIVE_HASH_MISMATCH) echo "Archive hash verification: MISMATCH!" ;;
                MSG_ARCHIVE_HASH_EXPECTED) echo "Expected: " ;;
                MSG_ARCHIVE_HASH_ACTUAL) echo "Actual: " ;;
                MSG_ARCHIVE_HASH_WARNING) echo "Warning: Archive may have been tampered with or corrupted." ;;
                MSG_ARCHIVE_HASH_NOT_FOUND) echo "Note: Archive hash not found in manifest (backup may be from older version)" ;;
                MSG_RESTORE_CANCELLED) echo "Restore cancelled." ;;
                MSG_VERIFY_COMPLETE) echo "Verify complete: " ;;
                MSG_OK) echo "OK" ;;
                MSG_FAIL) echo "FAIL" ;;
                MSG_ALL_VERIFIED) echo "All files verified successfully." ;;
                MSG_ROLLBACK) echo "=== Rollback ===" ;;
                MSG_ROLLBACK_FAIL) echo "Verification failed! Rolling back to previous state..." ;;
                MSG_ROLLBACK_COMPLETE) echo "Rollback complete." ;;
                MSG_FILES_FAILED) echo "files failed verification." ;;
                MSG_DECRYPTING) echo "Decrypting archive..." ;;
                MSG_DECRYPT_ERROR) echo "Error: openssl not found, cannot decrypt" ;;
                MSG_DECRYPT_PASSWORD) echo "Note: Decryption requires the backup password" ;;
                MSG_DECRYPT_MANUAL) echo "Please decrypt manually and provide the .tar.gz file" ;;
                MSG_NON_INTERACTIVE) echo "Non-interactive environment detected: auto-confirm mode" ;;
                MSG_AUTO_YES) echo "Auto-confirm: yes" ;;
                MSG_PASSWORD_PROMPT) echo "Enter backup password: " ;;
                MSG_PASSWORD_INCORRECT) echo "Error: Incorrect password or corrupted file" ;;
                *) echo "${key}" ;;
            esac
            ;;
    esac
}

nikke_extract_hash() {
    local file="$1"
    local manifest_file="$2"
    local escaped_file=$(printf '%s\n' "${file}" | sed 's/[][\\.^$*]/\\&/g')
    local hash=$(grep -E "\| ${escaped_file} \|" "${manifest_file}" 2>/dev/null | grep -oP '[`][a-f0-9]{64}[`]' | head -1 | tr -d '`' || true)
    echo "${hash}"
}

nikke_cleanup() {
    local dirs=("$@")
    for dir in "${dirs[@]}"; do
        if [ -n "${dir}" ] && [ -d "${dir}" ]; then
            rm -rf "${dir}"
        fi
    done
}

# ============================================
# コマンドライン引数処理
# ============================================
INPUT=""
LANG_OVERRIDE=""
RESTORE_PASSWORD=""

while [[ $# -gt 0 ]]; do
    case "$1" in
        --lang) LANG_OVERRIDE="$2"; shift 2 ;;
        --password) RESTORE_PASSWORD="$2"; shift 2 ;;
        *) INPUT="$1"; shift ;;
    esac
done

CURRENT_LANG="${LANG_OVERRIDE:-$(nikke_detect_lang)}"

if [ -z "${INPUT}" ]; then
    echo "$(nikke_msg MSG_USAGE)"
    echo ""
    echo "Available backups:"
    ls -la "${SCRIPT_DIR:-.}/nikke_backups"/*.tar.gz "${SCRIPT_DIR:-.}/nikke_backups"/*.tar.gz.enc 2>/dev/null || echo "  $(nikke_msg MSG_NO_BACKUPS)"
    exit 1
fi

# ============================================
# 設定
# ============================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_DIR="${SCRIPT_DIR}/nikke_backups"
WORKSPACE="${SCRIPT_DIR}"

# アーカイブファイル名の特定
if [[ "${INPUT}" == *.tar.gz ]]; then
    ARCHIVE_FILE="${BACKUP_DIR}/${INPUT}"
    BACKUP_NAME="${INPUT%.tar.gz}"
elif [[ "${INPUT}" == *.tar.gz.enc ]]; then
    ARCHIVE_FILE="${BACKUP_DIR}/${INPUT}"
    BACKUP_NAME="${INPUT%.tar.gz.enc}"
else
    BACKUP_NAME="${INPUT}"
    ARCHIVE_FILE="${BACKUP_DIR}/${INPUT}.tar.gz"
    if [ ! -f "${ARCHIVE_FILE}" ]; then
        ARCHIVE_FILE="${BACKUP_DIR}/${INPUT}.tar.gz.enc"
    fi
fi

if [ ! -f "${ARCHIVE_FILE}" ]; then
    echo "$(nikke_msg MSG_ARCHIVE_NOT_FOUND)${ARCHIVE_FILE}"
    echo "Available backups:"
    ls -la "${BACKUP_DIR}"/*.tar.gz "${BACKUP_DIR}"/*.tar.gz.enc 2>/dev/null || echo "  $(nikke_msg MSG_NO_BACKUPS)"
    exit 1
fi

# ============================================
# 一時ディレクトリ作成＆クリーンアップ
# ============================================
TEMP_DIR=$(mktemp -d)
STAGING_DIR=$(mktemp -d)
CLEANUP_DIRS=("${TEMP_DIR}" "${STAGING_DIR}")
trap 'nikke_cleanup "${CLEANUP_DIRS[@]}"' EXIT

# ============================================
# 1. 復号化（暗号化アーカイブの場合）- 強化版
# ============================================
DECRYPTED_FILE=""
if [[ "${ARCHIVE_FILE}" == *.enc ]]; then
    echo "$(nikke_msg MSG_DECRYPTING)"
    if ! command -v openssl &>/dev/null; then
        echo "$(nikke_msg MSG_DECRYPT_ERROR)"
        exit 1
    fi
    
    DECRYPTED_FILE="${TEMP_DIR}/$(basename "${ARCHIVE_FILE}" .enc)"
    DECRYPT_PASSWORD="${RESTORE_PASSWORD:-}"
    
    if [ -z "${DECRYPT_PASSWORD}" ]; then
        DECRYPT_PASSWORD="${NIKKE_BACKUP_PASSWORD:-}"
    fi
    
    if [ -z "${DECRYPT_PASSWORD}" ]; then
        if [ -t 0 ]; then
            echo -n "$(nikke_msg MSG_DECRYPT_PASSWORD)"
            read -r -s DECRYPT_PASSWORD
            echo ""
        else
            echo "$(nikke_msg MSG_NON_INTERACTIVE)"
            echo "$(nikke_msg MSG_DECRYPT_MANUAL)"
            exit 1
        fi
    fi
    
    if ! openssl enc -d -aes-256-cbc -pbkdf2 -in "${ARCHIVE_FILE}" -out "${DECRYPTED_FILE}" -k "${DECRYPT_PASSWORD}" 2>/dev/null; then
        echo "$(nikke_msg MSG_PASSWORD_INCORRECT)"
        exit 1
    fi
    
    ARCHIVE_FILE="${DECRYPTED_FILE}"
    echo "Decryption successful."
    
    # パスワードをクリア
    unset DECRYPT_PASSWORD
fi

# ============================================
# 2. アーカイブ整合性チェック（展開前）
# ============================================
echo "Verifying archive integrity..."
if ! tar -tzf "${ARCHIVE_FILE}" > /dev/null 2>&1; then
    echo "$(nikke_msg MSG_ARCHIVE_CORRUPTED)"
    exit 1
fi
echo "Archive verified: OK"

# ============================================
# 3. アーカイブ展開
# ============================================
echo "Extracting: ${ARCHIVE_FILE}"
tar -xzf "${ARCHIVE_FILE}" -C "${TEMP_DIR}"

BACKUP_PATH=""
for dir in "${TEMP_DIR}"/*/; do
    if [ -d "${dir}" ]; then
        BACKUP_PATH="${dir}"
        break
    fi
done

if [ -z "${BACKUP_PATH}" ]; then
    echo "$(nikke_msg MSG_NO_DIR_IN_ARCHIVE)"
    exit 1
fi

# ============================================
# 4. マニフェスト確認＆アーカイブハッシュ検証（強化版）
# ============================================
ARCHIVE_HASH=$(sha256sum "${ARCHIVE_FILE}" | awk '{print $1}')
MANIFEST_ARCHIVE_HASH=""

if [ ! -f "${BACKUP_PATH}/manifest.md" ]; then
    echo "$(nikke_msg MSG_MANIFEST_NOT_FOUND)"
else
    echo "=== Backup Manifest ==="
    cat "${BACKUP_PATH}/manifest.md"
    echo ""
    
    # 堅牢なハッシュ抽出: archive.sha256ファイルを使用
    # マニフェストとアーカイブハッシュを分離して管理
    if [ -f "${BACKUP_PATH}/archive.sha256" ]; then
        MANIFEST_ARCHIVE_HASH=$(awk '{print $1}' "${BACKUP_PATH}/archive.sha256" | head -1)
    fi
    
    # フォールバック: マニフェストから抽出（旧バージョン対応）
    if [ -z "${MANIFEST_ARCHIVE_HASH}" ]; then
        # パターン1: - **SHA256:** <hash>（Markdownリスト形式）
        MANIFEST_ARCHIVE_HASH=$(grep '\*\*SHA256:\*\*' "${BACKUP_PATH}/manifest.md" | head -1 | sed 's/.*\*\*SHA256:\*\* *//' | awk '{print $1}' || true)
        
        # パターン2: SHA256: <hash>（簡易形式）
        if [ -z "${MANIFEST_ARCHIVE_HASH}" ]; then
            MANIFEST_ARCHIVE_HASH=$(grep '^SHA256:' "${BACKUP_PATH}/manifest.md" | sed 's/^SHA256: *//' | awk '{print $1}' | head -1 || true)
        fi
    fi
    
    if [ -n "${MANIFEST_ARCHIVE_HASH}" ]; then
        if [ "${ARCHIVE_HASH}" = "${MANIFEST_ARCHIVE_HASH}" ]; then
            echo "$(nikke_msg MSG_ARCHIVE_HASH_OK)"
        else
            echo "$(nikke_msg MSG_ARCHIVE_HASH_MISMATCH)"
            echo "  $(nikke_msg MSG_ARCHIVE_HASH_EXPECTED)${MANIFEST_ARCHIVE_HASH}"
            echo "  $(nikke_msg MSG_ARCHIVE_HASH_ACTUAL)${ARCHIVE_HASH}"
            echo "  $(nikke_msg MSG_ARCHIVE_HASH_WARNING)"
        fi
    else
        echo "$(nikke_msg MSG_ARCHIVE_HASH_NOT_FOUND)"
    fi
    
    if [ -f "${BACKUP_PATH}/manifest.md.asc" ] && command -v gpg &>/dev/null; then
        echo "Verifying GPG signature..."
        if gpg --verify "${BACKUP_PATH}/manifest.md.asc" "${BACKUP_PATH}/manifest.md" 2>/dev/null; then
            echo "GPG signature: OK"
        else
            echo "GPG signature: FAILED"
        fi
    fi
fi

# ============================================
# 5. 復元対象の確認
# ============================================
echo "=== Files to Restore ==="
echo ""

CORE_FILES="SOUL.md IDENTITY.md MEMORY.md TOOLS.md USER.md HEARTBEAT.md"
RESTORE_COUNT=0

for file in ${CORE_FILES}; do
    if [ -f "${BACKUP_PATH}/${file}" ]; then
        echo "  [CORE] ${file}"
        RESTORE_COUNT=$((RESTORE_COUNT + 1))
    fi
done

if [ -d "${BACKUP_PATH}/memory" ]; then
    MEMORY_COUNT=$(find "${BACKUP_PATH}/memory" -type f 2>/dev/null | wc -l)
    echo "  [MEMORY] memory/ (${MEMORY_COUNT} files)"
    RESTORE_COUNT=$((RESTORE_COUNT + 1))
fi

if [ -d "${BACKUP_PATH}/skills" ]; then
    SKILL_COUNT=$(find "${BACKUP_PATH}/skills" -name "SKILL.md" 2>/dev/null | wc -l)
    echo "  [SKILLS] skills/ (${SKILL_COUNT} skills)"
    RESTORE_COUNT=$((RESTORE_COUNT + 1))
fi

echo ""
echo "Total: ${RESTORE_COUNT} items to restore"
echo ""

# ============================================
# 6. 確認プロンプト（クロスプラットフォーム対応）
# ============================================
CONFIRM=""

if [ -t 0 ]; then
    if bash -c 'read -t 0.1' 2>/dev/null; then
        echo -n "Restore these files? (yes/no): "
        read -r -t 30 CONFIRM || CONFIRM="no"
    else
        echo -n "Restore these files? (yes/no): "
        read -r CONFIRM
    fi
else
    CONFIRM="${NIKKE_AUTO_RESTORE:-yes}"
    echo "$(nikke_msg MSG_NON_INTERACTIVE)"
    echo "$(nikke_msg MSG_AUTO_YES): ${CONFIRM}"
fi

if [ "${CONFIRM}" != "yes" ]; then
    echo "$(nikke_msg MSG_RESTORE_CANCELLED)"
    exit 0
fi

# ============================================
# 7. 復元実行（アトミックな復元）
# ============================================
echo ""
echo "=== Restoring ==="

for file in ${CORE_FILES}; do
    if [ -f "${WORKSPACE}/${file}" ]; then
        cp -p "${WORKSPACE}/${file}" "${STAGING_DIR}/${file}"
    fi
done

for file in ${CORE_FILES}; do
    if [ -f "${BACKUP_PATH}/${file}" ]; then
        cp -p "${BACKUP_PATH}/${file}" "${WORKSPACE}/${file}"
        echo "  [RESTORED] ${file}"
    fi
done

if [ -d "${BACKUP_PATH}/memory" ]; then
    if [ -d "${WORKSPACE}/memory" ]; then
        mv "${WORKSPACE}/memory" "${STAGING_DIR}/memory_backup"
    fi
    cp -rp "${BACKUP_PATH}/memory" "${WORKSPACE}/memory"
    echo "  [RESTORED] memory/"
fi

if [ -d "${BACKUP_PATH}/skills" ]; then
    if [ -d "${WORKSPACE}/skills" ]; then
        mv "${WORKSPACE}/skills" "${STAGING_DIR}/skills_backup"
    fi
    cp -rp "${BACKUP_PATH}/skills" "${WORKSPACE}/skills"
    echo "  [RESTORED] skills/"
fi

for file in nikke_profile.md; do
    if [ -f "${BACKUP_PATH}/${file}" ]; then
        if [ -f "${WORKSPACE}/${file}" ]; then
            cp -p "${WORKSPACE}/${file}" "${STAGING_DIR}/${file}"
        fi
        cp -p "${BACKUP_PATH}/${file}" "${WORKSPACE}/${file}"
        echo "  [RESTORED] ${file}"
    fi
done

# ============================================
# 8. ファイル権限の復元
# ============================================
if [ -f "${BACKUP_PATH}/permissions.txt" ]; then
    echo ""
    echo "=== Restoring File Permissions ==="
    while IFS= read -r line; do
        PERMS=$(echo "${line}" | awk '{print $1}')
        FILEPATH=$(echo "${line}" | awk '{print $2}')
        BASENAME=$(basename "${FILEPATH}")
        if [ -f "${WORKSPACE}/${BASENAME}" ]; then
            chmod "${PERMS}" "${WORKSPACE}/${BASENAME}" 2>/dev/null || true
            echo "  [PERMISSIONS] ${BASENAME} -> ${PERMS}"
        fi
    done < "${BACKUP_PATH}/permissions.txt"
fi

# ============================================
# 9. 復元後整合性チェック
# ============================================
echo ""
echo "=== Post-Restore Verification ==="
VERIFY_OK=0
VERIFY_FAIL=0

for file in ${CORE_FILES}; do
    if [ -f "${WORKSPACE}/${file}" ]; then
        CURRENT_HASH=$(sha256sum "${WORKSPACE}/${file}" | awk '{print $1}')
        BACKUP_HASH=$(sha256sum "${BACKUP_PATH}/${file}" | awk '{print $1}')
        if [ "${CURRENT_HASH}" = "${BACKUP_HASH}" ]; then
            echo "  [OK] ${file}"
            VERIFY_OK=$((VERIFY_OK + 1))
        else
            echo "  [$(nikke_msg MSG_FAIL)] ${file} - Hash mismatch!"
            VERIFY_FAIL=$((VERIFY_FAIL + 1))
        fi
    else
        echo "  [$(nikke_msg MSG_FAIL)] ${file} - Not found!"
        VERIFY_FAIL=$((VERIFY_FAIL + 1))
    fi
done

# ============================================
# 10. 検証失敗時にロールバック
# ============================================
if [ ${VERIFY_FAIL} -gt 0 ]; then
    echo ""
    echo "$(nikke_msg MSG_ROLLBACK)"
    echo "$(nikke_msg MSG_ROLLBACK_FAIL)"
    
    for file in ${CORE_FILES}; do
        if [ -f "${STAGING_DIR}/${file}" ]; then
            cp -p "${STAGING_DIR}/${file}" "${WORKSPACE}/${file}"
            echo "  [ROLLED BACK] ${file}"
        fi
    done
    
    if [ -d "${STAGING_DIR}/memory_backup" ]; then
        rm -rf "${WORKSPACE}/memory"
        mv "${STAGING_DIR}/memory_backup" "${WORKSPACE}/memory"
        echo "  [ROLLED BACK] memory/"
    fi
    
    if [ -d "${STAGING_DIR}/skills_backup" ]; then
        rm -rf "${WORKSPACE}/skills"
        mv "${STAGING_DIR}/skills_backup" "${WORKSPACE}/skills"
        echo "  [ROLLED BACK] skills/"
    fi
    
    echo ""
    echo "$(nikke_msg MSG_ROLLBACK_COMPLETE) ${VERIFY_FAIL} $(nikke_msg MSG_FILES_FAILED)"
    exit 1
fi

rm -rf "${STAGING_DIR}"

echo ""
echo "=== Restore Complete ==="
echo "  $(nikke_msg MSG_VERIFY_COMPLETE)${VERIFY_OK} $(nikke_msg MSG_OK), ${VERIFY_FAIL} $(nikke_msg MSG_FAIL)"
echo "  $(nikke_msg MSG_ALL_VERIFIED)"
