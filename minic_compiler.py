

import sys, re, os
from enum import Enum, auto
from dataclasses import dataclass, field
from typing import Optional, List, Dict, Any

class TT(Enum):
    # Keywords
    INT=auto(); FLOAT=auto(); CHAR=auto(); VOID=auto()
    IF=auto(); ELSE=auto(); WHILE=auto(); FOR=auto()
    RETURN=auto(); BREAK=auto(); CONTINUE=auto()
    # Literals
    INT_LIT=auto(); FLOAT_LIT=auto(); CHAR_LIT=auto(); STRING_LIT=auto()
    # Identifier
    IDENT=auto()
    # Operators
    PLUS=auto(); MINUS=auto(); STAR=auto(); SLASH=auto(); PERCENT=auto()
    EQ=auto(); NEQ=auto(); LT=auto(); GT=auto(); LTE=auto(); GTE=auto()
    AND=auto(); OR=auto(); NOT=auto(); ASSIGN=auto()
    # Punctuation
    LPAREN=auto(); RPAREN=auto(); LBRACE=auto(); RBRACE=auto()
    LBRACKET=auto(); RBRACKET=auto(); SEMICOLON=auto(); COMMA=auto()
    EOF=auto()

KEYWORDS = {
    'int':TT.INT,'float':TT.FLOAT,'char':TT.CHAR,'void':TT.VOID,
    'if':TT.IF,'else':TT.ELSE,'while':TT.WHILE,'for':TT.FOR,
    'return':TT.RETURN,'break':TT.BREAK,'continue':TT.CONTINUE
}

@dataclass
class Token:
    type: TT
    val: str
    line: int
    col: int
    def __repr__(self): return f"Token({self.type.name}, {self.val!r}, L{self.line}:C{self.col})"

#  LEXER

class LexError(Exception):
    def __init__(self, msg, line, col): super().__init__(f"[Lex] L{line}:{col} {msg}"); self.line=line; self.col=col

class Lexer:
    def __init__(self, src: str):
        self.src = src; self.pos = 0; self.line = 1; self.col = 1

    def peek(self, n=0): return self.src[self.pos+n] if self.pos+n < len(self.src) else '\0'
    def advance(self):
        ch = self.src[self.pos]; self.pos += 1
        if ch == '\n': self.line += 1; self.col = 1
        else: self.col += 1
        return ch
    def match(self, ch):
        if self.peek() == ch: self.advance(); return True
        return False

    def tokenize(self) -> List[Token]:
        tokens = []
        while self.pos < len(self.src):
            self._skip_ws_comments()
            if self.pos >= len(self.src): break
            ch = self.peek(); line, col = self.line, self.col
            tok = self._next_token(ch, line, col)
            if tok: tokens.append(tok)
        tokens.append(Token(TT.EOF, '<EOF>', self.line, self.col))
        return tokens

    def _skip_ws_comments(self):
        while self.pos < len(self.src):
            ch = self.peek()
            if ch in ' \t\n\r': self.advance()
            elif ch == '/' and self.peek(1) == '/':
                while self.pos < len(self.src) and self.peek() != '\n': self.advance()
            elif ch == '/' and self.peek(1) == '*':
                self.advance(); self.advance()
                while self.pos < len(self.src):
                    if self.advance() == '*' and self.peek() == '/': self.advance(); break
            else: break

    def _next_token(self, ch, line, col):
        if ch.isdigit(): return self._read_number(line, col)
        if ch == "'": return self._read_char(line, col)
        if ch == '"': return self._read_string(line, col)
        if ch.isalpha() or ch == '_': return self._read_ident(line, col)
        self.advance()
        ops = {
            '+':TT.PLUS,'-':TT.MINUS,'*':TT.STAR,'%':TT.PERCENT,
            '(':TT.LPAREN,')':TT.RPAREN,'{':TT.LBRACE,'}':TT.RBRACE,
            '[':TT.LBRACKET,']':TT.RBRACKET,';':TT.SEMICOLON,',':TT.COMMA
        }
        if ch in ops: return Token(ops[ch], ch, line, col)
        if ch == '/': return Token(TT.SLASH, '/', line, col)
        if ch == '=': return Token(TT.EQ if self.match('=') else TT.ASSIGN, '==' if self.peek(-1+self.pos-self.pos)=='=' else '=', line, col)
        if ch == '!': return Token(TT.NEQ if self.match('=') else TT.NOT, '!=' if True else '!', line, col)
        if ch == '<': return Token(TT.LTE if self.match('=') else TT.LT, '<=' if True else '<', line, col)
        if ch == '>': return Token(TT.GTE if self.match('=') else TT.GT, '>=' if True else '>', line, col)
        if ch == '&' and self.match('&'): return Token(TT.AND, '&&', line, col)
        if ch == '|' and self.match('|'): return Token(TT.OR, '||', line, col)
        raise LexError(f"Unknown character '{ch}'", line, col)

    def _read_number(self, line, col):
        s=''; is_float=False
        while self.pos < len(self.src) and (self.peek().isdigit() or self.peek()=='.'):
            if self.peek()=='.': is_float=True
            s+=self.advance()
        return Token(TT.FLOAT_LIT if is_float else TT.INT_LIT, s, line, col)

    def _read_char(self, line, col):
        self.advance()  # skip '
        ch = self.advance()
        if self.peek() != "'": raise LexError("Unclosed char literal", line, col)
        self.advance()
        return Token(TT.CHAR_LIT, ch, line, col)

    def _read_string(self, line, col):
        self.advance(); s=''
        while self.pos < len(self.src) and self.peek() != '"':
            if self.peek() == '\\': self.advance(); s+=self.advance()
            else: s+=self.advance()
        self.advance()
        return Token(TT.STRING_LIT, s, line, col)

    def _read_ident(self, line, col):
        s=''
        while self.pos < len(self.src) and (self.peek().isalnum() or self.peek()=='_'): s+=self.advance()
        tt = KEYWORDS.get(s, TT.IDENT)
        return Token(tt, s, line, col)


#  AST NODES

@dataclass
class Node: pass

@dataclass
class Program(Node): decls: List[Node]

@dataclass
class FuncDecl(Node):
    ret_type: str; name: str; params: List['Param']; body: 'Block'

@dataclass
class Param(Node): ptype: str; name: str

@dataclass
class VarDecl(Node): vtype: str; name: str; init: Optional[Node]

@dataclass
class Block(Node): stmts: List[Node]

@dataclass
class IfStmt(Node): cond: Node; then: Node; els: Optional[Node]

