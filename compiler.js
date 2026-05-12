
// ─────────────────────────────────────────────────────────────
//  TOKEN TYPES
// ─────────────────────────────────────────────────────────────
const TT = {
  // Keywords
  INT:'INT', FLOAT:'FLOAT', CHAR:'CHAR', VOID:'VOID',
  IF:'IF', ELSE:'ELSE', WHILE:'WHILE', FOR:'FOR',
  RETURN:'RETURN', BREAK:'BREAK', CONTINUE:'CONTINUE',
  // Literals
  INT_LIT:'INT_LIT', FLOAT_LIT:'FLOAT_LIT', CHAR_LIT:'CHAR_LIT', STRING_LIT:'STRING_LIT',
  // Identifiers
  IDENT:'IDENT',
  // Operators
  PLUS:'PLUS', MINUS:'MINUS', STAR:'STAR', SLASH:'SLASH', PERCENT:'PERCENT',
  EQ:'EQ', NEQ:'NEQ', LT:'LT', GT:'GT', LTE:'LTE', GTE:'GTE',
  AND:'AND', OR:'OR', NOT:'NOT',
  ASSIGN:'ASSIGN',
  // Punctuation
  LPAREN:'LPAREN', RPAREN:'RPAREN',
  LBRACE:'LBRACE', RBRACE:'RBRACE',
  LBRACKET:'LBRACKET', RBRACKET:'RBRACKET',
  SEMICOLON:'SEMICOLON', COMMA:'COMMA',
  EOF:'EOF'
};

const KEYWORDS = {
  'int':TT.INT,'float':TT.FLOAT,'char':TT.CHAR,'void':TT.VOID,
  'if':TT.IF,'else':TT.ELSE,'while':TT.WHILE,'for':TT.FOR,
  'return':TT.RETURN,'break':TT.BREAK,'continue':TT.CONTINUE
};

// ─────────────────────────────────────────────────────────────
//  LEXER
// ─────────────────────────────────────────────────────────────
class Lexer {
  constructor(src) {
    this.src = src; this.pos = 0; this.line = 1; this.col = 1;
    this.tokens = []; this.errors = [];
  }

  peek() { return this.src[this.pos]; }
  advance() {
    const ch = this.src[this.pos++];
    if(ch==='\n'){this.line++;this.col=1;}else{this.col++;}
    return ch;
  }
  match(ch) {
    if(this.src[this.pos]===ch){this.advance();return true;}return false;
  }

  tokenize() {
    while(this.pos < this.src.length) {
      this.skipWS();
      if(this.pos >= this.src.length) break;
      const ch = this.peek();
      const line = this.line, col = this.col;

      // Single-line comment
      if(ch==='/' && this.src[this.pos+1]==='/') {
        while(this.peek() && this.peek()!=='\n') this.advance();
        continue;
      }
      // Block comment
      if(ch==='/' && this.src[this.pos+1]==='*') {
        this.advance(); this.advance();
        while(this.pos<this.src.length) {
          if(this.advance()==='*' && this.peek()==='/'){this.advance();break;}
        }
        continue;
      }

      // Numbers
      if(/\d/.test(ch)) { this.readNumber(line, col); continue; }
      // Strings / chars
      if(ch==="'") { this.readChar(line, col); continue; }
      if(ch==='"') { this.readString(line, col); continue; }
      // Identifiers / keywords
      if(/[a-zA-Z_]/.test(ch)) { this.readIdent(line, col); continue; }

      // Operators & punctuation
      this.advance();
      switch(ch) {
        case '+': this.tok(TT.PLUS,'+',line,col); break;
        case '-': this.tok(TT.MINUS,'-',line,col); break;
        case '*': this.tok(TT.STAR,'*',line,col); break;
        case '/': this.tok(TT.SLASH,'/',line,col); break;
        case '%': this.tok(TT.PERCENT,'%',line,col); break;
        case '=': { const isEq = this.match('='); this.tok(isEq?TT.EQ:TT.ASSIGN, isEq?'==':'=', line, col); break; }
        case '!': { const isNeq = this.match('='); this.tok(isNeq?TT.NEQ:TT.NOT, isNeq?'!=':'!', line, col); break; }
        case '<': { const isLte = this.match('='); this.tok(isLte?TT.LTE:TT.LT, isLte?'<=':'<', line, col); break; }
        case '>': { const isGte = this.match('='); this.tok(isGte?TT.GTE:TT.GT, isGte?'>=':'>', line, col); break; }
        case '&': this.match('&'); this.tok(TT.AND,'&&',line,col); break;
        case '|': this.match('|'); this.tok(TT.OR,'||',line,col); break;
        case '(': this.tok(TT.LPAREN,'(',line,col); break;
        case ')': this.tok(TT.RPAREN,')',line,col); break;
        case '{': this.tok(TT.LBRACE,'{',line,col); break;
        case '}': this.tok(TT.RBRACE,'}',line,col); break;
        case '[': this.tok(TT.LBRACKET,'[',line,col); break;
        case ']': this.tok(TT.RBRACKET,']',line,col); break;
        case ';': this.tok(TT.SEMICOLON,';',line,col); break;
        case ',': this.tok(TT.COMMA,',',line,col); break;
        default: this.errors.push({line, col, msg:`Unknown character '${ch}'`});
      }
    }
    this.tok(TT.EOF,'<EOF>',this.line,this.col);
    return this.tokens;
  }

  tok(type, val, line, col) { this.tokens.push({type, val, line, col}); }

  skipWS() { while(this.pos<this.src.length && /\s/.test(this.peek())) this.advance(); }

  readNumber(line, col) {
    let s=''; let isFloat=false;
    while(this.pos<this.src.length && /[\d.]/.test(this.peek())) {
      if(this.peek()==='.') isFloat=true;
      s+=this.advance();
    }
    this.tok(isFloat?TT.FLOAT_LIT:TT.INT_LIT, s, line, col);
  }

  readChar(line, col) {
    this.advance(); // skip '
    const ch = this.advance();
    if(this.peek()!=="'") this.errors.push({line,col,msg:'Unclosed char literal'});
    else this.advance();
    this.tok(TT.CHAR_LIT, ch, line, col);
  }

