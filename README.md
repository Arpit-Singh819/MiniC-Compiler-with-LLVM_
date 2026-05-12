# MiniC Compiler — Complete Project Guide

## 🎯 Project Overview

**MiniC Compiler** is a mini-to-moderate scale compiler for a subset of C, targeting LLVM IR. Built as a Compiler Design course project demonstrating all major compiler phases.

---

## 📁 Project Structure

```
mini_c_compiler/
├── index.html          ← Interactive Visual Dashboard (open in browser)
├── compiler.js         ← Full compiler engine (JS) for dashboard
├── ui.js               ← Dashboard UI controller
├── minic_compiler.py   ← Python compiler with LLVM backend
├── test_programs/
│   ├── fibonacci.c
│   ├── factorial.c
│   ├── gcd.c
│   └── sorting.c
└── README.md           ← This file
```

---

## 🚀 Quick Start

### Option A — Visual Dashboard (Recommended)
Open `index.html` in any browser. No installation needed.

Features:
- Live token stream viewer
- Interactive AST explorer  
- LLVM IR output with syntax highlighting
- Control Flow Graph visualizer
- Symbol table browser
- Step-by-step compilation mode

### Option B — Python CLI Compiler

```bash
# Run demo (no file needed)
python minic_compiler.py --demo

# Compile a file
python minic_compiler.py test_programs/fibonacci.c

# Emit tokens only
python minic_compiler.py test_programs/gcd.c --emit-tokens

# Emit AST
python minic_compiler.py test_programs/factorial.c --emit-ast

# Emit LLVM IR (default + explicit)
python minic_compiler.py test_programs/gcd.c --emit-ir
```

### Option C — With Real LLVM (if installed)
```bash
# Step 1: Generate LLVM IR
python minic_compiler.py myfile.c > output.ll

# Step 2: Optimize
opt -O2 output.ll -o output_opt.ll

# Step 3: Compile to object
llc -filetype=obj output_opt.ll -o output.o

# Step 4: Link
clang output.o -o program

# Step 5: Run
./program
```

---

## ⚙️ Compiler Architecture

```
Source Code (.c)
      │
      ▼
┌─────────────────────────────────────────┐
│  PHASE 1: LEXICAL ANALYSIS (Lexer)      │
│  • Hand-written DFA                     │
│  • Tokenizes: keywords, identifiers,    │
│    literals, operators, punctuation     │
│  Output: Token Stream                   │
└─────────────────┬───────────────────────┘
                  ▼
┌─────────────────────────────────────────┐
│  PHASE 2: PARSING (Parser)              │
│  • Recursive Descent (LL Grammar)       │
│  • Handles: functions, if/else,         │
│    while, for, expressions              │
│  Output: Abstract Syntax Tree (AST)     │
└─────────────────┬───────────────────────┘
                  ▼
┌─────────────────────────────────────────┐
│  PHASE 3: SEMANTIC ANALYSIS             │
│  • Type checking                        │
│  • Symbol table construction            │
│  • Scope resolution (nested scopes)     │
│  • Undefined variable/function checks   │
│  Output: Annotated AST + Symbol Table   │
└─────────────────┬───────────────────────┘
                  ▼
┌─────────────────────────────────────────┐
│  PHASE 4: LLVM IR CODE GENERATION       │
│  • SSA (Static Single Assignment) form  │
│  • alloca/load/store pattern            │
│  • Branch instructions for control flow │
│  • Function call ABI                    │
│  Output: LLVM IR (.ll file)             │
└─────────────────┬───────────────────────┘
                  ▼
        [LLVM Toolchain — External]
         opt (optimizer) → llc (codegen)
                  ▼
         Native Executable

```

---

## 📐 Supported Language Features

### Types
| Type   | LLVM IR | Size   |
|--------|---------|--------|
| int    | i32     | 32-bit |
| float  | float   | 32-bit |
| char   | i8      | 8-bit  |
| void   | void    | —      |

### Statements
- Variable declaration: `int x;` / `int x = 5;`
- Assignment: `x = expr;`
- If-else: `if (cond) { } else { }`
- While loop: `while (cond) { }`
- For loop: `for (init; cond; update) { }`
- Return: `return expr;`
- Break / Continue
- Function calls

### Expressions
- Arithmetic: `+`, `-`, `*`, `/`, `%`
- Comparison: `==`, `!=`, `<`, `>`, `<=`, `>=`
- Logical: `&&`, `||`, `!`
- Assignment: `=`
- Function calls: `f(a, b)`

### Functions
- Declaration with parameters
- Recursive functions
- Multiple return paths

---

## 🔬 Sample LLVM IR Generated

For `int add(int a, int b) { return a + b; }`:

```llvm
define i32 @add(i32 %a, i32 %b) {
entry:
  %a.addr = alloca i32, align 4
  %b.addr = alloca i32, align 4
  store i32 %a, i32* %a.addr, align 4
  store i32 %b, i32* %b.addr, align 4
  %t0 = load i32, i32* %a.addr, align 4
  %t1 = load i32, i32* %b.addr, align 4
  %t2 = add i32 %t0, %t1
  ret i32 %t2
  ret i32 0
}
```

---

## 🧪 Running Tests

```bash
python minic_compiler.py --demo
```

Expected output shows all 4 phases completing with:
- ✓ Token count
- ✓ AST node count  
- ✓ Symbol resolution
- ✓ IR line count

---

## 📚 Key Concepts Demonstrated

1. **DFA-based Lexer** — Regular expression → state machine tokenization
2. **LL(1) Recursive Descent Parser** — Grammar-driven AST construction
3. **Symbol Table** — Scoped hash map for identifier tracking
4. **Type System** — Basic type inference and checking
5. **SSA Form** — LLVM's Static Single Assignment IR
6. **Control Flow** — Branch instructions, labels, loop constructs
7. **ABI Compliance** — Function parameter passing via alloca/store pattern

---

*MiniC Compiler v1.0 — Compiler Design Project*
