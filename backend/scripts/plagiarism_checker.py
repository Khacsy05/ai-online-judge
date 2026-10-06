#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AST-based & Token-based Code Plagiarism Checker (Winnowing / N-gram Fingerprinting).
Supports Python, C++, Java, JavaScript/TypeScript.
Normalizes AST structures, ignores identifier names, comments, whitespace, and formatting.
Computes pairwise similarity scores (Jaccard Index & Containment).
"""

import sys
import json
import ast
import re
from typing import List, Dict, Any, Set, Tuple

# Force UTF-8 encoding for Windows console/stdout
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')


# -------------------------------------------------------------
# 1. PYTHON AST NORMALIZER & SERIALIZER
# -------------------------------------------------------------
class PythonASTSerializer(ast.NodeVisitor):
    """
    Serializes a Python AST into a normalized token sequence.
    Renames/masks variable & function identifiers, strips docstrings & comments,
    preserving structural control-flow & expression semantics.
    """
    def __init__(self):
        self.tokens: List[str] = []

    def generic_visit(self, node):
        node_name = type(node).__name__
        # Ignore cosmetic/wrapper nodes
        if node_name not in ('Load', 'Store', 'Del'):
            self.tokens.append(node_name)
        super().generic_visit(node)


def extract_python_ast_tokens(code: str) -> List[str]:
    try:
        tree = ast.parse(code)
        serializer = PythonASTSerializer()
        serializer.visit(tree)
        return serializer.tokens
    except Exception:
        # Fallback to regex tokenization if syntax error
        return extract_generic_tokens(code)


# -------------------------------------------------------------
# 2. C++ / JAVA / GENERIC CODE NORMALIZER
# -------------------------------------------------------------
def extract_generic_tokens(code: str) -> List[str]:
    """
    Tokenizes C++/Java/Generic source code into structural tokens,
    removing comments, strings, identifiers and normalizing keywords/operators.
    """
    # 1. Remove comments
    code = re.sub(r'//.*', '', code)
    code = re.sub(r'/\*[\s\S]*?\*/', '', code)

    # 2. Token definitions
    KEYWORDS = {
        'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue',
        'return', 'int', 'float', 'double', 'char', 'void', 'long', 'short', 'bool',
        'class', 'struct', 'public', 'private', 'protected', 'virtual', 'static',
        'const', 'auto', 'vector', 'string', 'map', 'set', 'include', 'using',
        'namespace', 'std', 'cout', 'cin', 'endl', 'printf', 'scanf', 'import',
        'def', 'elif', 'try', 'except', 'finally', 'with', 'lambda', 'pass'
    }

    OPERATORS = {
        '==', '!=', '<=', '>=', '&&', '||', '++', '--', '+=', '-=', '*=', '/=',
        '<<', '>>', '->', '::', '+', '-', '*', '/', '%', '<', '>', '=', '!', '&', '|', '^', '~'
    }

    token_pattern = re.compile(
        r'(\"[^\"]*\"|\'[^\']*\')|([a-zA-Z_][a-zA-Z0-9_]*)|(==|!=|<=|>=|&&|\|\||\+\+|--|\+=|-=|\*=|/=|<<|>>|->|::|[+\-*/%<>=!&|^~])|([{}()\[\];,])'
    )

    tokens: List[str] = []
    for match in token_pattern.finditer(code):
        string_literal, identifier, operator, punctuation = match.groups()
        if string_literal:
            tokens.append('STR_CONST')
        elif identifier:
            if identifier in KEYWORDS:
                tokens.append(f"KW_{identifier.upper()}")
            else:
                tokens.append('ID')  # Normalized identifier
        elif operator:
            tokens.append(f"OP_{operator}")
        elif punctuation:
            tokens.append(f"PUNC_{punctuation}")

    return tokens


def get_normalized_tokens(code: str, language: str) -> List[str]:
    lang = language.lower() if language else ''
    if 'python' in lang or lang == 'py':
        return extract_python_ast_tokens(code)
    else:
        return extract_generic_tokens(code)


# -------------------------------------------------------------
# 3. K-GRAM & WINNOWING FINGERPRINTING ALGORITHM
# -------------------------------------------------------------
def get_kgrams(tokens: List[str], k: int = 5) -> List[str]:
    """Generates k-grams from token stream."""
    if len(tokens) < k:
        return ["_".join(tokens)] if tokens else []
    return ["_".join(tokens[i:i + k]) for i in range(len(tokens) - k + 1)]


def simple_hash(s: str) -> int:
    h = 0
    for char in s:
        h = (h * 31 + ord(char)) & 0xFFFFFFFF
    return h


def winnowing(kgrams: List[str], window_size: int = 4) -> Set[int]:
    """
    Winnowing algorithm (Stanford MOSS core) to select fingerprint hashes.
    Guarantees matching of any shared substring of sufficient length.
    """
    if not kgrams:
        return set()

    hashes = [simple_hash(kg) for kg in kgrams]
    if len(hashes) < window_size:
        return set(hashes)

    fingerprints: Set[int] = set()
    for i in range(len(hashes) - window_size + 1):
        window = hashes[i:i + window_size]
        min_hash = min(window)
        fingerprints.add(min_hash)

    return fingerprints


def calculate_jaccard_similarity(set_a: Set[int], set_b: Set[int]) -> float:
    if not set_a and not set_b:
        return 0.0
    intersection = len(set_a.intersection(set_b))
    union = len(set_a.union(set_b))
    return (intersection / union) if union > 0 else 0.0


def calculate_containment(subset: Set[int], superset: Set[int]) -> float:
    """Calculates how much of subset is contained inside superset."""
    if not subset:
        return 0.0
    return len(subset.intersection(superset)) / len(subset)


# -------------------------------------------------------------
# 4. MAIN COMPARISON PIPELINE
# -------------------------------------------------------------
def run_plagiarism_check(submissions: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    submissions: list of objects:
    [
      { "id": "sub_1", "userId": "u1", "userName": "Nguyen A", "studentCode": "SV01", "sourceCode": "...", "language": "python" },
      ...
    ]
    """
    if len(submissions) < 2:
        return {
            "totalSubmissions": len(submissions),
            "totalComparisons": 0,
            "suspiciousPairs": [],
            "message": "Cần ít nhất 2 bài nộp để so sánh đạo văn."
        }

    # Step 1: Tokenize & Fingerprint all submissions
    processed = []
    for sub in submissions:
        code = sub.get("sourceCode", "")
        lang = sub.get("language", "python")
        tokens = get_normalized_tokens(code, lang)
        kgrams = get_kgrams(tokens, k=4)
        fingerprints = winnowing(kgrams, window_size=3)
        processed.append({
            "id": sub.get("id"),
            "userId": sub.get("userId"),
            "userName": sub.get("userName", "Sinh viên"),
            "studentCode": sub.get("studentCode", ""),
            "language": lang,
            "codeLength": len(code),
            "tokenCount": len(tokens),
            "fingerprints": fingerprints,
            "sourceCode": code
        })

    # Step 2: Pairwise comparison
    suspicious_pairs = []
    total_comparisons = 0

    for i in range(len(processed)):
        for j in range(i + 1, len(processed)):
            sub_a = processed[i]
            sub_b = processed[j]

            # Don't compare same user's multiple submissions if applicable
            if sub_a["userId"] == sub_b["userId"]:
                continue

            total_comparisons += 1

            fp_a = sub_a["fingerprints"]
            fp_b = sub_b["fingerprints"]

            # If either code is extremely short (e.g. hello world), similarity might be skewed
            if len(fp_a) == 0 or len(fp_b) == 0:
                continue

            jaccard = calculate_jaccard_similarity(fp_a, fp_b)
            containment_a = calculate_containment(fp_a, fp_b)
            containment_b = calculate_containment(fp_b, fp_a)

            # Combined similarity metric (percentage)
            # Take max of Jaccard and containment to catch one student pasting partial code from another
            score = max(jaccard * 100, max(containment_a, containment_b) * 90)
            score_rounded = round(score, 1)

            # We report pairs with similarity >= 40% (Threshold for suspicious inspection)
            if score_rounded >= 40.0:
                # Determine risk level
                if score_rounded >= 80.0:
                    risk = "CRITICAL" # 🚨 Nghi vấn rất cao
                elif score_rounded >= 60.0:
                    risk = "HIGH"     # ⚠️ Tương đồng cấu trúc cao
                else:
                    risk = "MEDIUM"   # ℹ️ Tương đồng một phần

                suspicious_pairs.append({
                    "submissionA": {
                        "id": sub_a["id"],
                        "userId": sub_a["userId"],
                        "userName": sub_a["userName"],
                        "studentCode": sub_a["studentCode"],
                        "tokenCount": sub_a["tokenCount"],
                        "sourceCode": sub_a["sourceCode"]
                    },
                    "submissionB": {
                        "id": sub_b["id"],
                        "userId": sub_b["userId"],
                        "userName": sub_b["userName"],
                        "studentCode": sub_b["studentCode"],
                        "tokenCount": sub_b["tokenCount"],
                        "sourceCode": sub_b["sourceCode"]
                    },
                    "similarity": score_rounded,
                    "jaccardIndex": round(jaccard * 100, 1),
                    "risk": risk
                })

    # Sort suspicious pairs by similarity descending
    suspicious_pairs.sort(key=lambda p: p["similarity"], reverse=True)

    return {
        "totalSubmissions": len(submissions),
        "totalComparisons": total_comparisons,
        "suspiciousCount": len(suspicious_pairs),
        "suspiciousPairs": suspicious_pairs
    }


def main():
    try:
        raw_input = sys.stdin.read()
        if not raw_input.strip():
            print(json.dumps({"error": "Không có dữ liệu đầu vào."}, ensure_ascii=False))
            sys.exit(1)

        data = json.loads(raw_input)
        submissions = data.get("submissions", [])
        result = run_plagiarism_check(submissions)
        print(json.dumps(result, ensure_ascii=False))
    except Exception as e:
        print(json.dumps({"error": f"Lỗi thực thi kiểm tra đạo văn: {str(e)}"}, ensure_ascii=False))
        sys.exit(1)


if __name__ == '__main__':
    main()