  readString(line, col) {
    this.advance(); // skip "
    let s='';
    while(this.pos<this.src.length && this.peek()!=='"') {
      if(this.peek()==='\\') {
        this.advance();
        const esc = this.advance();
        if(esc==='n') s+='\n';
        else if(esc==='t') s+='\t';
        else if(esc==='\\') s+='\\';
        else if(esc==='"') s+='"';
        else s+=esc;
      } else {
        s+=this.advance();
      }
    }
    if(this.peek()!=='"') this.errors.push({line,col,msg:'Unclosed string literal'});
    else this.advance();
    this.tok(TT.STRING_LIT, s, line, col);
  }

  readIdent(line, col) {
    let s='';
    while(this.pos<this.src.length && /[a-zA-Z0-9_]/.test(this.peek())) s+=this.advance();
    const type = KEYWORDS[s] || TT.IDENT;
    this.tok(type, s, line, col);
  }
}

// ─────────────────────────────────────────────────────────────
//  AST NODE TYPES
// ─────────────────────────────────────────────────────────────
const mk = (type, props={}) => ({type, ...props});

// ─────────────────────────────────────────────────────────────
//  PARSER (Recursive Descent)
// ─────────────────────────────────────────────────────────────
class Parser {
  constructor(tokens) {
    this.tokens = tokens; this.pos = 0; this.errors = [];
  }
  cur() { return this.tokens[this.pos]; }
  peek(n=1) { return this.tokens[this.pos+n]; }
  consume() { return this.tokens[this.pos++]; }
  expect(type) {
    if(this.cur().type===type) return this.consume();
    const t=this.cur();
    this.errors.push({line:t.line, col:t.col, msg:`Expected ${type}, got ${t.type} ('${t.val}')`});
    return {type, val:'', line:t.line, col:t.col};
  }
  match(...types) { return types.includes(this.cur().type); }
  isType() { return this.match(TT.INT,TT.FLOAT,TT.CHAR,TT.VOID); }

  parse() {
    const decls=[];
    while(!this.match(TT.EOF)) {
      try { decls.push(this.parseDecl()); }
      catch(e) { this.errors.push({line:0,col:0,msg:e.message}); this.consume(); }
    }
    return mk('Program', {decls});
  }

  parseDecl() {
    const type = this.parseType();
    const name = this.expect(TT.IDENT);
    if(this.cur().type===TT.LPAREN) return this.parseFuncDecl(type, name);
    return this.parseVarDecl(type, name);
  }

  parseType() {
    if(!this.isType()) {
      const t=this.cur();
      this.errors.push({line:t.line,col:t.col,msg:`Expected type, got '${t.val}'`});
    }
    return this.consume().val;
  }

  parseFuncDecl(retType, name) {
    this.expect(TT.LPAREN);
    const params=[];
    if(!this.match(TT.RPAREN)) {
      do {
        const pt=this.parseType();
        const pn=this.expect(TT.IDENT);
        params.push(mk('Param',{ptype:pt, name:pn.val}));
      } while(this.cur().type===TT.COMMA && this.consume());
    }
    this.expect(TT.RPAREN);
    const body = this.parseBlock();
    return mk('FuncDecl',{retType, name:name.val, params, body});
  }

  parseVarDecl(vtype, name) {
    let init=null;
    if(this.cur().type===TT.ASSIGN) { this.consume(); init=this.parseExpr(); }
    this.expect(TT.SEMICOLON);
    return mk('VarDecl',{vtype, name:name.val, init});
  }

  parseBlock() {
    this.expect(TT.LBRACE);
    const stmts=[];
    while(!this.match(TT.RBRACE,TT.EOF)) {
      stmts.push(this.parseStmt());
    }
    this.expect(TT.RBRACE);
    return mk('Block',{stmts});
  }

  parseStmt() {
    switch(this.cur().type) {
      case TT.IF: return this.parseIf();
      case TT.WHILE: return this.parseWhile();
      case TT.FOR: return this.parseFor();
      case TT.RETURN: return this.parseReturn();
      case TT.LBRACE: return this.parseBlock();
      case TT.BREAK: this.consume(); this.expect(TT.SEMICOLON); return mk('Break');
      case TT.CONTINUE: this.consume(); this.expect(TT.SEMICOLON); return mk('Continue');
      default:
        if(this.isType()) {
          const t=this.parseType();
          const n=this.expect(TT.IDENT);
          return this.parseVarDecl(t,n);
        }
        return this.parseExprStmt();
    }
  }

  parseIf() {
    this.expect(TT.IF); this.expect(TT.LPAREN);
    const cond=this.parseExpr();
    this.expect(TT.RPAREN);
    const then=this.parseStmt();
    let els=null;
    if(this.cur().type===TT.ELSE){this.consume(); els=this.parseStmt();}
    return mk('If',{cond, then, els});
  }

  parseWhile() {
    this.expect(TT.WHILE); this.expect(TT.LPAREN);
    const cond=this.parseExpr();
    this.expect(TT.RPAREN);
    const body=this.parseStmt();
    return mk('While',{cond,body});
  }

  parseFor() {
    this.expect(TT.FOR); this.expect(TT.LPAREN);
    let init=null;
    if(!this.match(TT.SEMICOLON)){
      if(this.isType()){const t=this.parseType();const n=this.expect(TT.IDENT);init=this.parseVarDecl(t,n);}
      else{init=this.parseExprStmt();}
    }else this.expect(TT.SEMICOLON);
    const cond=this.match(TT.SEMICOLON)?null:this.parseExpr();
    this.expect(TT.SEMICOLON);
    const upd=this.match(TT.RPAREN)?null:this.parseExpr();
    this.expect(TT.RPAREN);
    const body=this.parseStmt();
    return mk('For',{init,cond,upd,body});
  }

  parseReturn() {
    this.expect(TT.RETURN);
    const val=this.match(TT.SEMICOLON)?null:this.parseExpr();
    this.expect(TT.SEMICOLON);
    return mk('Return',{val});
  }

  parseExprStmt() {
    const e=this.parseExpr();
    this.expect(TT.SEMICOLON);
    return mk('ExprStmt',{expr:e});
  }

  parseExpr() { return this.parseAssign(); }

  parseAssign() {
    const left=this.parseOr();
    if(this.cur().type===TT.ASSIGN) {
      this.consume();
      const right=this.parseAssign();
      return mk('Assign',{left,right});
    }
    return left;
  }