@dataclass
class WhileStmt(Node): cond: Node; body: Node

@dataclass
class ForStmt(Node): init: Optional[Node]; cond: Optional[Node]; upd: Optional[Node]; body: Node

@dataclass
class ReturnStmt(Node): val: Optional[Node]

@dataclass
class BreakStmt(Node): pass

@dataclass
class ContinueStmt(Node): pass

@dataclass
class ExprStmt(Node): expr: Node

@dataclass
class BinOp(Node): op: str; left: Node; right: Node

@dataclass
class UnaryOp(Node): op: str; operand: Node

@dataclass
class Assign(Node): left: Node; right: Node

@dataclass
class Call(Node): name: str; args: List[Node]

@dataclass
class Var(Node): name: str

@dataclass
class IntLit(Node): val: int

@dataclass
class FloatLit(Node): val: float

@dataclass
class CharLit(Node): val: str

#  PARSER — Recursive Descent

class ParseError(Exception):
    def __init__(self, msg, tok): super().__init__(f"[Parse] L{tok.line}:{tok.col} {msg}"); self.tok=tok

class Parser:
    def __init__(self, tokens: List[Token]):
        self.tokens = tokens; self.pos = 0

    def cur(self) -> Token: return self.tokens[self.pos]
    def peek(self, n=1) -> Token: return self.tokens[min(self.pos+n, len(self.tokens)-1)]
    def consume(self) -> Token: t=self.tokens[self.pos]; self.pos+=1; return t

    def expect(self, tt: TT) -> Token:
        if self.cur().type == tt: return self.consume()
        raise ParseError(f"Expected {tt.name}, got {self.cur().type.name} ('{self.cur().val}')", self.cur())

    def match(self, *tts) -> bool: return self.cur().type in tts
    def is_type(self) -> bool: return self.match(TT.INT, TT.FLOAT, TT.CHAR, TT.VOID)

    def parse(self) -> Program:
        decls = []
        while not self.match(TT.EOF):
            decls.append(self.parse_decl())
        return Program(decls)

    def parse_decl(self) -> Node:
        ret = self.parse_type()
        name = self.expect(TT.IDENT)
        if self.match(TT.LPAREN): return self.parse_func(ret, name.val)
        return self.parse_var_decl(ret, name.val)

    def parse_type(self) -> str:
        if not self.is_type(): raise ParseError(f"Expected type, got '{self.cur().val}'", self.cur())
        return self.consume().val

    def parse_func(self, ret, name) -> FuncDecl:
        self.expect(TT.LPAREN)
        params = []
        if not self.match(TT.RPAREN):
            while True:
                pt = self.parse_type(); pn = self.expect(TT.IDENT)
                params.append(Param(pt, pn.val))
                if not self.match(TT.COMMA): break
                self.consume()
        self.expect(TT.RPAREN)
        body = self.parse_block()
        return FuncDecl(ret, name, params, body)

    def parse_var_decl(self, vtype, name) -> VarDecl:
        init = None
        if self.match(TT.ASSIGN): self.consume(); init = self.parse_expr()
        self.expect(TT.SEMICOLON)
        return VarDecl(vtype, name, init)

    def parse_block(self) -> Block:
        self.expect(TT.LBRACE); stmts=[]
        while not self.match(TT.RBRACE, TT.EOF): stmts.append(self.parse_stmt())
        self.expect(TT.RBRACE)
        return Block(stmts)

    def parse_stmt(self) -> Node:
        t = self.cur().type
        if t == TT.IF: return self.parse_if()
        if t == TT.WHILE: return self.parse_while()
        if t == TT.FOR: return self.parse_for()
        if t == TT.RETURN: return self.parse_return()
        if t == TT.BREAK: self.consume(); self.expect(TT.SEMICOLON); return BreakStmt()
        if t == TT.CONTINUE: self.consume(); self.expect(TT.SEMICOLON); return ContinueStmt()
        if t == TT.LBRACE: return self.parse_block()
        if self.is_type():
            vt=self.parse_type(); nm=self.expect(TT.IDENT); return self.parse_var_decl(vt, nm.val)
        return self.parse_expr_stmt()

    def parse_if(self):
        self.expect(TT.IF); self.expect(TT.LPAREN)
        cond=self.parse_expr(); self.expect(TT.RPAREN)
        then=self.parse_stmt()
        els=None
        if self.match(TT.ELSE): self.consume(); els=self.parse_stmt()
        return IfStmt(cond, then, els)

    def parse_while(self):
        self.expect(TT.WHILE); self.expect(TT.LPAREN)
        cond=self.parse_expr(); self.expect(TT.RPAREN)
        return WhileStmt(cond, self.parse_stmt())

    def parse_for(self):
        self.expect(TT.FOR); self.expect(TT.LPAREN)
        init=None
        if not self.match(TT.SEMICOLON):
            if self.is_type(): vt=self.parse_type(); nm=self.expect(TT.IDENT); init=self.parse_var_decl(vt,nm.val)
            else: init=self.parse_expr_stmt()
        else: self.consume()
        cond=None if self.match(TT.SEMICOLON) else self.parse_expr()
        self.expect(TT.SEMICOLON)
        upd=None if self.match(TT.RPAREN) else self.parse_expr()
        self.expect(TT.RPAREN)
        return ForStmt(init, cond, upd, self.parse_stmt())

    def parse_return(self):
        self.expect(TT.RETURN)
        val=None if self.match(TT.SEMICOLON) else self.parse_expr()
        self.expect(TT.SEMICOLON)
        return ReturnStmt(val)

    def parse_expr_stmt(self):
        e=self.parse_expr(); self.expect(TT.SEMICOLON)
        return ExprStmt(e)

    # Precedence climbing
    def parse_expr(self): return self.parse_assign()
    def parse_assign(self):
        l=self.parse_or()
        if self.match(TT.ASSIGN): self.consume(); return Assign(l, self.parse_assign())
        return l
    def parse_or(self):
        l=self.parse_and()
        while self.match(TT.OR): self.consume(); l=BinOp('||',l,self.parse_and())
        return l
    def parse_and(self):
        l=self.parse_eq()
        while self.match(TT.AND): self.consume(); l=BinOp('&&',l,self.parse_eq())
        return l
    def parse_eq(self):
        l=self.parse_rel()
        while self.match(TT.EQ,TT.NEQ): op=self.consume().val; l=BinOp(op,l,self.parse_rel())
        return l
    def parse_rel(self):
        l=self.parse_add()
        while self.match(TT.LT,TT.GT,TT.LTE,TT.GTE): op=self.consume().val; l=BinOp(op,l,self.parse_add())
        return l
    def parse_add(self):
        l=self.parse_mul()
        while self.match(TT.PLUS,TT.MINUS): op=self.consume().val; l=BinOp(op,l,self.parse_mul())
        return l
    def parse_mul(self):
        l=self.parse_unary()
        while self.match(TT.STAR,TT.SLASH,TT.PERCENT): op=self.consume().val; l=BinOp(op,l,self.parse_unary())
        return l
    def parse_unary(self):
        if self.match(TT.MINUS,TT.NOT): op=self.consume().val; return UnaryOp(op,self.parse_unary())
        return self.parse_primary()
    def parse_primary(self):
        t=self.cur()
        if t.type==TT.INT_LIT: self.consume(); return IntLit(int(t.val))
        if t.type==TT.FLOAT_LIT: self.consume(); return FloatLit(float(t.val))
        if t.type==TT.CHAR_LIT: self.consume(); return CharLit(t.val)
        if t.type==TT.IDENT:
            self.consume()
            if self.match(TT.LPAREN):
                self.consume(); args=[]
                if not self.match(TT.RPAREN):
                    while True:
                        args.append(self.parse_expr())
                        if not self.match(TT.COMMA): break
                        self.consume()
                self.expect(TT.RPAREN)
                return Call(t.val, args)
            return Var(t.val)
        if t.type==TT.LPAREN:
            self.consume(); e=self.parse_expr(); self.expect(TT.RPAREN); return e
        raise ParseError(f"Unexpected token '{t.val}'", t)


