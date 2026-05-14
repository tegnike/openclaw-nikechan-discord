#!/bin/bash
# nikke_backup.sh - NIKKE自己復元システム: バックアップ
# 核ファイル・記憶・スキルをアーカイブし、整合性チェック付きで保存
# バージョン5.0: 自己完結型、安全なクリーンアップ、堅牢なハッシュ抽出、クロスプラットフォーム対応、暗号化強化

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
                MSG_CREATE_DIR_ERROR) echo "エラー: バックアップディレクトリを作成できません: " ;;
                MSG_WRITE_PERM_ERROR) echo "エラー: バックアップディレクトリに書き込み権限がありません: " ;;
                MSG_VERIFY_FAIL) echo "エラー: アーカイブ検証に失敗しました！" ;;
                MSG_BACKUP_COMPLETE) echo "NIKKEバックアップ完了: " ;;
                MSG_MISSING_WARNING) echo "警告: " ;;
                MSG_MISSING_CORE) echo "個のコアファイルが見つかりませんでした！" ;;
                MSG_ROTATION_DELETE) echo "ローテーション: 古いバックアップを削除: " ;;
                MSG_ROTATION_COUNT) echo "保持するバックアップ数: " ;;
                MSG_ENCRYPTION) echo "暗号化: " ;;
                MSG_SIGNATURE) echo "GPG署名: " ;;
                MSG_PERMISSIONS) echo "ファイル権限を記録: " ;;
                MSG_USAGE) echo "使用方法: ./nikke_backup.sh [--encrypt] [--diff] [--lang ja|en] [--max-backups N]" ;;
                MSG_NO_BACKUPS) echo "（なし）" ;;
                MSG_DIFF_MODE) echo "差分バックアップモード: " ;;
                MSG_DIFF_NO_CHANGES) echo "変更はありません" ;;
                MSG_DIFF_CHANGES) echo "個のファイルが変更されました" ;;
                MSG_PASSWORD_PROMPT) echo "バックアップパスワードを入力してください（復元に必要）: " ;;
                MSG_PASSWORD_MIN) echo "パスワードは8文字以上である必要があります" ;;
                *) echo "${key}" ;;
            esac
            ;;
        *)
            case "${key}" in
                MSG_CREATE_DIR_ERROR) echo "Error: Cannot create backup directory: " ;;
                MSG_WRITE_PERM_ERROR) echo "Error: Backup directory is not writable: " ;;
                MSG_VERIFY_FAIL) echo "Error: Archive verification failed!" ;;
                MSG_BACKUP_COMPLETE) echo "NIKKE Backup Complete: " ;;
                MSG_MISSING_WARNING) echo "WARNING: " ;;
                MSG_MISSING_CORE) echo "core files were missing during backup!" ;;
                MSG_ROTATION_DELETE) echo "Rotation: Deleting old backup: " ;;
                MSG_ROTATION_COUNT) echo "Keeping backups: " ;;
                MSG_ENCRYPTION) echo "Encryption: " ;;
                MSG_SIGNATURE) echo "GPG signature: " ;;
                MSG_PERMISSIONS) echo "Recording file permissions: " ;;
                MSG_USAGE) echo "Usage: ./nikke_backup.sh [--encrypt] [--diff] [--lang ja|en] [--max-backups N]" ;;
                MSG_NO_BACKUPS) echo "(none)" ;;
                MSG_DIFF_MODE) echo "Differential backup mode: " ;;
                MSG_DIFF_NO_CHANGES) echo "No changes detected" ;;
                MSG_DIFF_CHANGES) echo "files have changed" ;;
                MSG_PASSWORD_PROMPT) echo "Enter backup password (required for restore): " ;;
                MSG_PASSWORD_MIN) echo "Password must be at least 8 characters" ;;
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
ENCRYPT=false
DIFF_MODE=false
MAX_BACKUPS=10
LANG_OVERRIDE=""
BACKUP_PASSWORD=""

while [[ $# -gt 0 ]]; do
    case "$1" in
        --encrypt) ENCRYPT=true; shift ;;
        --diff) DIFF_MODE=true; shift ;;
        --lang) LANG_OVERRIDE="$2"; shift 2 ;;
        --max-backups) MAX_BACKUPS="$2"; shift 2 ;;
        --password) BACKUP_PASSWORD="$2"; shift 2 ;;
        *) echo "$(nikke_msg MSG_USAGE)"; exit 1 ;;
    esac