  parseOr() {
    let l=this.parseAnd();
    while(this.cur().type===TT.OR){this.consume();l=mk('BinOp',{op:'||',left:l,right:this.parseAnd()});}
    return l;
  }
  parseAnd() {
    let l=this.parseEq();
    while(this.cur().type===TT.AND){this.consume();l=mk('BinOp',{op:'&&',left:l,right:this.parseEq()});}
    return l;
  }
  parseEq() {
    let l=this.parseRel();
    while(this.match(TT.EQ,TT.NEQ)){const op=this.consume().val;l=mk('BinOp',{op,left:l,right:this.parseRel()});}
    return l;
  }
  parseRel() {
    let l=this.parseAdd();
    while(this.match(TT.LT,TT.GT,TT.LTE,TT.GTE)){const op=this.consume().val;l=mk('BinOp',{op,left:l,right:this.parseAdd()});}
    return l;
  }
  parseAdd() {
    let l=this.parseMul();
    while(this.match(TT.PLUS,TT.MINUS)){const op=this.consume().val;l=mk('BinOp',{op,left:l,right:this.parseMul()});}
    return l;
  }
  parseMul() {
    let l=this.parseUnary();
    while(this.match(TT.STAR,TT.SLASH,TT.PERCENT)){const op=this.consume().val;l=mk('BinOp',{op,left:l,right:this.parseUnary()});}
    return l;
  }
  parseUnary() {
    if(this.match(TT.MINUS,TT.NOT)){const op=this.consume().val;return mk('UnaryOp',{op,operand:this.parseUnary()});}
    return this.parsePrimary();
  }
  parsePrimary() {
    const t=this.cur();
    if(t.type===TT.INT_LIT){this.consume();return mk('IntLit',{val:parseInt(t.val)});}
    if(t.type===TT.FLOAT_LIT){this.consume();return mk('FloatLit',{val:parseFloat(t.val)});}
    if(t.type===TT.CHAR_LIT){this.consume();return mk('CharLit',{val:t.val});}
    if(t.type===TT.STRING_LIT){this.consume();return mk('StringLit',{val:t.val});}
    if(t.type===TT.IDENT) {
      this.consume();
      if(this.cur().type===TT.LPAREN) {
        this.consume();
        const args=[];
        if(!this.match(TT.RPAREN)) {
          do { args.push(this.parseExpr()); } while(this.cur().type===TT.COMMA && this.consume());
        }
        this.expect(TT.RPAREN);
        return mk('Call',{name:t.val,args});
      }
      return mk('Var',{name:t.val});
    }
    if(t.type===TT.LPAREN){
      this.consume();const e=this.parseExpr();this.expect(TT.RPAREN);return e;
    }
    this.errors.push({line:t.line,col:t.col,msg:`Unexpected token '${t.val}'`});
    this.consume();
    return mk('IntLit',{val:0});
  }
}

// ─────────────────────────────────────────────────────────────
//  SEMANTIC ANALYSER (Type Checking + Symbol Table)
// ─────────────────────────────────────────────────────────────
class SemanticAnalyzer {
  constructor() {
    this.scopes = [new Map()]; // stack of scope maps
    this.functions = new Map();
    this.errors = []; this.symbols = [];
    this.currentFunc = null;
  }

  enter() { this.scopes.push(new Map()); }
  exit()  { this.scopes.pop(); }

  define(name, info) {
    const top = this.scopes[this.scopes.length-1];
    if(top.has(name)) this.errors.push(`Redefinition of '${name}'`);
    top.set(name, info);
    this.symbols.push({name, ...info, scope: this.scopes.length===1?'global':'local'});
  }

  lookup(name) {
    for(let i=this.scopes.length-1;i>=0;i--) {
      if(this.scopes[i].has(name)) return this.scopes[i].get(name);
    }
    return null;
  }

  analyze(ast) {
    for(const d of ast.decls) this.analyzeDecl(d);
    return {errors:this.errors, symbols:this.symbols};
  }

  analyzeDecl(node) {
    if(node.type==='FuncDecl') {
      this.functions.set(node.name, {retType:node.retType, params:node.params});
      this.define(node.name, {vtype:node.retType, kind:'function'});
      this.enter();
      this.currentFunc = node;
      for(const p of node.params) this.define(p.name, {vtype:p.ptype, kind:'param'});
      this.analyzeBlock(node.body);
      this.exit();
      this.currentFunc = null;
    } else if(node.type==='VarDecl') {
      this.define(node.name, {vtype:node.vtype, kind:'var'});
      if(node.init) this.analyzeExpr(node.init);
    }
  }

  analyzeBlock(block) {
    for(const s of block.stmts) this.analyzeStmt(s);
  }

  analyzeStmt(node) {
    switch(node.type) {
      case 'Block': this.enter(); this.analyzeBlock(node); this.exit(); break;
      case 'VarDecl': this.define(node.name,{vtype:node.vtype,kind:'var'}); if(node.init) this.analyzeExpr(node.init); break;
      case 'If': this.analyzeExpr(node.cond); this.analyzeStmt(node.then); if(node.els) this.analyzeStmt(node.els); break;
      case 'While': this.analyzeExpr(node.cond); this.analyzeStmt(node.body); break;
      case 'For':
        if(node.init) this.analyzeStmt(node.init);
        if(node.cond) this.analyzeExpr(node.cond);
        if(node.upd) this.analyzeExpr(node.upd);
        this.analyzeStmt(node.body);
        break;
      case 'Return': if(node.val) this.analyzeExpr(node.val); break;
      case 'ExprStmt': this.analyzeExpr(node.expr); break;
    }
  }