#  SEMANTIC ANALYSER

class SemanticError(Exception): pass

class SymbolTable:
    def __init__(self):
        self.scopes: List[Dict] = [{}]
        self.all_symbols = []

    def enter(self): self.scopes.append({})
    def exit(self): self.scopes.pop()

    def define(self, name, info):
        if name in self.scopes[-1]: raise SemanticError(f"Redefinition of '{name}'")
        self.scopes[-1][name]=info
        self.all_symbols.append({**info,'name':name,'scope':'global' if len(self.scopes)==1 else 'local'})

    def lookup(self, name):
        for scope in reversed(self.scopes):
            if name in scope: return scope[name]
        return None

class SemanticAnalyzer:
    def __init__(self):
        self.sym = SymbolTable()
        self.functions = {}
        self.errors = []
        self.current_func = None

    def analyze(self, program: Program):
        for d in program.decls: self._decl(d)
        return self.sym.all_symbols, self.errors

    def _decl(self, node):
        if isinstance(node, FuncDecl):
            self.functions[node.name]={'ret':node.ret_type,'params':node.params}
            try: self.sym.define(node.name,{'vtype':node.ret_type,'kind':'function'})
            except SemanticError as e: self.errors.append(str(e))
            self.sym.enter(); self.current_func=node
            for p in node.params:
                try: self.sym.define(p.name,{'vtype':p.ptype,'kind':'param'})
                except SemanticError as e: self.errors.append(str(e))
            self._block(node.body)
            self.sym.exit(); self.current_func=None
        elif isinstance(node, VarDecl):
            try: self.sym.define(node.name,{'vtype':node.vtype,'kind':'var'})
            except SemanticError as e: self.errors.append(str(e))
            if node.init: self._expr(node.init)

    def _block(self, b: Block):
        for s in b.stmts: self._stmt(s)

    def _stmt(self, node):
        if isinstance(node, Block): self.sym.enter(); self._block(node); self.sym.exit()
        elif isinstance(node, VarDecl):
            try: self.sym.define(node.name,{'vtype':node.vtype,'kind':'var'})
            except SemanticError as e: self.errors.append(str(e))
            if node.init: self._expr(node.init)
        elif isinstance(node, IfStmt):
            self._expr(node.cond); self._stmt(node.then)
            if node.els: self._stmt(node.els)
        elif isinstance(node, WhileStmt): self._expr(node.cond); self._stmt(node.body)
        elif isinstance(node, ForStmt):
            if node.init: self._stmt(node.init)
            if node.cond: self._expr(node.cond)
            if node.upd: self._expr(node.upd)
            self._stmt(node.body)
        elif isinstance(node, ReturnStmt):
            if node.val: self._expr(node.val)
        elif isinstance(node, ExprStmt): self._expr(node.expr)

    def _expr(self, node) -> str:
        if isinstance(node, IntLit): return 'int'
        if isinstance(node, FloatLit): return 'float'
        if isinstance(node, CharLit): return 'char'
        if isinstance(node, Var):
            sym=self.sym.lookup(node.name)
            if not sym: self.errors.append(f"Undefined variable '{node.name}'")
            return sym['vtype'] if sym else 'int'
        if isinstance(node, Assign): self._expr(node.left); return self._expr(node.right)
        if isinstance(node, BinOp): self._expr(node.left); self._expr(node.right); return 'int'
        if isinstance(node, UnaryOp): return self._expr(node.operand)
        if isinstance(node, Call):
            if node.name not in self.functions: self.errors.append(f"Undefined function '{node.name}'")
            for a in node.args: self._expr(a)
            fn=self.functions.get(node.name)
            return fn['ret'] if fn else 'int'
        return 'int'


#  LLVM IR GENERATOR

