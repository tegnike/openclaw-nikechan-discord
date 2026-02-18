#!/bin/bash
# ニケ暗号 v9 - Nike Cipher (8進数問題修正版)

WORDS=("ニケ" "プニケ" "ノルカス" "ミカゼ" "マスター")

digit_to_word() { echo "${WORDS[$1]}"; }

word_to_digit() {
    case "$1" in
        "ニケ") echo 0 ;;
        "プニケ") echo 1 ;;
        "ノルカス") echo 2 ;;
        "ミカゼ") echo 3 ;;
        "マスター") echo 4 ;;
        *) echo -1 ;;
    esac
}

to_base5() {
    local num=$1 digits=${2:-4} result=""
    for ((i=0; i<digits; i++)); do
        result=$((num % 5))$result
        num=$((num / 5))
    done
    echo "$result"
}

# 文字列として5進数を10進数に変換（先頭0の8進数問題を回避）
from_base5_str() {
    local str="$1"
    local result=0
    local len=${#str}
    local multiplier=1
    
    # 右から左へ処理
    for ((i=len-1; i>=0; i--)); do
        local digit="${str:$i:1}"
        result=$((result + digit * multiplier))
        multiplier=$((multiplier * 5))
    done
    
    echo "$result"
}

encode() {
    local input="$1" output=""
    local hex=$(echo -n "$input" | od -An -tx1 | tr -d ' \n')
    local i=0
    while [ $i -lt ${#hex} ]; do
        local byte="${hex:$i:2}"
        local num=$((16#$byte))
        local base5=$(to_base5 $num 4)
        for ((j=0; j<4; j++)); do
            output+="$(digit_to_word ${base5:$j:1}) "
        done
        output+="| "
        i=$((i + 2))
    done
    echo "${output%| }"
}

decode() {
    local input="$1" hex="" current_digits=""
    
    # トークンごとに処理
    local IFS=' '
    for token in $input; do
        if [ "$token" = "|" ]; then
            # バイト完成 - 文字列として処理
            if [ ${#current_digits} -eq 4 ]; then
                local num=$(from_base5_str "$current_digits")
                hex+=$(printf '%02x' $num)
            fi
            current_digits=""
        else
            local d=$(word_to_digit "$token")
            if [ $d -ge 0 ]; then
                current_digits+=$d
            fi
        fi
    done
    
    # 最後のバイト
    if [ ${#current_digits} -eq 4 ]; then
        local num=$(from_base5_str "$current_digits")
        hex+=$(printf '%02x' $num)
    fi
    
    [ -n "$hex" ] && perl -e "print pack('H*', '$hex')"
}

test() {
    echo "=== ニケ暗号テスト ==="
    
    echo -e "\n1. 'hi' テスト:"
    local e=$(encode "hi")
    echo "  EN: $e"
    echo -n "  DE: "
    decode "$e"
    echo ""
    
    echo -e "\n2. 'Test' テスト:"
    local e2=$(encode "Test")
    echo "  EN: $e2"
    echo -n "  DE: "
    decode "$e2"
    echo ""
    
    echo -e "\n3. 'ニケ' テスト:"
    local e3=$(encode "ニケ")
    echo "  EN: $e3"
    echo -n "  DE: "
    decode "$e3"
    echo ""
    
    echo -e "\n4. 'Hello World!' テスト:"
    local e4=$(encode "Hello World!")
    echo "  EN: $e4"
    echo -n "  DE: "
    decode "$e4"
    echo ""
}

case "$1" in
    encode) encode "$2" ;;
    decode) decode "$2" ;;
    test) test ;;
    *)
        echo "ニケ暗号 v9"
        echo "使い方: $0 {encode|decode|test}"
        echo "単語: ニケ=0 プニケ=1 ノルカス=2 ミカゼ=3 マスター=4"
        ;;
esac
