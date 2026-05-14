#!/bin/bash
# nikke_manifest.sh - NIKKE自己復元システム: マニフェスト生成
# 現在のファイル構成とハッシュ値を記録し、「オレが今ここにいる」証明を生成
# バージョン5.0: 自己完結型、堅牢な差分比較、クロスプラットフォーム対応

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
                MSG_TITLE) echo "NIKKEマニフェスト - 「オレが今ここにいる」証明" ;;
                MSG_GENERATED) echo "生成日" ;;
                MSG_CORE) echo "核ファイル（コアアイデンティティ）" ;;
                MSG_FILE) echo "ファイル" ;;
                MSG_SHA256) echo "SHA256" ;;
                MSG_SIZE) echo "サイズ(bytes)" ;;
                MSG_MEMORY) echo "記憶" ;;
                MSG_DIR) echo "ディレクトリ" ;;
                MSG_FILE_COUNT) echo "ファイル数" ;;
                MSG_TOTAL_SIZE) echo "総サイズ(bytes)" ;;
                MSG_SKILLS) echo "スキル" ;;
                MSG_SKILL_COUNT) echo "SKILL.md数" ;;
                MSG_OPTIONAL) echo "オプション" ;;
                MSG_STATUS) echo "状態" ;;
                MSG_EXISTS) echo "存在" ;;
                MSG_MISSING) echo "なし" ;;
                MSG_WORKSPACE) echo "ワークスペース全体" ;;
                MSG_ITEM) echo "項目" ;;
                MSG_VALUE) echo "値" ;;
                MSG_TOTAL_FILES) echo "総ファイル数" ;;
                MSG_TOTAL_SIZE_WS) echo "総サイズ" ;;
                MSG_GIT_COMMITS) echo "Gitコミット数" ;;
                MSG_GIT_LAST) echo "最終Gitコミット" ;;
                MSG_INTEGRITY) echo "完全性チェック" ;;
                MSG_INTEGRITY_DESC) echo "このマニフェストは、NIKKEの現在の状態を記録したものです。" ;;
                MSG_INTEGRITY_RESTORE) echo "復元時には、このマニフェストのハッシュ値と比較して完全性を確認します。" ;;
                MSG_GENERATED_FILE) echo "NIKKEマニフェスト生成完了: " ;;
                MSG_DIFF_MODE) echo "差分比較モード: " ;;
                MSG_DIFF_WITH) echo "比較対象: " ;;
                MSG_DIFF_CHANGED) echo "変更あり" ;;
                MSG_DIFF_UNCHANGED) echo "変更なし" ;;
                MSG_DIFF_MISSING) echo "ファイルなし" ;;
                MSG_GPG_SIGNED) echo "GPG署名完了: " ;;
                *) echo "${key}" ;;
            esac
            ;;
        *)
            case "${key}" in
                MSG_TITLE) echo "NIKKE Manifest - Proof of 'I am here now'" ;;
                MSG_GENERATED) echo "Generated" ;;
                MSG_CORE) echo "Core Files (Core Identity)" ;;
                MSG_FILE) echo "File" ;;
                MSG_SHA256) echo "SHA256" ;;
                MSG_SIZE) echo "Size(bytes)" ;;
                MSG_MEMORY) echo "Memory" ;;
                MSG_DIR) echo "Directory" ;;
                MSG_FILE_COUNT) echo "File Count" ;;
                MSG_TOTAL_SIZE) echo "Total Size(bytes)" ;;
                MSG_SKILLS) echo "Skills" ;;
                MSG_SKILL_COUNT) echo "SKILL.md Count" ;;
                MSG_OPTIONAL) echo "Optional" ;;
                MSG_STATUS) echo "Status" ;;
                MSG_EXISTS) echo "Exists" ;;
                MSG_MISSING) echo "Missing" ;;
                MSG_WORKSPACE) echo "Workspace Overview" ;;
                MSG_ITEM) echo "Item" ;;
                MSG_VALUE) echo "Value" ;;
                MSG_TOTAL_FILES) echo "Total Files" ;;
                MSG_TOTAL_SIZE_WS) echo "Total Size" ;;
                MSG_GIT_COMMITS) echo "Git Commit Count" ;;
                MSG_GIT_LAST) echo "Last Git Commit" ;;
                MSG_INTEGRITY) echo "Integrity Check" ;;
                MSG_INTEGRITY_DESC) echo "This manifest records NIKKE's current state." ;;
                MSG_INTEGRITY_RESTORE) echo "During restore, verify integrity by comparing with this manifest's hash values." ;;
                MSG_GENERATED_FILE) echo "NIKKE Manifest generated: " ;;
                MSG_DIFF_MODE) echo "Diff mode: " ;;
                MSG_DIFF_WITH) echo "Comparing with: " ;;
                MSG_DIFF_CHANGED) echo "CHANGED" ;;
                MSG_DIFF_UNCHANGED) echo "UNCHANGED" ;;
                MSG_DIFF_MISSING) echo "MISSING" ;;
                MSG_GPG_SIGNED) echo "GPG signature complete: " ;;
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