  analyzeExpr(node) {
    if(!node) return 'void';
    switch(node.type) {
      case 'IntLit': return 'int';
      case 'FloatLit': return 'float';
      case 'CharLit': return 'char';
      case 'StringLit': return 'char*';
      case 'Var': {
        const sym=this.lookup(node.name);
        if(!sym) this.errors.push(`Undefined variable '${node.name}'`);
        return sym?.vtype||'int';
      }
      case 'Assign': {
        const lt=this.analyzeExpr(node.left);
        const rt=this.analyzeExpr(node.right);
        if(lt!==rt&&lt&&rt) {} // mild type mismatch warning
        return lt;
      }
      case 'BinOp':
        this.analyzeExpr(node.left); this.analyzeExpr(node.right); return 'int';
      case 'UnaryOp': return this.analyzeExpr(node.operand);
      case 'Call': {
        if(node.name === 'printf') {
          for(const a of node.args) this.analyzeExpr(a);
          return 'int';
        }
        const fn=this.functions.get(node.name);
        if(!fn) this.errors.push(`Undefined function '${node.name}'`);
        for(const a of node.args) this.analyzeExpr(a);
        return fn?.retType||'int';
      }
    }
    return 'int';
  }
}

// ─────────────────────────────────────────────────────────────
//  LLVM IR GENERATOR
// ─────────────────────────────────────────────────────────────
class LLVMIRGen {
  constructor() {
    this.out=[]; this.reg=0; this.label=0;
    this.locals=new Map(); this.globals=new Map();
    this.lines=0;
  }

  fresh() { return `%t${this.reg++}`; }
  freshLabel(name='L') { return `${name}${this.label++}`; }
  emit(s) { this.out.push(s); this.lines++; }

  generate(ast) {
    this.emit('; ModuleID = \'main.c\'');
    this.emit('; Mini C Compiler — LLVM IR Output');
    this.emit('; Target: x86_64-unknown-linux-gnu');
    this.emit('');
    this.emit('declare i32 @printf(i8* nocapture, ...)');
    this.emit('');
    for(const d of ast.decls) {
      if(d.type==='FuncDecl') this.genFunc(d);
    }
    return this.out.join('\n');
  }

  genFunc(fn) {
    const retT = this.mapType(fn.retType);
    const params = fn.params.map(p=>`${this.mapType(p.ptype)} %${p.name}`).join(', ');
    this.emit(`define ${retT} @${fn.name}(${params}) {`);
    this.emit('entry:');
    this.locals = new Map();
    this.reg = 0; this.label = 0;

    // Alloca params
    for(const p of fn.params) {
      const al=`%${p.name}.addr`;
      this.emit(`  ${al} = alloca ${this.mapType(p.ptype)}, align 4`);
      this.emit(`  store ${this.mapType(p.ptype)} %${p.name}, ${this.mapType(p.ptype)}* ${al}, align 4`);
      this.locals.set(p.name, {ptr:al, type:p.ptype});
    }

    this.genBlock(fn.body);

    // Default return
    if(fn.retType==='void') this.emit('  ret void');
    else this.emit(`  ret ${retT} 0`);

    this.emit('}');
    this.emit('');
  }

  genBlock(block) {
    for(const s of block.stmts) this.genStmt(s);
  }

  genStmt(node) {
    switch(node.type) {
      case 'VarDecl': {
        const ptr=`%${node.name}`;
        const t=this.mapType(node.vtype);
        this.emit(`  ${ptr} = alloca ${t}, align 4`);
        this.locals.set(node.name,{ptr,type:node.vtype});
        if(node.init) {
          const v=this.genExpr(node.init);
          this.emit(`  store ${t} ${v}, ${t}* ${ptr}, align 4`);
        }
        break;
      }
      case 'ExprStmt': this.genExpr(node.expr); break;
      case 'Return': {
        if(node.val) {
          const v=this.genExpr(node.val);
          this.emit(`  ret i32 ${v}`);
        } else this.emit('  ret void');
        break;
      }
      case 'If': {
        const cond=this.genExpr(node.cond);
        const thenL=this.freshLabel('then');
        const elseL=this.freshLabel('else');
        const endL=this.freshLabel('end');
        this.emit(`  br i1 ${cond}, label %${thenL}, label %${node.els?elseL:endL}`);
        this.emit(`${thenL}:`);
        this.genStmt(node.then);
        this.emit(`  br label %${endL}`);
        if(node.els){
          this.emit(`${elseL}:`);
          this.genStmt(node.els);
          this.emit(`  br label %${endL}`);
        }
        this.emit(`${endL}:`);
        break;
      }
      case 'While': {
        const condL=this.freshLabel('while.cond');
        const bodyL=this.freshLabel('while.body');
        const endL=this.freshLabel('while.end');
        this.emit(`  br label %${condL}`);
        this.emit(`${condL}:`);
        const cond=this.genExpr(node.cond);
        this.emit(`  br i1 ${cond}, label %${bodyL}, label %${endL}`);
        this.emit(`${bodyL}:`);
        this.genStmt(node.body);
        this.emit(`  br label %${condL}`);
        this.emit(`${endL}:`);
        break;
      }
      case 'For': {
        if(node.init) this.genStmt(node.init);
        const condL=this.freshLabel('for.cond');
        const bodyL=this.freshLabel('for.body');
        const endL=this.freshLabel('for.end');
        this.emit(`  br label %${condL}`);
        this.emit(`${condL}:`);
        if(node.cond){const c=this.genExpr(node.cond);this.emit(`  br i1 ${c}, label %${bodyL}, label %${endL}`);}
        else this.emit(`  br label %${bodyL}`);
        this.emit(`${bodyL}:`);
        this.genStmt(node.body);
        if(node.upd) this.genExpr(node.upd);
        this.emit(`  br label %${condL}`);
        this.emit(`${endL}:`);
        break;
      }
      case 'Block': this.genBlock(node); break;
    }
  }