done

CURRENT_LANG="${LANG_OVERRIDE:-$(nikke_detect_lang)}"

# ============================================
# 設定
# ============================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_DIR="${SCRIPT_DIR}/nikke_backups"
WORKSPACE="${SCRIPT_DIR}"
TIMESTAMP=$(date -u +"%Y-%m-%d_%H%M%S")
BACKUP_NAME="nikke_backup_${TIMESTAMP}"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_NAME}"

CORE_FILES="SOUL.md IDENTITY.md MEMORY.md TOOLS.md USER.md HEARTBEAT.md"
MEMORY_DIR="memory"
SKILLS_DIR="skills"
OPTIONAL_FILES="nikke_profile.md"

MANIFEST_FILE="${BACKUP_PATH}/manifest.md"
PERMISSIONS_FILE="${BACKUP_PATH}/permissions.txt"

# クリーンアップ対象ディレクトリを配列で管理
CLEANUP_DIRS=()

# 差分バックアップ用の前回のマニフェスト
PREVIOUS_MANIFEST=""
if [ "${DIFF_MODE}" = true ]; then
    LATEST_BACKUP=$(ls -t "${BACKUP_DIR}"/nikke_backup_*.tar.gz 2>/dev/null | head -1 || true)
    if [ -n "${LATEST_BACKUP}" ]; then
        TEMP_EXTRACT=$(mktemp -d)
        CLEANUP_DIRS+=("${TEMP_EXTRACT}")
        tar -xzf "${LATEST_BACKUP}" -C "${TEMP_EXTRACT}"
        EXTRACTED_DIR=$(find "${TEMP_EXTRACT}" -maxdepth 1 -type d -name "nikke_backup_*" | head -1)
        if [ -n "${EXTRACTED_DIR}" ] && [ -f "${EXTRACTED_DIR}/manifest.md" ]; then
            PREVIOUS_MANIFEST="${EXTRACTED_DIR}/manifest.md"
        fi
    fi
fi

# クリーンアップ関数の設定（配列が空でも安全）
trap 'if [ ${#CLEANUP_DIRS[@]} -gt 0 ]; then nikke_cleanup "${CLEANUP_DIRS[@]}"; fi' EXIT

# ============================================
# 1. バックアップディレクトリ作成（権限チェック付き）
# ============================================
if ! mkdir -p "${BACKUP_PATH}" 2>/dev/null; then
    echo "$(nikke_msg MSG_CREATE_DIR_ERROR)${BACKUP_PATH}"
    exit 1
fi

if [ ! -w "${BACKUP_PATH}" ]; then
    echo "$(nikke_msg MSG_WRITE_PERM_ERROR)${BACKUP_PATH}"
    exit 1
fi

# ============================================
# 2. 核ファイルをコピー＆ハッシュ計算
# ============================================
echo "# NIKKE Backup Manifest" > "${MANIFEST_FILE}"
echo "" >> "${MANIFEST_FILE}"
echo "- **Backup Date:** ${TIMESTAMP} (UTC)" >> "${MANIFEST_FILE}"
echo "- **Backup Name:** ${BACKUP_NAME}" >> "${MANIFEST_FILE}"
echo "- **Mode:** $([ "${DIFF_MODE}" = true ] && echo "Differential" || echo "Full")" >> "${MANIFEST_FILE}"
echo "- **Encryption:** $([ "${ENCRYPT}" = true ] && echo "AES256" || echo "None")" >> "${MANIFEST_FILE}"
echo "" >> "${MANIFEST_FILE}"
echo "## Files" >> "${MANIFEST_FILE}"
echo "" >> "${MANIFEST_FILE}"
echo "| File | Status | SHA256 | Permissions |" >> "${MANIFEST_FILE}"
echo "|------|--------|--------|-------------|" >> "${MANIFEST_FILE}"

MISSING_COUNT=0