class LLVMIRGen:
    def __init__(self):
        self.out = []; self.reg = 0; self.label = 0
        self.locals: Dict[str, dict] = {}
        self.break_target = None; self.continue_target = None

    def fresh(self) -> str: r=self.reg; self.reg+=1; return f'%t{r}'
    def fresh_label(self, name='L') -> str: l=self.label; self.label+=1; return f'{name}{l}'
    def emit(self, s): self.out.append(s)

    def map_type(self, t) -> str:
        return {'int':'i32','float':'float','char':'i8','void':'void'}.get(t,'i32')

    def generate(self, program: Program) -> str:
        self.emit('; ModuleID = \'main.c\'')
        self.emit('; source_filename = "main.c"')
        self.emit('; target triple = "x86_64-unknown-linux-gnu"')
        self.emit('; MiniC Compiler — Educational LLVM IR Output')
        self.emit('')
        self.emit('@.str = private unnamed_addr constant [4 x i8] c"%d\\0A\\00"')
        self.emit('')
        self.emit('declare i32 @printf(i8* nocapture readonly, ...)')
        self.emit('declare i32 @scanf(i8* nocapture readonly, ...)')
        self.emit('')
        for d in program.decls:
            if isinstance(d, FuncDecl): self._func(d)
        return '\n'.join(self.out)

    def _func(self, fn: FuncDecl):
        rt = self.map_type(fn.ret_type)
        params = ', '.join(f'{self.map_type(p.ptype)} %{p.name}' for p in fn.params)
        self.emit(f'define {rt} @{fn.name}({params}) {{')
        self.emit('entry:')
        self.locals = {}; self.reg = 0; self.label = 0

        # Alloca + store params
        for p in fn.params:
            ptr = f'%{p.name}.addr'; t = self.map_type(p.ptype)
            self.emit(f'  {ptr} = alloca {t}, align 4')
            self.emit(f'  store {t} %{p.name}, {t}* {ptr}, align 4')
            self.locals[p.name] = {'ptr': ptr, 'type': p.ptype}

        self._block(fn.body)

        # Ensure terminator
        if fn.ret_type == 'void': self.emit('  ret void')
        else: self.emit(f'  ret {rt} 0')
        self.emit('}'); self.emit('')

    def _block(self, block: Block):
        for s in block.stmts: self._stmt(s)

    def _stmt(self, node):
        if isinstance(node, VarDecl):
            t = self.map_type(node.vtype); ptr=f'%{node.name}'
            self.emit(f'  {ptr} = alloca {t}, align 4')
            self.locals[node.name]={'ptr':ptr,'type':node.vtype}
            if node.init:
                v=self._expr(node.init)
                self.emit(f'  store {t} {v}, {t}* {ptr}, align 4')

        elif isinstance(node, ExprStmt): self._expr(node.expr)

        elif isinstance(node, ReturnStmt):
            if node.val: v=self._expr(node.val); self.emit(f'  ret i32 {v}')
            else: self.emit('  ret void')

        elif isinstance(node, IfStmt):
            cond=self._expr(node.cond)
            then_l=self.fresh_label('then'); else_l=self.fresh_label('else'); end_l=self.fresh_label('if.end')
            self.emit(f'  br i1 {cond}, label %{then_l}, label %{else_l if node.els else end_l}')
            self.emit(f'{then_l}:'); self._stmt(node.then); self.emit(f'  br label %{end_l}')
            if node.els:
                self.emit(f'{else_l}:'); self._stmt(node.els); self.emit(f'  br label %{end_l}')
            self.emit(f'{end_l}:')

        elif isinstance(node, WhileStmt):
            cond_l=self.fresh_label('while.cond'); body_l=self.fresh_label('while.body'); end_l=self.fresh_label('while.end')
            old_b,old_c=self.break_target,self.continue_target
            self.break_target=end_l; self.continue_target=cond_l
            self.emit(f'  br label %{cond_l}')
            self.emit(f'{cond_l}:'); cond=self._expr(node.cond)
            self.emit(f'  br i1 {cond}, label %{body_l}, label %{end_l}')
            self.emit(f'{body_l}:'); self._stmt(node.body); self.emit(f'  br label %{cond_l}')
            self.emit(f'{end_l}:')
            self.break_target=old_b; self.continue_target=old_c

        elif isinstance(node, ForStmt):
            if node.init: self._stmt(node.init)
            cond_l=self.fresh_label('for.cond'); body_l=self.fresh_label('for.body'); end_l=self.fresh_label('for.end')
            self.emit(f'  br label %{cond_l}')
            self.emit(f'{cond_l}:')
            if node.cond:
                cond=self._expr(node.cond); self.emit(f'  br i1 {cond}, label %{body_l}, label %{end_l}')
            else: self.emit(f'  br label %{body_l}')
            self.emit(f'{body_l}:'); self._stmt(node.body)
            if node.upd: self._expr(node.upd)
            self.emit(f'  br label %{cond_l}')
            self.emit(f'{end_l}:')

        elif isinstance(node, Block): self._block(node)
        elif isinstance(node, BreakStmt):
            if self.break_target: self.emit(f'  br label %{self.break_target}')
        elif isinstance(node, ContinueStmt):
            if self.continue_target: self.emit(f'  br label %{self.continue_target}')

    def _expr(self, node) -> str:
        if isinstance(node, IntLit): return str(node.val)
        if isinstance(node, FloatLit): return f'{node.val:.6f}'
        if isinstance(node, CharLit): return str(ord(node.val))

        if isinstance(node, Var):
            sym=self.locals.get(node.name)
            if not sym: return '0'
            r=self.fresh(); t=self.map_type(sym['type'])
            self.emit(f'  {r} = load {t}, {t}* {sym["ptr"]}, align 4')
            return r

        if isinstance(node, Assign):
            v=self._expr(node.right)
            if isinstance(node.left, Var):
                sym=self.locals.get(node.left.name)
                if sym:
                    t=self.map_type(sym['type'])
                    self.emit(f'  store {t} {v}, {t}* {sym["ptr"]}, align 4')
            return v

        if isinstance(node, BinOp):
            l=self._expr(node.left); r=self._expr(node.right); res=self.fresh()
            ops={'+':'add','-':'sub','*':'mul','/':'sdiv','%':'srem',
                 '==':'icmp eq','!=':'icmp ne','<':'icmp slt','>':'icmp sgt',
                 '<=':'icmp sle','>=':'icmp sge','&&':'and','||':'or'}
            op=ops.get(node.op,'add')
            self.emit(f'  {res} = {op} i32 {l}, {r}')
            return res

        if isinstance(node, UnaryOp):
            v=self._expr(node.operand); r=self.fresh()
            if node.op=='-': self.emit(f'  {r} = sub i32 0, {v}')
            else: self.emit(f'  {r} = xor i1 {v}, true')
            return r

        if isinstance(node, Call):
            args=[self._expr(a) for a in node.args]
            r=self.fresh()
            arg_str=', '.join(f'i32 {a}' for a in args)
            self.emit(f'  {r} = call i32 @{node.name}({arg_str})')
            return r
        return '0'



# ─────────────────────────────────────────────────────────────
#  PHASE 5 — OPTIMIZER  (IR-level peephole + constant folding)
# ─────────────────────────────────────────────────────────────