  genExpr(node) {
    switch(node.type) {
      case 'IntLit': return `${node.val}`;
      case 'FloatLit': return `${node.val}`;
      case 'StringLit': return `getelementptr inbounds ([${node.val.length+1} x i8], [${node.val.length+1} x i8]* @.str, i64 0, i64 0)`;
      case 'Var': {
        const sym=this.locals.get(node.name);
        if(!sym) return `0`;
        const r=this.fresh();
        this.emit(`  ${r} = load ${this.mapType(sym.type)}, ${this.mapType(sym.type)}* ${sym.ptr}, align 4`);
        return r;
      }
      case 'Assign': {
        const v=this.genExpr(node.right);
        const sym=this.locals.get(node.left?.name);
        if(sym) this.emit(`  store ${this.mapType(sym.type)} ${v}, ${this.mapType(sym.type)}* ${sym.ptr}, align 4`);
        return v;
      }
      case 'BinOp': {
        const l=this.genExpr(node.left);
        const r=this.genExpr(node.right);
        const res=this.fresh();
        const ops={'+':`add`,'−':'sub','-':'sub','*':'mul','/':'sdiv','%':'srem',
                   '==':'icmp eq','!=':'icmp ne','<':'icmp slt','>':'icmp sgt',
                   '<=':'icmp sle','>=':'icmp sge','&&':'and','||':'or'};
        const op=ops[node.op]||'add';
        if(op.startsWith('icmp')) {
          this.emit(`  ${res} = ${op} i32 ${l}, ${r}`);
        } else {
          this.emit(`  ${res} = ${op} i32 ${l}, ${r}`);
        }
        return res;
      }
      case 'UnaryOp': {
        const v=this.genExpr(node.operand);
        const r=this.fresh();
        if(node.op==='-') this.emit(`  ${r} = sub i32 0, ${v}`);
        else this.emit(`  ${r} = xor i1 ${v}, true`);
        return r;
      }
      case 'Call': {
        if(node.name === 'printf') {
          const args=node.args.map(a=>this.genExpr(a));
          const r=this.fresh();
          const argStr=args.length>0 ? `, i32 `+args.slice(1).join(', i32 ') : '';
          this.emit(`  ${r} = call i32 (i8*, ...) @printf(i8* ${args[0]}${argStr})`);
          return r;
        }
        const args=node.args.map(a=>this.genExpr(a));
        const r=this.fresh();
        const argStr=args.map(a=>`i32 ${a}`).join(', ');
        this.emit(`  ${r} = call i32 @${node.name}(${argStr})`);
        return r;
      }
    }
    return '0';
  }

  mapType(t) {
    return {int:'i32',float:'float',char:'i8',void:'void'}[t]||'i32';
  }
}

// ─────────────────────────────────────────────────────────────
//  AST OPTIMIZER
// ─────────────────────────────────────────────────────────────
class ASTOptimizer {
  constructor() {
    this.optimizedNodes = 0;
  }

  optimize(ast) {
    if (ast && ast.decls) {
      ast.decls = ast.decls.map(d => this.optDecl(d));
    }
    return ast;
  }

  optDecl(node) {
    if (node.type === 'FuncDecl') {
      node.body = this.optStmt(node.body);
    } else if (node.type === 'VarDecl') {
      if (node.init) node.init = this.optExpr(node.init);
    }
    return node;
  }

  optBlock(node) {
    let stmts = [];
    for (let s of node.stmts) {
      let optS = this.optStmt(s);
      if (optS) {
        stmts.push(optS);
        if (optS.type === 'Return' || optS.type === 'Break' || optS.type === 'Continue') {
          if (s !== node.stmts[node.stmts.length - 1]) this.optimizedNodes++;
          break;
        }
      }
    }
    node.stmts = stmts;
    return node;
  }

  optStmt(node) {
    if (!node) return null;
    switch (node.type) {
      case 'Block': return this.optBlock(node);
      case 'ExprStmt':
        node.expr = this.optExpr(node.expr);
        return node;
      case 'Return':
        if (node.val) node.val = this.optExpr(node.val);
        return node;
      case 'If':
        node.cond = this.optExpr(node.cond);
        node.then = this.optStmt(node.then);
        if (node.els) node.els = this.optStmt(node.els);
        if (node.cond.type === 'IntLit' || node.cond.type === 'FloatLit') {
           this.optimizedNodes++;
           if (node.cond.val) return node.then;
           return node.els || null;
        }
        return node;
      case 'While':
        node.cond = this.optExpr(node.cond);
        node.body = this.optStmt(node.body);
        if ((node.cond.type === 'IntLit' || node.cond.type === 'FloatLit') && !node.cond.val) {
          this.optimizedNodes++;
          return null;
        }
        return node;
      case 'For':
        if (node.init) node.init = this.optStmt(node.init);
        if (node.cond) node.cond = this.optExpr(node.cond);
        if (node.upd) node.upd = this.optExpr(node.upd);
        node.body = this.optStmt(node.body);
        if (node.cond && (node.cond.type === 'IntLit' || node.cond.type === 'FloatLit') && !node.cond.val) {
           this.optimizedNodes++;
           return node.init || null;
        }
        return node;
      case 'VarDecl':
        if (node.init) node.init = this.optExpr(node.init);
        return node;
    }
    return node;
  }

  optExpr(node) {
    if (!node) return null;
    switch (node.type) {
      case 'UnaryOp':
        node.operand = this.optExpr(node.operand);
        if (node.operand.type === 'IntLit' || node.operand.type === 'FloatLit') {
          this.optimizedNodes++;
          if (node.op === '-') return mk(node.operand.type, { val: -node.operand.val });
          if (node.op === '!') return mk(node.operand.type, { val: !node.operand.val ? 1 : 0 });
        }
        return node;
      case 'BinOp':
        node.left = this.optExpr(node.left);
        node.right = this.optExpr(node.right);
        if ((node.left.type === 'IntLit' || node.left.type === 'FloatLit') && 
            (node.right.type === 'IntLit' || node.right.type === 'FloatLit')) {
          this.optimizedNodes++;
          let l = node.left.val, r = node.right.val;
          let resType = (node.left.type === 'FloatLit' || node.right.type === 'FloatLit') ? 'FloatLit' : 'IntLit';
          switch (node.op) {
            case '+': return mk(resType, { val: l + r });
            case '-': return mk(resType, { val: l - r });
            case '*': return mk(resType, { val: l * r });
            case '/': return mk(resType, { val: l / r });
            case '%': return mk(resType, { val: l % r });
            case '==': return mk('IntLit', { val: l == r ? 1 : 0 });
            case '!=': return mk('IntLit', { val: l != r ? 1 : 0 });
            case '<': return mk('IntLit', { val: l < r ? 1 : 0 });
            case '>': return mk('IntLit', { val: l > r ? 1 : 0 });
            case '<=': return mk('IntLit', { val: l <= r ? 1 : 0 });
            case '>=': return mk('IntLit', { val: l >= r ? 1 : 0 });
            case '&&': return mk('IntLit', { val: (l && r) ? 1 : 0 });
            case '||': return mk('IntLit', { val: (l || r) ? 1 : 0 });
          }
        }
        return node;
      case 'Assign':
        node.right = this.optExpr(node.right);
        return node;
      case 'Call':
        node.args = node.args.map(a => this.optExpr(a));
        return node;
    }
    return node;
  }
}