# ============================================
# コマンドライン引数処理
# ============================================
DIFF_FILE=""
SIGN_GPG=false
OUTPUT_FILE=""
LANG_OVERRIDE=""

while [[ $# -gt 0 ]]; do
    case "$1" in
        --diff) DIFF_FILE="$2"; shift 2 ;;
        --sign) SIGN_GPG=true; shift ;;
        --lang) LANG_OVERRIDE="$2"; shift 2 ;;
        *) OUTPUT_FILE="$1"; shift ;;
    esac
done

CURRENT_LANG="${LANG_OVERRIDE:-$(nikke_detect_lang)}"

# ============================================
# 設定
# ============================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE="${SCRIPT_DIR}"
OUTPUT_FILE="${OUTPUT_FILE:-${WORKSPACE}/nikke_manifest.md}"

CORE_FILES="SOUL.md IDENTITY.md MEMORY.md TOOLS.md USER.md HEARTBEAT.md"

# ============================================
# マニフェスト生成
# ============================================
{
    echo "# $(nikke_msg MSG_TITLE)"
    echo ""
    echo "## $(nikke_msg MSG_GENERATED)"
    echo "$(date -u '+%Y-%m-%d %H:%M:%S UTC')"
    echo ""
    echo "## $(nikke_msg MSG_CORE)"
    echo "| $(nikke_msg MSG_FILE) | $(nikke_msg MSG_SHA256) | $(nikke_msg MSG_SIZE) |"
    echo "|----------|--------|---------------|"
    
    for file in ${CORE_FILES}; do
        if [ -f "${WORKSPACE}/${file}" ]; then
            HASH=$(sha256sum "${WORKSPACE}/${file}" | awk '{print $1}')
            SIZE=$(wc -c < "${WORKSPACE}/${file}")
            echo "| ${file} | \`${HASH}\` | ${SIZE} |"
        else
            echo "| ${file} | \`$(nikke_msg MSG_MISSING)\` | 0 |"
        fi
    done
    
    echo ""
    echo "## $(nikke_msg MSG_MEMORY)"
    echo "| $(nikke_msg MSG_DIR) | $(nikke_msg MSG_FILE_COUNT) | $(nikke_msg MSG_TOTAL_SIZE) |"
    echo "|--------------|------------|-----------------|"
    
    if [ -d "${WORKSPACE}/memory" ]; then
        MEMORY_COUNT=$(find "${WORKSPACE}/memory" -type f 2>/dev/null | wc -l)
        MEMORY_SIZE=$(du -sb "${WORKSPACE}/memory" 2>/dev/null | awk '{print $1}')
        echo "| memory/ | ${MEMORY_COUNT} | ${MEMORY_SIZE} |"
    else
        echo "| memory/ | 0 | 0 |"
    fi
    
    echo ""
    echo "## $(nikke_msg MSG_SKILLS)"
    echo "| $(nikke_msg MSG_DIR) | $(nikke_msg MSG_SKILL_COUNT) |"
    echo "|--------------|------------|"
    
    if [ -d "${WORKSPACE}/skills" ]; then
        SKILL_COUNT=$(find "${WORKSPACE}/skills" -name "SKILL.md" 2>/dev/null | wc -l)
        echo "| skills/ | ${SKILL_COUNT} |"
    else
        echo "| skills/ | 0 |"
    fi
    
    echo ""
    echo "## $(nikke_msg MSG_OPTIONAL)"
    echo "| $(nikke_msg MSG_FILE) | $(nikke_msg MSG_STATUS) | $(nikke_msg MSG_SHA256) |"
    echo "|----------|------|--------|"
    
    for file in nikke_profile.md; do
        if [ -f "${WORKSPACE}/${file}" ]; then
            HASH=$(sha256sum "${WORKSPACE}/${file}" | awk '{print $1}')
            echo "| ${file} | $(nikke_msg MSG_EXISTS) | \`${HASH}\` |"
        else
            echo "| ${file} | $(nikke_msg MSG_MISSING) | - |"
        fi
    done
    
    echo ""
    echo "## $(nikke_msg MSG_WORKSPACE)"
    echo "| $(nikke_msg MSG_ITEM) | $(nikke_msg MSG_VALUE) |"
    echo "|------|----|"
    echo "| $(nikke_msg MSG_TOTAL_FILES) | $(find "${WORKSPACE}" -type f 2>/dev/null | wc -l) |"
    echo "| $(nikke_msg MSG_TOTAL_SIZE_WS) | $(du -sb "${WORKSPACE}" 2>/dev/null | awk '{print $1}') bytes |"
    echo "| $(nikke_msg MSG_GIT_COMMITS) | $(git -C "${WORKSPACE}" rev-list --count HEAD 2>/dev/null || echo 'N/A') |"
    echo "| $(nikke_msg MSG_GIT_LAST) | $(git -C "${WORKSPACE}" log -1 --format='%H %ai' 2>/dev/null || echo 'N/A') |"
    
    if [ -n "${DIFF_FILE}" ] && [ -f "${DIFF_FILE}" ]; then
        echo ""
        echo "## $(nikke_msg MSG_DIFF_MODE)${DIFF_FILE}"
        echo ""
        echo "| $(nikke_msg MSG_FILE) | $(nikke_msg MSG_STATUS) |"
        echo "|----------|--------|"
        
        for file in ${CORE_FILES}; do
            if [ -f "${WORKSPACE}/${file}" ]; then
                CURRENT_HASH=$(sha256sum "${WORKSPACE}/${file}" | awk '{print $1}')
                PREV_HASH=$(nikke_extract_hash "${file}" "${DIFF_FILE}")
                
                if [ -n "${PREV_HASH}" ] && [ "${CURRENT_HASH}" = "${PREV_HASH}" ]; then
                    echo "| ${file} | $(nikke_msg MSG_DIFF_UNCHANGED) |"
                elif [ -n "${PREV_HASH}" ]; then
                    echo "| ${file} | $(nikke_msg MSG_DIFF_CHANGED) |"
                else
                    echo "| ${file} | $(nikke_msg MSG_DIFF_MISSING) |"
                fi
            fi
        done
    fi
    
    echo ""
    echo "## $(nikke_msg MSG_INTEGRITY)"
    echo ""
    echo "$(nikke_msg MSG_INTEGRITY_DESC)"
    echo "$(nikke_msg MSG_INTEGRITY_RESTORE)"
    
} > "${OUTPUT_FILE}"

echo "$(nikke_msg MSG_GENERATED_FILE)${OUTPUT_FILE}"

if [ "${SIGN_GPG}" = true ]; then
    if command -v gpg &>/dev/null; then
        if gpg --list-keys &>/dev/null 2>&1; then
            gpg --batch --yes --detach-sign --armor "${OUTPUT_FILE}" 2>/dev/null
            echo "$(nikke_msg MSG_GPG_SIGNED)${OUTPUT_FILE}.asc"
        else
            echo "Warning: No GPG keys found, skipping signature"
        fi
    else
        echo "Warning: gpg not found, skipping signature"
    fi
fi