class Optimizer:
    """
    Performs several classical optimizations directly on the
    LLVM-IR text produced by LLVMIRGen:

      1. Constant Folding   – evaluate binary ops whose both operands
                              are integer literals at compile time.
      2. Algebraic Identity – x + 0 → x,  x * 1 → x,  x * 0 → 0, etc.
      3. Dead Code Elim.    – remove stores / arithmetic whose result
                              register is never used.
      4. Redundant Load Elim. – if a register is loaded and then
                                immediately reloaded from the same
                                pointer, drop the second load.
    """

    # Arithmetic constant folding table
    _FOLD = {
        'add':  lambda a, b: a + b,
        'sub':  lambda a, b: a - b,
        'mul':  lambda a, b: a * b,
        'sdiv': lambda a, b: a // b if b != 0 else 0,
        'srem': lambda a, b: a %  b if b != 0 else 0,
        'and':  lambda a, b: a & b,
        'or':   lambda a, b: a | b,
    }
    _CMP = {
        'icmp eq':  lambda a, b: int(a == b),
        'icmp ne':  lambda a, b: int(a != b),
        'icmp slt': lambda a, b: int(a <  b),
        'icmp sgt': lambda a, b: int(a >  b),
        'icmp sle': lambda a, b: int(a <= b),
        'icmp sge': lambda a, b: int(a >= b),
    }

    def optimize(self, ir: str) -> str:
        lines = ir.splitlines()
        lines = self._constant_fold(lines)
        lines = self._algebraic_identity(lines)
        lines = self._dead_code_elim(lines)
        lines = self._redundant_load_elim(lines)
        return '\n'.join(lines)

    # ── helpers ──────────────────────────────────────────────

    @staticmethod
    def _is_int(s: str):
        try: return True, int(s)
        except ValueError: return False, 0

    def _constant_fold(self, lines):
        """Replace  %t = add i32 3, 5  →  ; folded: %t = 8  (inline substitution)."""
        import re
        result = []
        constants: Dict[str, int] = {}   # reg → known int value

        bin_pat  = re.compile(r'^\s+(%\w+)\s*=\s*(\w+)\s+i32\s+(-?\w+),\s*(-?\w+)')
        cmp_pat  = re.compile(r'^\s+(%\w+)\s*=\s*(icmp \w+)\s+i32\s+(-?\w+),\s*(-?\w+)')

        def resolve(tok):
            if tok in constants: return True, constants[tok]
            ok, v = self._is_int(tok); return ok, v

        for line in lines:
            # Try binary op fold
            m = bin_pat.match(line)
            if m:
                dst, op, a_s, b_s = m.groups()
                ok_a, a = resolve(a_s); ok_b, b = resolve(b_s)
                if ok_a and ok_b and op in self._FOLD:
                    val = self._FOLD[op](a, b)
                    constants[dst] = val
                    result.append(f'  ; [OPT] constant fold: {dst} = {val}  (was: {op} {a_s},{b_s})')
                    continue

            # Try cmp fold
            m = cmp_pat.match(line)
            if m:
                dst, op, a_s, b_s = m.groups()
                ok_a, a = resolve(a_s); ok_b, b = resolve(b_s)
                if ok_a and ok_b and op in self._CMP:
                    val = self._CMP[op](a, b)
                    constants[dst] = val
                    result.append(f'  ; [OPT] constant fold cmp: {dst} = {val}  (was: {op} {a_s},{b_s})')
                    continue

            # Record any  %t = <integer>  pseudo-assignments that may appear
            lit_pat = re.compile(r'^\s+(%\w+)\s*=\s*(-?\d+)\s*$')
            m2 = lit_pat.match(line)
            if m2:
                constants[m2.group(1)] = int(m2.group(2))

            result.append(line)
        return result

    def _algebraic_identity(self, lines):
        """x+0→x, x*1→x, x*0→0, x-0→x, x/1→x."""
        import re
        result = []
        pat = re.compile(r'^\s+(%\w+)\s*=\s*(add|sub|mul|sdiv|srem)\s+i32\s+(-?\w+),\s*(-?\w+)')
        for line in lines:
            m = pat.match(line)
            if m:
                dst, op, a_s, b_s = m.groups()
                ok_b, b = self._is_int(b_s)
                ok_a, a = self._is_int(a_s)
                replacement = None
                if ok_b:
                    if op in ('add', 'sub') and b == 0: replacement = a_s
                    elif op == 'mul' and b == 1:        replacement = a_s
                    elif op == 'mul' and b == 0:        replacement = '0'
                    elif op in ('sdiv', 'srem') and b == 1: replacement = a_s
                if ok_a:
                    if op == 'add' and a == 0:  replacement = b_s
                    elif op == 'mul' and a == 0: replacement = '0'
                    elif op == 'mul' and a == 1: replacement = b_s
                if replacement is not None:
                    result.append(f'  ; [OPT] algebraic identity: {dst} = {replacement}  (was: {op} {a_s},{b_s})')
                    continue
            result.append(line)
        return result

    def _dead_code_elim(self, lines):
        """Remove IR instructions whose destination register is never used."""
        import re
        def_pat = re.compile(r'^\s+(%\w+)\s*=\s*(?!alloca)')
        # Collect all register definitions
        defined = {}
        for i, line in enumerate(lines):
            m = def_pat.match(line)
            if m: defined[m.group(1)] = i

        # Collect all uses (every occurrence of %tN that is NOT on the LHS)
        used = set()
        for line in lines:
            toks = re.findall(r'(%\w+)', line)
            for j, t in enumerate(toks):
                # First token on a def line is the LHS – count subsequent uses
                used.update(toks[1:])   # crude but safe: keep all after first
                break
            else:
                used.update(re.findall(r'(%\w+)', line))

        # Also mark anything referenced in br / ret / store / call as used
        for line in lines:
            if re.match(r'\s+(br|ret|store|call)', line.strip()):
                used.update(re.findall(r'(%\w+)', line))

        result = []
        dead_indices = set()
        for reg, idx in defined.items():
            if reg not in used:
                dead_indices.add(idx)

        for i, line in enumerate(lines):
            if i in dead_indices:
                result.append(f'  ; [OPT] dead code removed: {line.strip()}')
            else:
                result.append(line)
        return result

    def _redundant_load_elim(self, lines):
        """If we see two consecutive loads from the same pointer, remove the second."""
        import re
        load_pat = re.compile(r'^\s+(%\w+)\s*=\s*load\s+(\w+),\s*(\w+\*)\s*(%\w+),')
        result = []
        last_load = {}   # ptr → (reg, type)
        for line in lines:
            m = load_pat.match(line)
            if m:
                dst, ty, _, ptr = m.groups()
                if ptr in last_load and last_load[ptr][1] == ty:
                    prev_reg = last_load[ptr][0]
                    result.append(f'  ; [OPT] redundant load removed: {dst} (use {prev_reg})')
                    continue
                last_load[ptr] = (dst, ty)
            else:
                # Invalidate on store to that pointer
                store_m = re.match(r'^\s+store\s+\w+\s+%\w+,\s*\w+\*\s*(%\w+)', line)
                if store_m:
                    last_load.pop(store_m.group(1), None)
            result.append(line)
        return result

    def report(self, original_ir: str, optimized_ir: str) -> str:
        orig_lines   = [l for l in original_ir.splitlines()   if l.strip() and not l.strip().startswith(';')]
        opt_lines    = [l for l in optimized_ir.splitlines()  if l.strip() and not l.strip().startswith(';')]
        opt_comments = [l for l in optimized_ir.splitlines()  if '[OPT]' in l]
        lines = [
            f"  ✓ Optimization complete",
            f"    Original IR instructions : {len(orig_lines)}",
            f"    Optimized IR instructions: {len(opt_lines)}",
            f"    Optimizations applied    : {len(opt_comments)}",
        ]
        for c in opt_comments:
            lines.append(f"      {c.strip()}")
        return '\n'.join(lines)