// ─────────────────────────────────────────────────────────────
//  X86-64 ASSEMBLY GENERATOR
// ─────────────────────────────────────────────────────────────
class X86CodeGen {
  constructor() {
    this.out = []; this.labelCount = 0; this.strings = [];
    this.locals = new Map(); this.localOffset = 0;
  }

  emit(s) { this.out.push(s); }
  freshLabel(prefix) { return `.${prefix}${this.labelCount++}`; }

  generate(ast) {
    this.emit('  .text');
    this.emit('  .intel_syntax noprefix');
    this.emit('  .globl main\n');

    for (const d of ast.decls) {
      if (d.type === 'FuncDecl') this.genFunc(d);
    }

    if (this.strings.length > 0) {
      this.emit('\n  .data');
      for (let i = 0; i < this.strings.length; i++) {
        this.emit(`.str${i}:`);
        this.emit(`  .asciz "${this.strings[i].replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`);
      }
    }
    return this.out.join('\n');
  }

  genFunc(fn) {
    this.emit(`${fn.name}:`);
    this.emit('  push rbp');
    this.emit('  mov rbp, rsp');
    
    this.locals = new Map();
    this.localOffset = 0;
    const registers = ['edi', 'esi', 'edx', 'ecx', 'r8d', 'r9d'];
    for (let i = 0; i < fn.params.length; i++) {
      this.localOffset += 4;
      this.locals.set(fn.params[i].name, -this.localOffset);
    }
    this.scanLocals(fn.body);
    
    let stackSize = Math.ceil(this.localOffset / 16) * 16;
    if (stackSize > 0) this.emit(`  sub rsp, ${stackSize}`);

    for (let i = 0; i < fn.params.length; i++) {
      let offset = this.locals.get(fn.params[i].name);
      if (i < 6) this.emit(`  mov DWORD PTR [rbp${offset}], ${registers[i]}`);
    }

    this.genStmt(fn.body);

    this.emit('  mov eax, 0');
    this.emit('  mov rsp, rbp');
    this.emit('  pop rbp');
    this.emit('  ret\n');
  }

  scanLocals(node) {
    if (!node) return;
    if (node.type === 'VarDecl') {
      this.localOffset += 4;
      this.locals.set(node.name, -this.localOffset);
    } else if (node.type === 'Block') {
      for (const s of node.stmts) this.scanLocals(s);
    } else if (node.type === 'If') {
      this.scanLocals(node.then);
      this.scanLocals(node.els);
    } else if (node.type === 'While' || node.type === 'For') {
      if (node.init) this.scanLocals(node.init);
      this.scanLocals(node.body);
    }
  }

  genStmt(node) {
    if (!node) return;
    switch (node.type) {
      case 'Block':
        for (const s of node.stmts) this.genStmt(s);
        break;
      case 'VarDecl':
        if (node.init) {
          this.genExpr(node.init);
          this.emit('  pop rax');
          let offset = this.locals.get(node.name);
          this.emit(`  mov DWORD PTR [rbp${offset}], eax`);
        }
        break;
      case 'ExprStmt':
        this.genExpr(node.expr);
        this.emit('  pop rax');
        break;
      case 'Return':
        if (node.val) {
          this.genExpr(node.val);
          this.emit('  pop rax');
        }
        this.emit('  mov rsp, rbp');
        this.emit('  pop rbp');
        this.emit('  ret');
        break;
      case 'If': {
        const elsLbl = this.freshLabel('else');
        const endLbl = this.freshLabel('end');
        this.genExpr(node.cond);
        this.emit('  pop rax');
        this.emit('  cmp rax, 0');
        this.emit(`  je ${node.els ? elsLbl : endLbl}`);
        this.genStmt(node.then);
        this.emit(`  jmp ${endLbl}`);
        if (node.els) {
          this.emit(`${elsLbl}:`);
          this.genStmt(node.els);
        }
        this.emit(`${endLbl}:`);
        break;
      }
      case 'While': {
        const startLbl = this.freshLabel('while_start');
        const endLbl = this.freshLabel('while_end');
        this.emit(`${startLbl}:`);
        this.genExpr(node.cond);
        this.emit('  pop rax');
        this.emit('  cmp rax, 0');
        this.emit(`  je ${endLbl}`);
        this.genStmt(node.body);
        this.emit(`  jmp ${startLbl}`);
        this.emit(`${endLbl}:`);
        break;
      }
      case 'For': {
        const startLbl = this.freshLabel('for_start');
        const endLbl = this.freshLabel('for_end');
        if (node.init) this.genStmt(node.init);
        this.emit(`${startLbl}:`);
        if (node.cond) {
          this.genExpr(node.cond);
          this.emit('  pop rax');
          this.emit('  cmp rax, 0');
          this.emit(`  je ${endLbl}`);
        }
        this.genStmt(node.body);
        if (node.upd) {
          this.genExpr(node.upd);
          this.emit('  pop rax');
        }
        this.emit(`  jmp ${startLbl}`);
        this.emit(`${endLbl}:`);
        break;
      }
    }
  }