for file in ${CORE_FILES}; do
    if [ -f "${WORKSPACE}/${file}" ]; then
        cp -p "${WORKSPACE}/${file}" "${BACKUP_PATH}/${file}"
        HASH=$(sha256sum "${BACKUP_PATH}/${file}" | awk '{print $1}')
        PERMS=$(stat -c '%a' "${WORKSPACE}/${file}" 2>/dev/null || stat -f '%Lp' "${WORKSPACE}/${file}" 2>/dev/null || echo "unknown")
        echo "| ${file} | OK | \`${HASH}\` | ${PERMS} |" >> "${MANIFEST_FILE}"
        echo "${PERMS} ${WORKSPACE}/${file}" >> "${PERMISSIONS_FILE}"
    else
        echo "| ${file} | MISSING | - | - |" >> "${MANIFEST_FILE}"
        MISSING_COUNT=$((MISSING_COUNT + 1))
    fi
done

# ============================================
# 3. 記憶ディレクトリをコピー（差分モード対応）
# ============================================
if [ -d "${WORKSPACE}/${MEMORY_DIR}" ]; then
    if [ "${DIFF_MODE}" = true ] && [ -n "${PREVIOUS_MANIFEST}" ]; then
        mkdir -p "${BACKUP_PATH}/${MEMORY_DIR}"
        DIFF_COUNT=0
        while IFS= read -r -d '' file; do
            REL_PATH="${file#${WORKSPACE}/${MEMORY_DIR}/}"
            PREV_HASH=$(nikke_extract_hash "memory/${REL_PATH}" "${PREVIOUS_MANIFEST}")
            CURR_HASH=$(sha256sum "${file}" | awk '{print $1}')
            if [ -z "${PREV_HASH}" ] || [ "${PREV_HASH}" != "${CURR_HASH}" ]; then
                mkdir -p "${BACKUP_PATH}/${MEMORY_DIR}/$(dirname "${REL_PATH}")"
                cp -p "${file}" "${BACKUP_PATH}/${MEMORY_DIR}/${REL_PATH}"
                DIFF_COUNT=$((DIFF_COUNT + 1))
            fi
        done < <(find "${WORKSPACE}/${MEMORY_DIR}" -type f -print0)
        
        if [ ${DIFF_COUNT} -eq 0 ]; then
            echo "| ${MEMORY_DIR}/ | NO CHANGES | - |" >> "${MANIFEST_FILE}"
        else
            echo "| ${MEMORY_DIR}/ (${DIFF_COUNT} changed) | OK | - |" >> "${MANIFEST_FILE}"
        fi
    else
        cp -rp "${WORKSPACE}/${MEMORY_DIR}" "${BACKUP_PATH}/${MEMORY_DIR}"
        MEMORY_COUNT=$(find "${BACKUP_PATH}/${MEMORY_DIR}" -type f 2>/dev/null | wc -l)
        echo "| ${MEMORY_DIR}/ (${MEMORY_COUNT} files) | OK | - |" >> "${MANIFEST_FILE}"
    fi
else
    echo "| ${MEMORY_DIR}/ | MISSING | - |" >> "${MANIFEST_FILE}"
    MISSING_COUNT=$((MISSING_COUNT + 1))
fi

# ============================================
# 4. スキルディレクトリをコピー
# ============================================
if [ -d "${WORKSPACE}/${SKILLS_DIR}" ]; then
    cp -rp "${WORKSPACE}/${SKILLS_DIR}" "${BACKUP_PATH}/${SKILLS_DIR}"
    SKILL_COUNT=$(find "${BACKUP_PATH}/${SKILLS_DIR}" -name "SKILL.md" 2>/dev/null | wc -l)
    echo "| ${SKILLS_DIR}/ (${SKILL_COUNT} skills) | OK | - |" >> "${MANIFEST_FILE}"
else
    echo "| ${SKILLS_DIR}/ | MISSING | - |" >> "${MANIFEST_FILE}"
    MISSING_COUNT=$((MISSING_COUNT + 1))
fi

# ============================================
# 5. オプションファイルをコピー
# ============================================
for file in ${OPTIONAL_FILES}; do
    if [ -f "${WORKSPACE}/${file}" ]; then
        cp -p "${WORKSPACE}/${file}" "${BACKUP_PATH}/${file}"
        HASH=$(sha256sum "${BACKUP_PATH}/${file}" | awk '{print $1}')
        PERMS=$(stat -c '%a' "${WORKSPACE}/${file}" 2>/dev/null || stat -f '%Lp' "${WORKSPACE}/${file}" 2>/dev/null || echo "unknown")
        echo "| ${file} | OK | \`${HASH}\` | ${PERMS} |" >> "${MANIFEST_FILE}"
        echo "${PERMS} ${WORKSPACE}/${file}" >> "${PERMISSIONS_FILE}"
    fi