# ─────────────────────────────────────────────────────────────
#  PHASE 6 — x86-64 ASSEMBLY GENERATOR
# ─────────────────────────────────────────────────────────────

class AssemblyGenerator:
    """
    Converts the optimized LLVM-IR text into x86-64 AT&T-syntax assembly.
    This is a simplified but real-looking code generator that:
      - Assigns stack slots (rbp-relative) for every alloca
      - Maps IR virtual registers to temporary stack slots
      - Emits proper function prologues / epilogues
      - Handles: alloca, store, load, arithmetic, icmp, br, ret, call
    """

    def __init__(self):
        self._asm: List[str] = []
        self._slot: Dict[str, int] = {}   # ptr or reg → stack offset (negative)
        self._stack_size = 0
        self._reg_map: Dict[str, str]  = {}   # IR temp → x86 location "-N(%rbp)"
        self._label_map: Dict[str, str] = {}
        self._scratch = ['%rax', '%rbx', '%rcx', '%rdx', '%rsi', '%rdi', '%r8', '%r9', '%r10', '%r11']

    # ── public ───────────────────────────────────────────────

    def generate(self, ir: str) -> str:
        self._asm = []
        self._emit('.file   "minic_output.s"')
        self._emit('.text')
        self._emit('.globl  main')
        self._emit('')

        import re
        lines = [l for l in ir.splitlines() if not l.strip().startswith(';')]
        self._process_functions(lines)
        self._emit('.section .rodata')
        self._emit('.LC0:')
        self._emit('    .string "%d\\n"')
        return '\n'.join(self._asm)

    # ── internals ────────────────────────────────────────────

    def _emit(self, s: str):
        self._asm.append(s)

    def _alloc_slot(self, name: str, size: int = 8) -> str:
        self._stack_size += size
        loc = f'-{self._stack_size}(%rbp)'
        self._slot[name] = self._stack_size
        return loc

    def _loc(self, name: str) -> str:
        if name in self._slot: return f'-{self._slot[name]}(%rbp)'
        try: int(name); return f'${name}'
        except ValueError: pass
        return f'${name}'

    def _process_functions(self, lines):
        import re
        func_def  = re.compile(r'^define\s+\w+\s+@(\w+)\((.*)\)\s*\{')
        alloca_p  = re.compile(r'^\s+(%\w+)\s*=\s*alloca\s+(\w+)')
        store_p   = re.compile(r'^\s+store\s+\w+\s+(-?\w+|%\w+),\s*\w+\*\s*(%\w+)')
        load_p    = re.compile(r'^\s+(%\w+)\s*=\s*load\s+\w+,\s*\w+\*\s*(%\w+)')
        binop_p   = re.compile(r'^\s+(%\w+)\s*=\s*(add|sub|mul|sdiv|srem|and|or)\s+i32\s+(-?[\w.]+),\s*(-?[\w.]+)')
        cmp_p     = re.compile(r'^\s+(%\w+)\s*=\s*(icmp \w+)\s+i32\s+(-?[\w.]+),\s*(-?[\w.]+)')
        br_cond_p = re.compile(r'^\s+br\s+i1\s+(%\w+),\s*label\s+%(\w+),\s*label\s+%(\w+)')
        br_p      = re.compile(r'^\s+br\s+label\s+%(\w+)')
        ret_p     = re.compile(r'^\s+ret\s+\w+\s+(-?[\w.]+)')
        ret_void  = re.compile(r'^\s+ret\s+void')
        call_p    = re.compile(r'^\s+(%\w+)\s*=\s*call\s+\w+\s+@(\w+)\((.*)\)')
        label_p   = re.compile(r'^(\w+):')
        param_p   = re.compile(r'\w+\s+%(\w+)')

        in_func   = False
        func_name = ''
        params    = []

        x86_op = {'add':'addl','sub':'subl','mul':'imull','sdiv':'idivl',
                   'srem':'idivl','and':'andl','or':'orl'}
        cmp_jmp = {'icmp eq':'je','icmp ne':'jne','icmp slt':'jl',
                   'icmp sgt':'jg','icmp sle':'jle','icmp sge':'jge'}

        for raw_line in lines:
            line = raw_line.strip()

            # Function start
            m = func_def.match(raw_line)
            if m:
                in_func = True
                func_name = m.group(1)
                params = param_p.findall(m.group(2))
                self._slot = {}; self._stack_size = 0; self._reg_map = {}
                self._emit(f'.globl  {func_name}')
                self._emit(f'.type   {func_name}, @function')
                self._emit(f'{func_name}:')
                self._emit('    pushq   %rbp')
                self._emit('    movq    %rsp, %rbp')
                # Reserve stack (we'll patch later — use a fixed 128 bytes for safety)
                self._emit('    subq    $128, %rsp')
                # Store params (System-V ABI: rdi, rsi, rdx, rcx, r8, r9)
                arg_regs = ['%edi','%esi','%edx','%ecx','%r8d','%r9d']
                for i, pname in enumerate(params[:6]):
                    loc = self._alloc_slot(pname + '.addr')
                    self._emit(f'    movl    {arg_regs[i]}, {loc}')
                continue

            if not in_func: continue

            if line == '}':
                in_func = False
                self._emit('    leave')
                self._emit('    ret')
                self._emit(f'.size   {func_name}, .-{func_name}')
                self._emit('')
                continue

            # Labels
            m = label_p.match(raw_line)
            if m and not raw_line.startswith(' ') and m.group(1) not in ('define','declare','entry'):
                self._emit(f'.{m.group(1)}:')
                continue
            if line == 'entry:':
                self._emit('    # entry block')
                continue

            # alloca
            m = alloca_p.match(raw_line)
            if m:
                reg, ty = m.groups()
                loc = self._alloc_slot(reg)
                self._emit(f'    # alloca {reg} → {loc}')
                continue

            # store
            m = store_p.match(raw_line)
            if m:
                val_s, ptr = m.groups()
                ptr_loc = self._loc(ptr)
                if val_s.startswith('%'):
                    # load value first into %eax then store
                    v_loc = self._loc(val_s)
                    self._emit(f'    movl    {v_loc}, %eax')
                    self._emit(f'    movl    %eax, {ptr_loc}')
                else:
                    self._emit(f'    movl    ${val_s}, {ptr_loc}')
                continue

            # load
            m = load_p.match(raw_line)
            if m:
                dst, ptr = m.groups()
                ptr_loc = self._loc(ptr)
                dst_loc = self._alloc_slot(dst)
                self._emit(f'    movl    {ptr_loc}, %eax')
                self._emit(f'    movl    %eax, -{self._slot[dst]}(%rbp)   # {dst}')
                continue

            # binary op
            m = binop_p.match(raw_line)
            if m:
                dst, op, a_s, b_s = m.groups()
                dst_loc = self._alloc_slot(dst)
                a_loc = self._loc(a_s)
                b_loc = self._loc(b_s)
                if op in ('sdiv', 'srem'):
                    self._emit(f'    movl    {a_loc}, %eax')
                    self._emit(f'    cltd')
                    self._emit(f'    movl    {b_loc}, %ecx')
                    self._emit(f'    idivl   %ecx')
                    res_reg = '%eax' if op == 'sdiv' else '%edx'
                    self._emit(f'    movl    {res_reg}, {dst_loc}')
                elif op == 'mul':
                    self._emit(f'    movl    {a_loc}, %eax')
                    self._emit(f'    imull   {b_loc}, %eax')
                    self._emit(f'    movl    %eax, {dst_loc}')
                else:
                    instr = x86_op[op]
                    self._emit(f'    movl    {a_loc}, %eax')
                    self._emit(f'    {instr}  {b_loc}, %eax')
                    self._emit(f'    movl    %eax, {dst_loc}')
                continue

            # cmp
            m = cmp_p.match(raw_line)
            if m:
                dst, op, a_s, b_s = m.groups()
                dst_loc = self._alloc_slot(dst)
                a_loc = self._loc(a_s); b_loc = self._loc(b_s)
                self._emit(f'    movl    {a_loc}, %eax')
                self._emit(f'    cmpl    {b_loc}, %eax')
                set_map = {'icmp eq':'sete','icmp ne':'setne','icmp slt':'setl',
                           'icmp sgt':'setg','icmp sle':'setle','icmp sge':'setge'}
                setcc = set_map.get(op, 'sete')
                self._emit(f'    {setcc}  %al')
                self._emit(f'    movzbl  %al, %eax')
                self._emit(f'    movl    %eax, {dst_loc}')
                continue

            # conditional branch
            m = br_cond_p.match(raw_line)
            if m:
                cond_r, true_l, false_l = m.groups()
                cond_loc = self._loc(cond_r)
                self._emit(f'    cmpl    $0, {cond_loc}')
                self._emit(f'    jne     .{true_l}')
                self._emit(f'    jmp     .{false_l}')
                continue

            # unconditional branch
            m = br_p.match(raw_line)
            if m:
                self._emit(f'    jmp     .{m.group(1)}')
                continue

            # call
            m = call_p.match(raw_line)
            if m:
                dst, fn_name, args_str = m.groups()
                import re as _re
                arg_regs_call = ['%edi','%esi','%edx','%ecx','%r8d','%r9d']
                arg_vals = [a.strip() for a in args_str.split(',') if a.strip()]
                for i, av in enumerate(arg_vals[:6]):
                    parts = av.split()
                    val = parts[-1] if parts else '0'
                    v_loc = self._loc(val)
                    self._emit(f'    movl    {v_loc}, {arg_regs_call[i]}')
                self._emit(f'    call    {fn_name}')
                dst_loc = self._alloc_slot(dst)
                self._emit(f'    movl    %eax, {dst_loc}')
                continue

            # ret
            m = ret_void.match(raw_line)
            if m:
                self._emit('    leave')
                self._emit('    ret')
                continue
            m = ret_p.match(raw_line)
            if m:
                val_s = m.group(1)
                v_loc = self._loc(val_s)
                self._emit(f'    movl    {v_loc}, %eax')
                self._emit('    leave')
                self._emit('    ret')
                continue

    def report(self, asm: str) -> str:
        instr = [l for l in asm.splitlines() if l.strip() and not l.strip().startswith(('.','#',';')) and ':' not in l]
        return f"  ✓ Assembly generated — {len(instr)} instruction(s) across all functions"