  genExpr(node) {
    if (!node) return;
    switch (node.type) {
      case 'IntLit':
      case 'FloatLit':
        this.emit(`  push ${node.val|0}`);
        break;
      case 'CharLit':
        this.emit(`  push ${node.val.charCodeAt(0)}`);
        break;
      case 'StringLit': {
        const id = this.strings.length;
        this.strings.push(node.val);
        this.emit(`  lea rax, .str${id}[rip]`);
        this.emit(`  push rax`);
        break;
      }
      case 'Var': {
        let offset = this.locals.get(node.name);
        if (offset !== undefined) {
          this.emit('  mov eax, 0');
          this.emit(`  mov eax, DWORD PTR [rbp${offset}]`);
          this.emit(`  push rax`);
        } else {
          this.emit(`  push 0`);
        }
        break;
      }
      case 'Assign': {
        this.genExpr(node.right);
        let offset = this.locals.get(node.left.name);
        if (offset !== undefined) {
          this.emit('  pop rax');
          this.emit(`  mov DWORD PTR [rbp${offset}], eax`);
          this.emit('  push rax');
        }
        break;
      }
      case 'BinOp': {
        if (node.op === '&&') {
          const falseLbl = this.freshLabel('and_false');
          const endLbl = this.freshLabel('and_end');
          this.genExpr(node.left);
          this.emit('  pop rax');
          this.emit('  cmp rax, 0');
          this.emit(`  je ${falseLbl}`);
          this.genExpr(node.right);
          this.emit('  pop rax');
          this.emit('  cmp rax, 0');
          this.emit(`  je ${falseLbl}`);
          this.emit('  push 1');
          this.emit(`  jmp ${endLbl}`);
          this.emit(`${falseLbl}:`);
          this.emit('  push 0');
          this.emit(`${endLbl}:`);
          return;
        }
        if (node.op === '||') {
          const trueLbl = this.freshLabel('or_true');
          const endLbl = this.freshLabel('or_end');
          this.genExpr(node.left);
          this.emit('  pop rax');
          this.emit('  cmp rax, 0');
          this.emit(`  jne ${trueLbl}`);
          this.genExpr(node.right);
          this.emit('  pop rax');
          this.emit('  cmp rax, 0');
          this.emit(`  jne ${trueLbl}`);
          this.emit('  push 0');
          this.emit(`  jmp ${endLbl}`);
          this.emit(`${trueLbl}:`);
          this.emit('  push 1');
          this.emit(`${endLbl}:`);
          return;
        }

        this.genExpr(node.left);
        this.genExpr(node.right);
        this.emit('  pop rbx');
        this.emit('  pop rax');
        switch (node.op) {
          case '+': this.emit('  add eax, ebx'); this.emit('  push rax'); break;
          case '-': this.emit('  sub eax, ebx'); this.emit('  push rax'); break;
          case '*': this.emit('  imul eax, ebx'); this.emit('  push rax'); break;
          case '/': 
            this.emit('  cdq');
            this.emit('  idiv ebx');
            this.emit('  push rax');
            break;
          case '%':
            this.emit('  cdq');
            this.emit('  idiv ebx');
            this.emit('  push rdx');
            break;
          case '==': case '!=': case '<': case '>': case '<=': case '>=':
            this.emit('  cmp eax, ebx');
            const setcc = { '==':'sete', '!=':'setne', '<':'setl', '>':'setg', '<=':'setle', '>=':'setge' }[node.op];
            this.emit(`  ${setcc} al`);
            this.emit('  movzx eax, al');
            this.emit('  push rax');
            break;
        }
        break;
      }
      case 'UnaryOp': {
        this.genExpr(node.operand);
        this.emit('  pop rax');
        if (node.op === '-') {
          this.emit('  neg eax');
          this.emit('  push rax');
        } else if (node.op === '!') {
          this.emit('  cmp eax, 0');
          this.emit('  sete al');
          this.emit('  movzx eax, al');
          this.emit('  push rax');
        }
        break;
      }
      case 'Call': {
        const registers = ['rdi', 'rsi', 'rdx', 'rcx', 'r8', 'r9'];
        for (let i = 0; i < node.args.length; i++) this.genExpr(node.args[i]);
        for (let i = node.args.length - 1; i >= 0; i--) {
          if (i < 6) this.emit(`  pop ${registers[i]}`);
          else this.emit(`  pop rax`);
        }
        this.emit('  mov rax, rsp');
        this.emit('  and rax, 15');
        this.emit('  jz .Lcall_aligned_' + this.labelCount);
        this.emit('  sub rsp, 8');
        this.emit('  call ' + (node.name === 'printf' ? 'printf' : node.name));
        this.emit('  add rsp, 8');
        this.emit('  jmp .Lcall_end_' + this.labelCount);
        this.emit('.Lcall_aligned_' + this.labelCount + ':');
        this.emit('  call ' + (node.name === 'printf' ? 'printf' : node.name));
        this.emit('.Lcall_end_' + this.labelCount + ':');
        this.labelCount++;
        this.emit('  push rax');
        break;
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────
//  MAIN COMPILER DRIVER
// ─────────────────────────────────────────────────────────────
function compile(src) {
  const result = {
    tokens:[], ast:null, symbols:[],
    ir:'', asm:'', errors:[], lexErrors:[], parseErrors:[], semErrors:[],
    irLines:0, optNodes:0, asmLines:0
  };

  // Phase 1: Lexing
  const lexer = new Lexer(src);
  result.tokens = lexer.tokenize();
  result.lexErrors = lexer.errors;

  // Phase 2: Parsing
  const parser = new Parser(result.tokens);
  result.ast = parser.parse();
  result.parseErrors = parser.errors;

  // Phase 3: Semantic Analysis
  const sem = new SemanticAnalyzer();
  const semRes = sem.analyze(result.ast);
  result.symbols = semRes.symbols;
  result.semErrors = semRes.errors;

  // Phase 4: Optimizer
  const opt = new ASTOptimizer();
  result.ast = opt.optimize(result.ast);
  result.optNodes = opt.optimizedNodes;

  // Phase 5: LLVM IR Generation
  const irgen = new LLVMIRGen();
  result.ir = irgen.generate(result.ast);
  result.irLines = irgen.lines;

  // Phase 6: Code Generation
  const cg = new X86CodeGen();
  result.asm = cg.generate(result.ast);
  result.asmLines = cg.out.length;

  result.errors = [...result.lexErrors, ...result.parseErrors.map(e=>e.msg||e), ...result.semErrors];
  return result;
}

// ─────────────────────────────────────────────────────────────
//  AST INTERPRETER (EXECUTION ENGINE)
// ─────────────────────────────────────────────────────────────
class ASTInterpreter {
  constructor(ast) {
    this.ast = ast;
    this.output = [];
    this.globals = new Map();
    this.functions = new Map();
    this.callStack = [];
    this.maxInstructions = 1000000;
    this.instructionCount = 0;
    this.exitCode = 0;
  }

  error(msg) {
    throw new Error(`Runtime Error: ${msg}`);
  }

  run() {
    // Register globals and functions
    for (const d of this.ast.decls) {
      if (d.type === 'FuncDecl') this.functions.set(d.name, d);
      else if (d.type === 'VarDecl') this.globals.set(d.name, 0); // Default initialize
    }

    if (!this.functions.has('main')) {
      this.error("No 'main' function found");
    }

    try {
      this.exitCode = this.callFunction('main', []);
    } catch (e) {
      this.output.push(`\n[Execution Terminated] ${e.message}`);
      this.exitCode = -1;
    }

    return {
      stdout: this.output.join(''),
      exitCode: this.exitCode
    };
  }

  callFunction(name, args) {
    if (this.instructionCount++ > this.maxInstructions) this.error("Instruction limit exceeded (Infinite loop?)");

    if (name === 'printf') {
      return this.builtinPrintf(args);
    }

    const fn = this.functions.get(name);
    if (!fn) this.error(`Undefined function '${name}'`);

    const env = new Map();
    for (let i = 0; i < fn.params.length; i++) {
      env.set(fn.params[i].name, args[i] !== undefined ? args[i] : 0);
    }

    this.callStack.push(env);
    let result = 0;

    try {
      this.execBlock(fn.body);
    } catch (val) {
      if (val instanceof ReturnValue) {
        result = val.value;
      } else {
        throw val;
      }
    }

    this.callStack.pop();
    return result;
  }

  builtinPrintf(args) {
    if (args.length === 0) return 0;
    let format = args[0];
    let result = '';
    let argIdx = 1;
    for (let i = 0; i < format.length; i++) {
      if (format[i] === '%' && i + 1 < format.length) {
        let type = format[i+1];
        if (type === 'd' || type === 'i') {
          result += Math.floor(args[argIdx++] || 0);
        } else if (type === 'f') {
          result += (args[argIdx++] || 0);
        } else if (type === 'c') {
          result += String.fromCharCode(args[argIdx++] || 0);
        } else if (type === 's') {
          result += (args[argIdx++] || "");
        } else if (type === '%') {
          result += '%';
        } else {
          result += '%' + type;
        }
        i++; // skip the type character
      } else {
        result += format[i];
      }
    }
    this.output.push(result);
    return result.length;
  }

  getVar(name) {
    if (this.callStack.length > 0) {
      const top = this.callStack[this.callStack.length - 1];
      if (top.has(name)) return top.get(name);
    }
    if (this.globals.has(name)) return this.globals.get(name);
    this.error(`Undefined variable '${name}'`);
  }

  setVar(name, val) {
    if (this.callStack.length > 0) {
      const top = this.callStack[this.callStack.length - 1];
      if (top.has(name)) { top.set(name, val); return; }
    }
    if (this.globals.has(name)) { this.globals.set(name, val); return; }
    // If not found, create it in the local scope
    if (this.callStack.length > 0) {
      this.callStack[this.callStack.length - 1].set(name, val);
    } else {
      this.globals.set(name, val);
    }
  }

  execBlock(block) {
    for (const stmt of block.stmts) {
      this.execStmt(stmt);
    }
  }

  execStmt(node) {
    if (this.instructionCount++ > this.maxInstructions) this.error("Instruction limit exceeded (Infinite loop?)");

    switch (node.type) {
      case 'Block':
        this.execBlock(node);
        break;
      case 'VarDecl':
        this.setVar(node.name, node.init ? this.evalExpr(node.init) : 0);
        break;
      case 'If':
        if (this.evalExpr(node.cond)) {
          this.execStmt(node.then);
        } else if (node.els) {
          this.execStmt(node.els);
        }
        break;
      case 'While':
        while (this.evalExpr(node.cond)) {
          try {
            this.execStmt(node.body);
          } catch (e) {
            if (e === 'break') break;
            if (e === 'continue') continue;
            throw e;
          }
        }
        break;
      case 'For':
        if (node.init) this.execStmt(node.init);
        while (!node.cond || this.evalExpr(node.cond)) {
          try {
            this.execStmt(node.body);
          } catch (e) {
            if (e === 'break') break;
            if (e === 'continue') { /* ignore and proceed to upd */ }
            else throw e;
          }
          if (node.upd) this.evalExpr(node.upd);
        }
        break;
      case 'Return':
        throw new ReturnValue(node.val ? this.evalExpr(node.val) : 0);
      case 'Break':
        throw 'break';
      case 'Continue':
        throw 'continue';
      case 'ExprStmt':
        this.evalExpr(node.expr);
        break;
    }
  }

  evalExpr(node) {
    if (this.instructionCount++ > this.maxInstructions) this.error("Instruction limit exceeded (Infinite loop?)");

    switch (node.type) {
      case 'IntLit':
      case 'FloatLit':
      case 'StringLit':
        return node.val;
      case 'CharLit':
        return node.val.charCodeAt(0);
      case 'Var':
        return this.getVar(node.name);
      case 'Assign': {
        const val = this.evalExpr(node.right);
        if (node.left.type === 'Var') {
          this.setVar(node.left.name, val);
        }
        return val;
      }
      case 'BinOp': {
        const l = this.evalExpr(node.left);
        // Short-circuiting for logical operators
        if (node.op === '&&' && !l) return 0;
        if (node.op === '||' && l) return 1;

        const r = this.evalExpr(node.right);
        switch (node.op) {
          case '+': return l + r;
          case '-': return l - r;
          case '*': return l * r;
          case '/': return l / r;
          case '%': return l % r;
          case '==': return l == r ? 1 : 0;
          case '!=': return l != r ? 1 : 0;
          case '<': return l < r ? 1 : 0;
          case '>': return l > r ? 1 : 0;
          case '<=': return l <= r ? 1 : 0;
          case '>=': return l >= r ? 1 : 0;
          case '&&': return (l && r) ? 1 : 0;
          case '||': return (l || r) ? 1 : 0;
        }
        return 0;
      }
      case 'UnaryOp': {
        const v = this.evalExpr(node.operand);
        if (node.op === '-') return -v;
        if (node.op === '!') return !v ? 1 : 0;
        return v;
      }
      case 'Call': {
        const args = node.args.map(a => this.evalExpr(a));
        return this.callFunction(node.name, args);
      }
    }
    return 0;
  }
}

class ReturnValue {
  constructor(value) {
    this.value = value;
  }
}

// Expose globally
window.MiniCCompiler = { compile, Lexer, Parser, SemanticAnalyzer, LLVMIRGen, ASTInterpreter, ASTOptimizer, X86CodeGen };