done

# ============================================
# 6. アーカイブメタデータの事前計算
# ============================================
# マニフェストにアーカイブ情報を追加（アーカイブ作成前にメタデータを記録）
echo "" >> "${MANIFEST_FILE}"
echo "## Archive" >> "${MANIFEST_FILE}"
echo "" >> "${MANIFEST_FILE}"
echo "- **Archive:** ${BACKUP_NAME}.tar.gz" >> "${MANIFEST_FILE}"
echo "- **SHA256:** PENDING" >> "${MANIFEST_FILE}"
echo "- **Missing Core Files:** ${MISSING_COUNT}" >> "${MANIFEST_FILE}"
echo "- **Archive Verified:** PENDING" >> "${MANIFEST_FILE}"
echo "- **Encryption:** None" >> "${MANIFEST_FILE}"

# ============================================
# 7. tar.gz アーカイブ作成（サブシェルでcdし、副作用を回避）
# ============================================
(cd "${BACKUP_DIR}" && tar -czf "${BACKUP_PATH}.tar.gz" "${BACKUP_NAME}/")

# ============================================
# 8. 暗号化（オプション）- 強化版
# ============================================
ENCRYPTION_STATUS="None"
if [ "${ENCRYPT}" = true ]; then
    if command -v openssl &>/dev/null; then
        # パスワード取得（環境変数 > コマンドライン > 対話式）
        if [ -z "${BACKUP_PASSWORD}" ]; then
            BACKUP_PASSWORD="${NIKKE_BACKUP_PASSWORD:-}"
        fi
        
        if [ -z "${BACKUP_PASSWORD}" ] && [ -t 0 ]; then
            echo -n "$(nikke_msg MSG_PASSWORD_PROMPT)"
            read -r -s BACKUP_PASSWORD
            echo ""
            if [ ${#BACKUP_PASSWORD} -lt 8 ]; then
                echo "$(nikke_msg MSG_PASSWORD_MIN)"
                exit 1
            fi
        fi
        
        if [ -z "${BACKUP_PASSWORD}" ]; then
            echo "Error: No password provided for encryption"
            exit 1
        fi
        
        ENCRYPTED_FILE="${BACKUP_PATH}.tar.gz.enc"
        openssl enc -aes-256-cbc -salt -pbkdf2 -in "${BACKUP_PATH}.tar.gz" -out "${ENCRYPTED_FILE}" -k "${BACKUP_PASSWORD}" 2>/dev/null
        if [ -f "${ENCRYPTED_FILE}" ]; then
            rm -f "${BACKUP_PATH}.tar.gz"
            ENCRYPTION_STATUS="AES256"
        fi
        
        # パスワードをクリア（メモリから削除）
        unset BACKUP_PASSWORD
    else
        echo "Warning: openssl not found, skipping encryption"
    fi
fi

# ============================================
# 9. アーカイブの整合性チェックとメタデータ更新
# ============================================
ARCHIVE_FILE="${BACKUP_PATH}.tar.gz"
if [ "${ENCRYPT}" = true ] && [ "${ENCRYPTION_STATUS}" = "AES256" ]; then
    ARCHIVE_FILE="${BACKUP_PATH}.tar.gz.enc"
fi

ARCHIVE_HASH=$(sha256sum "${ARCHIVE_FILE}" | awk '{print $1}')

if [ "${ENCRYPT}" = false ]; then
    if ! (cd "${BACKUP_DIR}" && tar -tzf "${BACKUP_PATH}.tar.gz" > /dev/null 2>&1); then
        echo "$(nikke_msg MSG_VERIFY_FAIL)"
        rm -f "${ARCHIVE_FILE}"
        exit 1
    fi
    ARCHIVE_VERIFIED="YES"
else
    ARCHIVE_VERIFIED="ENCRYPTED"
fi

# マニフェストのアーカイブ情報を更新（sedで置換）
sed -i '' "s|^- \*\*Archive:\*\* .*|- **Archive:** $(basename "${ARCHIVE_FILE}")|" "${MANIFEST_FILE}" 2>/dev/null || \
sed -i "s|^- \*\*Archive:\*\* .*|- **Archive:** $(basename "${ARCHIVE_FILE}")|" "${MANIFEST_FILE}"
sed -i '' "s|^- \*\*SHA256:\*\* PENDING|- **SHA256:** ${ARCHIVE_HASH}|" "${MANIFEST_FILE}" 2>/dev/null || \
sed -i "s|^- \*\*SHA256:\*\* PENDING|- **SHA256:** ${ARCHIVE_HASH}|" "${MANIFEST_FILE}"
sed -i '' "s|^- \*\*Archive Verified:\*\* PENDING|- **Archive Verified:** ${ARCHIVE_VERIFIED}|" "${MANIFEST_FILE}" 2>/dev/null || \
sed -i "s|^- \*\*Archive Verified:\*\* PENDING|- **Archive Verified:** ${ARCHIVE_VERIFIED}|" "${MANIFEST_FILE}"
sed -i '' "s|^- \*\*Encryption:\*\* None|- **Encryption:** ${ENCRYPTION_STATUS}|" "${MANIFEST_FILE}" 2>/dev/null || \
sed -i "s|^- \*\*Encryption:\*\* None|- **Encryption:** ${ENCRYPTION_STATUS}|" "${MANIFEST_FILE}"

# 更新されたマニフェストをアーカイブに再追加
# 注意: tar -rf は圧縮アーカイブでは動作しないため、再圧縮
# 再圧縮するとアーカイブハッシュが変わるため、別ファイルで管理
# 最終的なアーカイブを作成
(cd "${BACKUP_DIR}" && tar -czf "${BACKUP_PATH}.tar.gz.new" "${BACKUP_NAME}/" && mv "${BACKUP_PATH}.tar.gz.new" "${BACKUP_PATH}.tar.gz")

# 最終的なアーカイブハッシュを計算して別ファイルで管理
FINAL_ARCHIVE_HASH=$(sha256sum "${BACKUP_PATH}.tar.gz" | awk '{print $1}')
echo "${FINAL_ARCHIVE_HASH}  $(basename "${BACKUP_PATH}.tar.gz")" > "${BACKUP_PATH}/archive.sha256"

# ============================================
# 9. GPG署名（オプション）
# ============================================
SIGNATURE_STATUS="None"
if command -v gpg &>/dev/null; then
    if gpg --list-keys &>/dev/null 2>&1; then
        gpg --batch --yes --detach-sign --armor "${MANIFEST_FILE}" 2>/dev/null && SIGNATURE_STATUS="GPG" || true
    fi
fi

# ============================================
# 10. 自動ローテーション
# ============================================
if [ -d "${BACKUP_DIR}" ]; then
    # 存在するバックアップファイルのみをリスト（globパターンがマッチしない場合の対応）
    BACKUP_LIST=$(find "${BACKUP_DIR}" -maxdepth 1 -type f \( -name "*.tar.gz" -o -name "*.tar.gz.enc" \) 2>/dev/null | sort -r || true)
    if [ -n "${BACKUP_LIST}" ]; then
        BACKUP_COUNT=$(echo "${BACKUP_LIST}" | wc -l)
        if [ ${BACKUP_COUNT} -gt ${MAX_BACKUPS} ]; then
            DELETE_COUNT=$((BACKUP_COUNT - MAX_BACKUPS))
            echo "${BACKUP_LIST}" | tail -n ${DELETE_COUNT} | while read -r old_backup; do
                rm -f "${old_backup}"
                echo "$(nikke_msg MSG_ROTATION_DELETE)$(basename "${old_backup}")"
            done
        fi
    fi
fi

# ============================================
# 11. 完了メッセージ
# ============================================
echo "$(nikke_msg MSG_BACKUP_COMPLETE)$(basename "${ARCHIVE_FILE}")"
echo "SHA256: ${ARCHIVE_HASH}"
echo "Manifest: ${MANIFEST_FILE}"
echo "$(nikke_msg MSG_ROTATION_COUNT)${MAX_BACKUPS}"
echo "$(nikke_msg MSG_ENCRYPTION)${ENCRYPTION_STATUS}"
echo "$(nikke_msg MSG_SIGNATURE)${SIGNATURE_STATUS}"
echo "$(nikke_msg MSG_PERMISSIONS)${PERMISSIONS_FILE}"

if [ ${MISSING_COUNT} -gt 0 ]; then
    echo "$(nikke_msg MSG_MISSING_WARNING)${MISSING_COUNT}$(nikke_msg MSG_MISSING_CORE)"
fi