#  AST PRINTER


def print_ast(node, indent=0):
    pad = '  ' * indent
    if isinstance(node, Program):
        print(f'{pad}Program')
        for d in node.decls: print_ast(d, indent+1)
    elif isinstance(node, FuncDecl):
        print(f'{pad}FuncDecl: {node.ret_type} {node.name}({", ".join(p.ptype+" "+p.name for p in node.params)})')
        print_ast(node.body, indent+1)
    elif isinstance(node, Block):
        print(f'{pad}Block')
        for s in node.stmts: print_ast(s, indent+1)
    elif isinstance(node, VarDecl):
        print(f'{pad}VarDecl: {node.vtype} {node.name}')
        if node.init: print_ast(node.init, indent+1)
    elif isinstance(node, IfStmt):
        print(f'{pad}If'); print_ast(node.cond, indent+1)
        print(f'{pad}  Then:'); print_ast(node.then, indent+2)
        if node.els: print(f'{pad}  Else:'); print_ast(node.els, indent+2)
    elif isinstance(node, WhileStmt):
        print(f'{pad}While'); print_ast(node.cond, indent+1); print_ast(node.body, indent+1)
    elif isinstance(node, ForStmt):
        print(f'{pad}For'); 
        if node.init: print_ast(node.init, indent+1)
        if node.cond: print_ast(node.cond, indent+1)
        if node.upd: print_ast(node.upd, indent+1)
        print_ast(node.body, indent+1)
    elif isinstance(node, ReturnStmt):
        print(f'{pad}Return')
    if node.val: print_ast(node.val, indent+1)
    elif isinstance(node, BinOp):
         print(f'{pad}BinOp {node.op}');
         print_ast(node.left,indent+1);
         print_ast(node.right,indent+1)
    elif isinstance(node, UnaryOp): print(f'{pad}UnaryOp {node.op}'); print_ast(node.operand,indent+1)
    elif isinstance(node, Assign): print(f'{pad}Assign'); print_ast(node.left,indent+1); print_ast(node.right,indent+1)
    elif isinstance(node, Call): 
        print(f'{pad}Call {node.name}');
        [print_ast(a,indent+1) for a in node.args]
    elif isinstance(node, Var): print(f'{pad}Var: {node.name}')
    elif isinstance(node, IntLit): print(f'{pad}IntLit: {node.val}')
    elif isinstance(node, FloatLit): print(f'{pad}FloatLit: {node.val}')
    elif isinstance(node, CharLit): print(f'{pad}CharLit: {node.val!r}')
    elif isinstance(node, ExprStmt): print(f'{pad}ExprStmt'); print_ast(node.expr, indent+1)


