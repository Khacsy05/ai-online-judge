#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AST Analyzer for Automated Boundary Test Case Generation.
Extracts conditional branches, comparison operators, and boundary targets (BVA)
from reference solution source code (Python & C++).
"""

import sys
import json
import ast
import re

# Force UTF-8 encoding for Windows console/stdout
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

class PythonAstBoundaryVisitor(ast.NodeVisitor):
    def __init__(self):
        self.conditions = []
        self.constants = set()

    def _get_expr_name(self, node):
        if isinstance(node, ast.Name):
            return node.id
        elif isinstance(node, ast.Attribute):
            return f"{self._get_expr_name(node.value)}.{node.attr}"
        elif isinstance(node, ast.Call):
            func_name = self._get_expr_name(node.func)
            args_str = ", ".join(self._get_expr_name(arg) for arg in node.args)
            return f"{func_name}({args_str})"
        elif isinstance(node, ast.Subscript):
            val = self._get_expr_name(node.value)
            return f"{val}[...]"
        elif isinstance(node, ast.Constant):
            return repr(node.value)
        elif isinstance(node, ast.UnaryOp) and isinstance(node.op, ast.USub) and isinstance(node.operand, ast.Constant):
            return f"-{node.operand.value}"
        elif isinstance(node, ast.BinOp):
            return "expression"
        return "expr"

    def _extract_constant_value(self, node):
        if isinstance(node, ast.Constant):
            return node.value
        elif isinstance(node, ast.UnaryOp) and isinstance(node.op, ast.USub) and isinstance(node.operand, ast.Constant):
            if isinstance(node.operand.value, (int, float)):
                return -node.operand.value
        return None

    def visit_Constant(self, node):
        if isinstance(node.value, (int, float)):
            self.constants.add(node.value)
        self.generic_visit(node)

    def visit_Compare(self, node):
        left_str = self._get_expr_name(node.left)
        if left_str in ("__name__",):
            self.generic_visit(node)
            return

        line_num = getattr(node, 'lineno', 1)

        op_map = {
            ast.Eq: "==",
            ast.NotEq: "!=",
            ast.Lt: "<",
            ast.LtE: "<=",
            ast.Gt: ">",
            ast.GtE: ">=",
            ast.Is: "is",
            ast.IsNot: "is not",
            ast.In: "in",
            ast.NotIn: "not in"
        }

        for op, comparator in zip(node.ops, node.comparators):
            op_str = op_map.get(type(op), "?")
            comp_str = self._get_expr_name(comparator)
            const_val = self._extract_constant_value(comparator)

            full_expr = f"{left_str} {op_str} {comp_str}"
            bva_candidates = []
            category = "general_comparison"

            # Check if this is a length check (e.g. len(arr) == 0)
            if "len(" in left_str:
                category = "collection_size_boundary"
                if const_val == 0:
                    bva_candidates = ["empty (len=0)", "single-element (len=1)"]
                elif const_val == 1:
                    bva_candidates = ["single-element (len=1)", "empty (len=0)", "multiple-elements (len=2+)"]
                elif isinstance(const_val, int):
                    bva_candidates = [f"len={const_val-1}", f"len={const_val}", f"len={const_val+1}"]

            # Check if numeric boundary
            elif isinstance(const_val, (int, float)):
                category = "numeric_boundary"
                self.constants.add(const_val)
                if isinstance(const_val, int):
                    if op_str in ("<", "<="):
                        bva_candidates = [const_val - 1, const_val, const_val + 1]
                    elif op_str in (">", ">="):
                        bva_candidates = [const_val - 1, const_val, const_val + 1]
                    elif op_str in ("==", "!="):
                        bva_candidates = [const_val - 1, const_val, const_val + 1]
                else:
                    bva_candidates = [round(const_val - 0.1, 2), const_val, round(const_val + 0.1, 2)]

            self.conditions.append({
                "line": line_num,
                "expression": full_expr,
                "variable": left_str,
                "operator": op_str,
                "constant": const_val,
                "bva_candidates": bva_candidates,
                "category": category
            })

        self.generic_visit(node)


def analyze_python_code(source_code: str):
    try:
        tree = ast.parse(source_code)
        visitor = PythonAstBoundaryVisitor()
        visitor.visit(tree)

        # Common algorithmic boundary constants to always include
        common_bounds = [0, 1, -1]
        for b in common_bounds:
            visitor.constants.add(b)

        return {
            "success": True,
            "language": "python",
            "conditions": visitor.conditions,
            "special_constants": sorted(list(visitor.constants), key=lambda x: (isinstance(x, str), x)),
            "summary": f"Đã trích xuất {len(visitor.conditions)} điều kiện rẽ nhánh và {len(visitor.constants)} mốc giá trị biên từ AST."
        }
    except SyntaxError as e:
        return {
            "success": False,
            "language": "python",
            "error": f"Lỗi cú pháp Python tại dòng {e.lineno}: {e.msg}",
            "conditions": [],
            "special_constants": [0, 1, -1]
        }


def analyze_cpp_code(source_code: str):
    """
    Regex-based AST & Pattern Extractor for C/C++ solution codes.
    Extracts conditional branches like if (x <= 0), while (left <= right), etc.
    """
    conditions = []
    constants = set([0, 1, -1])

    pattern = re.compile(r'\b(if|while)\s*\(\s*([^()]+)\s*\)')
    comp_pattern = re.compile(r'([a-zA-Z0-9_\[\].()]+)\s*(<=|>=|==|!=|<|>)\s*([a-zA-Z0-9_().-]+)')

    lines = source_code.splitlines()
    for idx, line in enumerate(lines, 1):
        for match in pattern.finditer(line):
            expr = match.group(2).strip()
            comp_match = comp_pattern.search(expr)
            if comp_match:
                left_var = comp_match.group(1).strip()
                op = comp_match.group(2).strip()
                right_val = comp_match.group(3).strip()

                const_val = None
                try:
                    const_val = int(right_val)
                    constants.add(const_val)
                except ValueError:
                    try:
                        const_val = float(right_val)
                        constants.add(const_val)
                    except ValueError:
                        pass

                bva_candidates = []
                if isinstance(const_val, int):
                    bva_candidates = [const_val - 1, const_val, const_val + 1]

                conditions.append({
                    "line": idx,
                    "expression": expr,
                    "variable": left_var,
                    "operator": op,
                    "constant": const_val,
                    "bva_candidates": bva_candidates,
                    "category": "numeric_boundary" if isinstance(const_val, (int, float)) else "structural_boundary"
                })

    return {
        "success": True,
        "language": "cpp",
        "conditions": conditions,
        "special_constants": sorted(list(constants), key=lambda x: (isinstance(x, str), x)),
        "summary": f"Đã trích xuất {len(conditions)} điều kiện rẽ nhánh từ mã nguồn C++."
    }


def main():
    try:
        source_code = ""
        language = "python"

        if len(sys.argv) > 1:
            arg = sys.argv[1]
            # If argument is a file path
            import os
            if os.path.exists(arg):
                with open(arg, "r", encoding="utf-8") as f:
                    source_code = f.read()
                if len(sys.argv) > 2:
                    language = sys.argv[2].lower()
            else:
                # Could be a JSON string
                try:
                    data = json.loads(arg)
                    source_code = str(data.get("sourceCode", ""))
                    language = str(data.get("language", "python")).lower()
                except Exception:
                    source_code = arg
        else:
            raw_input = sys.stdin.read()
            if not raw_input.strip():
                print(json.dumps({"success": False, "error": "Không có mã nguồn đầu vào."}))
                return

            try:
                data = json.loads(raw_input)
                source_code = str(data.get("sourceCode", ""))
                language = str(data.get("language", "python")).lower()
            except Exception:
                source_code = raw_input

        if not source_code:
            print(json.dumps({"success": False, "error": "Mã nguồn rỗng."}))
            return

        if language in ("python", "py", "python3"):
            result = analyze_python_code(source_code)
        elif language in ("cpp", "c++", "c", "java"):
            result = analyze_cpp_code(source_code)
        else:
            result = analyze_python_code(source_code)

        print(json.dumps(result, ensure_ascii=False, indent=2))
    except Exception as e:
        print(json.dumps({
            "success": False,
            "error": f"Lỗi trong quá trình phân tích AST: {str(e)}",
            "conditions": [],
            "special_constants": [0, 1, -1]
        }))


if __name__ == "__main__":
    main()