#  COMPILER DRIVER

def compile_source(src: str, filename='<stdin>'):
    print(f"\n{'='*58}")
    print(f"  MiniC Compiler — Processing: {filename}")
    print(f"{'='*58}")

    errors = []

    # Phase 1: Lexical Analysis
    print("\n[1/6] Lexical Analysis...")
    try:
        lexer = Lexer(src)
        tokens = lexer.tokenize()
        non_eof = [t for t in tokens if t.type != TT.EOF]
        print(f"  ✓ {len(non_eof)} tokens generated")
    except LexError as e:
        print(f"  ✗ {e}"); errors.append(str(e)); return None, errors

    # Phase 2: Parsing
    print("\n[2/6] Parsing (Recursive Descent)...")
    try:
        parser = Parser(tokens)
        ast = parser.parse()
        func_count = sum(1 for d in ast.decls if isinstance(d, FuncDecl))
        var_count = sum(1 for d in ast.decls if isinstance(d, VarDecl))
        print(f"  ✓ AST built — {func_count} function(s), {var_count} global var(s)")
    except ParseError as e:
        print(f"  ✗ {e}"); errors.append(str(e)); return None, errors

    # Phase 3: Semantic Analysis
    print("\n[3/6] Semantic Analysis...")
    sem = SemanticAnalyzer()
    symbols, sem_errors = sem.analyze(ast)
    if sem_errors:
        for e in sem_errors: print(f"  ✗ [Semantic] {e}"); errors.append(e)
    else:
        print(f"  ✓ {len(symbols)} symbol(s) resolved, no type errors")

    # Phase 4: LLVM IR Generation
    print("\n[4/6] LLVM IR Generation...")
    irgen = LLVMIRGen()
    ir = irgen.generate(ast)
    ir_lines = ir.count('\n')
    print(f"  ✓ {ir_lines} IR lines emitted")

    # Phase 5: Optimization
    print("\n[5/6] Optimization (constant fold / algebraic / DCE / load elim)...")
    optimizer = Optimizer()
    optimized_ir = optimizer.optimize(ir)
    print(optimizer.report(ir, optimized_ir))

    # Phase 6: Assembly Code Generation (x86-64 AT&T syntax)
    print("\n[6/6] Assembly Code Generation (x86-64)...")
    asm_gen = AssemblyGenerator()
    asm = asm_gen.generate(optimized_ir)
    print(asm_gen.report(asm))

    if errors:
        print(f"\n  ✗ Compilation failed: {len(errors)} error(s)")
    else:
        print(f"\n  ✓ Compilation successful!")
        print(f"     → Save IR  : output.ll  (use --emit-ir)")
        print(f"     → Save ASM : output.s   (use --emit-asm)")
        print(f"     → Assemble : as output.s -o output.o")
        print(f"     → Link     : gcc output.o -o program")

    return {
        'ast': ast, 'ir': ir, 'optimized_ir': optimized_ir,
        'asm': asm, 'symbols': symbols, 'tokens': tokens
    }, errors


def main():
    args = sys.argv[1:]

    if '--demo' in args or not args:
        src = '''
int gcd(int a, int b) {
    while (b != 0) {
        int temp;
        temp = b;
        b = a % b;
        a = temp;
    }
    return a;
}

int factorial(int n) {
    if (n <= 1) {
        return 1;
    }
    return n * factorial(n - 1);
}

int main() {
    int g;
    int f;
    g = gcd(48, 18);
    f = factorial(5);
    return 0;
}'''
        result, errors = compile_source(src, 'demo.c')
        if result:
            if '--emit-tokens' in args:
                print("\n── TOKEN STREAM ──────────────────────")
                for t in result['tokens']:
                    if t.type != TT.EOF: print(f"  {t}")
            if '--emit-ast' in args:
                print("\n── ABSTRACT SYNTAX TREE ──────────────")
                print_ast(result['ast'])
            print("\n── LLVM IR (original) ────────────────")
            print(result['ir'])
            print("\n── OPTIMIZED IR ──────────────────────")
            print(result['optimized_ir'])
            print("\n── x86-64 ASSEMBLY ───────────────────")
            print(result['asm'])
            print("\n── SYMBOL TABLE ──────────────────────")
            print(f"  {'Name':<20} {'Type':<10} {'Kind':<10} {'Scope'}")
            print(f"  {'-'*50}")
            for s in result['symbols']:
                print(f"  {s['name']:<20} {s['vtype']:<10} {s['kind']:<10} {s['scope']}")
        return

    filename = args[0]
    if not os.path.exists(filename):
        print(f"Error: file '{filename}' not found"); sys.exit(1)

    with open(filename) as f: src = f.read()
    result, errors = compile_source(src, filename)

    if not result: sys.exit(1)
    if '--emit-tokens' in args:
        for t in result['tokens']:
            if t.type != TT.EOF: print(t)
    if '--emit-ast' in args:
        print("\n── ABSTRACT SYNTAX TREE ──────────────────────")
        print_ast(result['ast'])
    if '--emit-ir' in args:
        print("\n── LLVM IR (original) ────────────────────────")
        print(result['ir'])
    if '--emit-opt' in args:
        print("\n── OPTIMIZED IR ──────────────────────────────")
        print(result['optimized_ir'])
    if '--emit-asm' in args:
        print("\n── x86-64 ASSEMBLY ───────────────────────────")
        print(result['asm'])
    if not any(a in args for a in ('--emit-ir','--emit-opt','--emit-asm','--emit-ast','--emit-tokens')):
        # Default: show optimized IR + assembly
        print("\n── OPTIMIZED IR ──────────────────────────────")
        print(result['optimized_ir'])
        print("\n── x86-64 ASSEMBLY ───────────────────────────")
        print(result['asm'])
    if errors: sys.exit(1)

if __name__ == '__main__':
    main()
