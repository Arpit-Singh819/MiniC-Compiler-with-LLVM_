// ============================================================
//  UI Controller — MiniC Compiler Dashboard
// ============================================================

let compileStep = 0;
let lastResult = null;

// ─────── LINE NUMBERS ───────
function updateLineNumbers() {
  const ta = document.getElementById('code-editor');
  const ln = document.getElementById('line-numbers');
  const lines = ta.value.split('\n').length;
  ln.innerHTML = Array.from({length:lines},(_,i)=>`<span>${i+1}</span>`).join('');
  updateCursor();
}

function syncScroll() {
  const ta = document.getElementById('code-editor');
  const ln = document.getElementById('line-numbers');
  ln.scrollTop = ta.scrollTop;
}

function updateCursor() {
  const ta = document.getElementById('code-editor');
  const text = ta.value.substring(0, ta.selectionStart);
  const lines = text.split('\n');
  const line = lines.length, col = lines[lines.length-1].length+1;
  document.getElementById('line-col').textContent = `Ln ${line}, Col ${col}`;
}

document.getElementById('code-editor').addEventListener('keydown', e => {
  if(e.key==='Tab'){
    e.preventDefault();
    const ta=e.target;
    const s=ta.selectionStart, end=ta.selectionEnd;
    ta.value=ta.value.substring(0,s)+'  '+ta.value.substring(end);
    ta.selectionStart=ta.selectionEnd=s+2;
    updateLineNumbers();
  }
});
document.getElementById('code-editor').addEventListener('click', updateCursor);
document.getElementById('code-editor').addEventListener('keyup', updateCursor);

// ─────── CONSOLE ───────
function log(msg, cls='log-info') {
  const body = document.getElementById('console-body');
  const time = new Date().toTimeString().slice(0,8);
  const el = document.createElement('div');
  el.className = 'log-line fade-in';
  el.innerHTML = `<span class="log-time">${time}</span><span class="${cls}">${msg}</span>`;
  body.appendChild(el);
  body.scrollTop = body.scrollHeight;
}

function clearConsole() {
  document.getElementById('console-body').innerHTML='';
  log('Console cleared.', 'log-info');
}

// ─────── PHASES ───────
const phaseIds = ['src','lex','parse','sem','ir','opt','cg'];
const phaseNames = ['ph-src','ph-lex','ph-parse','ph-sem','ph-ir','ph-opt','ph-cg'];

function resetPhases() {
  phaseNames.forEach(id=>{
    const el=document.getElementById(id);
    el.classList.remove('done','error','active');
  });
  document.getElementById('ph-src').classList.add('active');
}

function markPhase(id, status) {
  const el = document.getElementById('ph-'+id);
  if(!el) return;
  el.classList.remove('active','done','error');
  el.classList.add(status);
  if(status==='done') {
    const badge=el.querySelector('.phase-badge');
    if(badge) badge.textContent='✓';
  }
}

function setActivePhase(id) {
  const el = document.getElementById('ph-'+id);
  if(!el) return;
  el.classList.remove('done','error');
  el.classList.add('active');
}

// ─────── PROGRESS ───────
function setProgress(pct) {
  const bar = document.getElementById('progress-bar');
  const fill = document.getElementById('progress-fill');
  bar.classList.toggle('active', pct < 100);
  fill.style.width = pct+'%';
}

// ─────── COMPILE ───────
async function runCompiler() {
  const src = document.getElementById('code-editor').value.trim();
  if(!src) { log('No source code to compile.', 'log-warn'); return; }

  resetPhases(); clearConsole();
  compileStep = 0;
  setProgress(10);

  const badge = document.getElementById('status-badge');
  badge.className = 'status-badge';
  badge.textContent = 'Compiling…';

  log('▶ Starting MiniC compilation pipeline…');
  document.getElementById('console-status').textContent = 'Running';

  // Animate phase by phase
  await animateCompile(src);
}

async function animateCompile(src) {
  const delay = ms => new Promise(r=>setTimeout(r,ms));

  // PHASE 1: Lexer
  setActivePhase('lex');
  setProgress(20);
  log('[1/5] Lexical Analysis — tokenizing source…');
  await delay(300);

  const result = MiniCCompiler.compile(src);
  lastResult = result;

  const tokens = result.tokens.filter(t=>t.type!=='EOF');
  markPhase('lex', result.lexErrors.length?'error':'done');
  log(`      Tokens generated: ${tokens.length}`, 'log-ok');
  document.getElementById('stat-tokens').textContent = tokens.length;
  renderTokens(tokens);

  if(result.lexErrors.length) {
    result.lexErrors.forEach(e=>log(`      ✗ Lex error: ${e.msg}`, 'log-err'));
  }
  await delay(250);

  // PHASE 2: Parser
  setActivePhase('parse');
  setProgress(40);
  log('[2/5] Parsing — building Abstract Syntax Tree…');
  await delay(300);

  const nodeCount = countNodes(result.ast);
  markPhase('parse', result.parseErrors.length?'error':'done');
  log(`      AST nodes: ${nodeCount}`, 'log-ok');
  document.getElementById('stat-nodes').textContent = nodeCount;
  renderAST(result.ast);

  if(result.parseErrors.length) {
    result.parseErrors.forEach(e=>log(`      ✗ Parse error: ${e.msg||e}`, 'log-err'));
  }
  await delay(250);

  // PHASE 3: Semantic
  setActivePhase('sem');
  setProgress(60);
  log('[3/5] Semantic Analysis — type checking…');
  await delay(300);

  markPhase('sem', result.semErrors.length?'error':'done');
  log(`      Symbols resolved: ${result.symbols.length}`, 'log-ok');
  document.getElementById('stat-syms').textContent = result.symbols.length;
  renderSymbolTable(result.symbols);

  if(result.semErrors.length) {
    result.semErrors.forEach(e=>log(`      ✗ Semantic: ${e}`, 'log-err'));
  }
  await delay(250);

  // PHASE 4: IR Gen
  setActivePhase('ir');
  setProgress(75);
  log('[4/5] LLVM IR Generation…');
  await delay(300);

  markPhase('ir', 'done');
  log(`      IR lines emitted: ${result.irLines}`, 'log-ok');
  document.getElementById('stat-ir').textContent = result.irLines;
  renderIR(result.ir);

  // PHASE 5: AST Optimizer
  setActivePhase('opt');
  setProgress(88);
  log('[5/5] Optimizer (O2) — dead code elim, const folding…');
  await delay(350);
  markPhase('opt', 'done');
  log(`      Optimized ${result.optNodes} AST node(s).`, 'log-ok');

  // PHASE 6: Code Generation (Assembly)
  setActivePhase('cg');
  setProgress(96);
  await delay(200);
  markPhase('cg', 'done');
  log(`      Code generation — x86_64 target (${result.asmLines} lines).`, 'log-ok');
  renderAssembly(result.asm);

  setProgress(100);
  await delay(100);

  // Render CFG
  renderCFG(result.ast);

  const errCount = result.errors.length;
  document.getElementById('stat-errs').textContent = errCount;
  const badge = document.getElementById('status-badge');
  document.getElementById('console-status').textContent = errCount ? 'Errors' : 'Success';

  if(errCount===0) {
    badge.className = 'status-badge ok';
    badge.textContent = '✓ Success';
    log('─────────────────────────────', 'log-info');
    log('✓ Compilation successful! Binary ready.', 'log-ok');

    // ────── EXECUTION ENGINE ──────
    log('▶ Running AST Execution Engine...', 'log-info');
    await delay(200);
    try {
      const interpreter = new MiniCCompiler.ASTInterpreter(result.ast);
      const execResult = interpreter.run();
      if (execResult.stdout) {
        log('── Program Output ──', 'log-info');
        log(`<pre style="margin:0;font-family:inherit;white-space:pre-wrap;color:var(--text);">${escHtml(execResult.stdout)}</pre>`, 'log-ok');
        log('────────────────────', 'log-info');
      }
      log(`Execution finished with exit code ${execResult.exitCode}`, execResult.exitCode === 0 ? 'log-ok' : 'log-warn');
    } catch (e) {
      log(`Execution failed: ${e.message}`, 'log-err');
    }

  } else {
    badge.className = 'status-badge err';
    badge.textContent = `✗ ${errCount} Error${errCount>1?'s':''}`;
    log(`✗ Compilation finished with ${errCount} error(s).`, 'log-err');
  }
  setProgress(100);
  setTimeout(()=>setProgress(101), 500);
}

function countNodes(node) {
  if(!node||typeof node!=='object') return 0;
  let count = 1;
  for(const k of Object.keys(node)) {
    if(k==='type') continue;
    const v = node[k];
    if(Array.isArray(v)) count += v.reduce((a,c)=>a+countNodes(c), 0);
    else if(v&&typeof v==='object') count += countNodes(v);
  }
  return count;
}


// ─────── RENDER TOKENS ───────
function renderTokens(tokens) {
  const cls = {
    INT:'tk-keyword',FLOAT:'tk-keyword',CHAR:'tk-keyword',VOID:'tk-keyword',
    IF:'tk-keyword',ELSE:'tk-keyword',WHILE:'tk-keyword',FOR:'tk-keyword',
    RETURN:'tk-keyword',BREAK:'tk-keyword',CONTINUE:'tk-keyword',
    INT_LIT:'tk-literal',FLOAT_LIT:'tk-literal',CHAR_LIT:'tk-literal',
    IDENT:'tk-identifier',
    PLUS:'tk-operator',MINUS:'tk-operator',STAR:'tk-operator',SLASH:'tk-operator',
    EQ:'tk-operator',NEQ:'tk-operator',LT:'tk-operator',GT:'tk-operator',
    LTE:'tk-operator',GTE:'tk-operator',AND:'tk-operator',OR:'tk-operator',
    ASSIGN:'tk-operator',PERCENT:'tk-operator',NOT:'tk-operator',
  };
  const list = document.getElementById('token-list');
  const nonEof = tokens.filter(t=>t.type!=='EOF').slice(0,80);
  list.innerHTML = nonEof.map(t=>`
    <div class="token-row fade-in">
      <span class="${cls[t.type]||'tk-punctuation'}">${escHtml(t.val)}</span>
      <span class="tk-type">${t.type}</span>
      <span class="tk-line">:${t.line}</span>
    </div>
  `).join('');
  if(tokens.length>81) {
    list.innerHTML += `<div style="color:var(--muted);font-size:10px;padding:6px 8px;">...and ${tokens.length-80} more tokens</div>`;
  }
}

// ─────── RENDER AST ───────
function renderAST(node, depth=0) {
  const container = document.getElementById('ast-tree');
  container.innerHTML = renderASTNode(node);
}

function renderASTNode(node, depth=0) {
  if(!node||typeof node!=='object') return '';
  if(typeof node==='string'||typeof node==='number') return `<span class="ast-val">${node}</span>`;

  const type = node.type||'Node';
  const indent = '  '.repeat(depth);

  let attrs = '';
  let children = '';

  for(const [k,v] of Object.entries(node)) {
    if(k==='type') continue;
    if(v===null||v===undefined) continue;
    if(Array.isArray(v)) {
      if(v.length>0) {
        children += `<div class="ast-children">${v.map(c=>renderASTNode(c,depth+1)).join('')}</div>`;
      }
    } else if(typeof v==='object') {
      children += `<div class="ast-children">${renderASTNode(v,depth+1)}</div>`;
    } else {
      attrs += ` <span class="ast-attr">${k}</span>=<span class="ast-val">"${escHtml(String(v))}"</span>`;
    }
  }

  const colors = {
    Program:'#60a5fa', FuncDecl:'#c084fc', VarDecl:'#34d399',
    If:'#fbbf24', While:'#f97316', For:'#fb7185', Return:'#a78bfa',
    BinOp:'#e2e8f0', Assign:'#fbbf24', Call:'#60a5fa',
    IntLit:'#34d399', FloatLit:'#34d399', Var:'#93c5fd'
  };
  const col = colors[type]||'#94a3b8';

  return `<div class="ast-node fade-in" style="margin:2px 0">
    <span style="color:${col};font-weight:600">${type}</span>${attrs}
    ${children}
  </div>`;
}

// ─────── RENDER IR ───────
function renderIR(ir) {
  const el = document.getElementById('ir-output');
  el.innerHTML = ir.split('\n').map(line => {
    if(line.startsWith(';')) return `<span class="ir-comment">${escHtml(line)}</span>`;
    if(line.match(/^define|^declare/)) return `<span class="ir-kw">${escHtml(line)}</span>`;
    if(line.match(/^\w.*:$/)) return `<span class="ir-label">${escHtml(line)}</span>`;
    // Highlight registers
    line = line.replace(/%t\d+/g, m=>`<span class="ir-reg">${m}</span>`);
    line = line.replace(/\bi\d+\b|float|void/g, m=>`<span class="ir-type">${m}</span>`);
    line = line.replace(/\b(ret|call|alloca|load|store|add|sub|mul|sdiv|srem|icmp|br|label)\b/g,
      m=>`<span class="ir-kw">${m}</span>`);
    return `<span>${line}</span>`;
  }).join('\n');
}

// ─────── RENDER ASSEMBLY ───────
function renderAssembly(asm) {
  const el = document.getElementById('asm-output');
  if(!el) return;
  el.innerHTML = asm.split('\n').map(line => {
    if(line.trim().startsWith('.')) return `<span class="ir-comment">${escHtml(line)}</span>`;
    if(line.match(/^\w.*:$/)) return `<span class="ir-label">${escHtml(line)}</span>`;
    line = line.replace(/\b(push|pop|mov|add|sub|imul|idiv|cdq|cmp|jmp|je|jne|sete|setne|setl|setg|setle|setge|neg|call|ret|lea|and|jz|movzx)\b/g,
      m=>`<span class="ir-kw">${m}</span>`);
    line = line.replace(/\b(rax|rbx|rcx|rdx|rsp|rbp|rsi|rdi|r8|r9|eax|ebx|ecx|edx|edi|esi|r8d|r9d|al)\b/g,
      m=>`<span class="ir-reg">${m}</span>`);
    line = line.replace(/\b(DWORD PTR)\b/g, m=>`<span class="ir-type">${m}</span>`);
    return `<span>${line}</span>`;
  }).join('\n');
}

// ─────── RENDER CFG ───────
function renderCFG(ast) {
  const container = document.getElementById('cfg-vis');
  if(!ast || !ast.decls) return;

  const funcs = ast.decls.filter(d=>d.type==='FuncDecl');
  if(!funcs.length) return;

  let html = '';
  for(const fn of funcs) {
    html += `<div style="margin-bottom:16px;">
      <div style="font-size:11px;font-weight:700;color:var(--accent);margin-bottom:8px;letter-spacing:1px;">@${fn.name}()</div>
      <div style="display:flex;flex-direction:column;gap:4px;padding-left:8px;border-left:2px solid var(--border);">
        ${genCFGBlocks(fn.body)}
      </div>
    </div>`;
  }
  container.innerHTML = html;
}

function genCFGBlocks(node, depth=0) {
  if(!node) return '';
  const pad = depth*12;
  switch(node.type) {
    case 'Block':
      return node.stmts.map(s=>genCFGBlocks(s,depth)).join('');
    case 'If':
      return `<div style="padding:5px 8px;border-radius:5px;background:rgba(251,191,36,0.08);border:1px solid rgba(251,191,36,0.3);font-size:10px;color:#fbbf24;margin-left:${pad}px">◆ if (...)</div>
              <div style="margin-left:${pad+12}px;border-left:1px dashed var(--border);padding-left:8px">${genCFGBlocks(node.then,depth)}</div>
              ${node.els?`<div style="padding:5px 8px;border-radius:5px;background:rgba(251,191,36,0.05);font-size:10px;color:var(--muted);margin-left:${pad}px">else</div>
              <div style="margin-left:${pad+12}px;border-left:1px dashed var(--border);padding-left:8px">${genCFGBlocks(node.els,depth)}</div>`:''}`;
    case 'While':
      return `<div style="padding:5px 8px;border-radius:5px;background:rgba(249,115,22,0.08);border:1px solid rgba(249,115,22,0.3);font-size:10px;color:#f97316;margin-left:${pad}px">↺ while (...)</div>
              <div style="margin-left:${pad+12}px;border-left:1px dashed var(--border);padding-left:8px">${genCFGBlocks(node.body,depth)}</div>`;
    case 'For':
      return `<div style="padding:5px 8px;border-radius:5px;background:rgba(251,113,133,0.08);border:1px solid rgba(251,113,133,0.3);font-size:10px;color:#fb7185;margin-left:${pad}px">↺ for (...)</div>
              <div style="margin-left:${pad+12}px;border-left:1px dashed var(--border);padding-left:8px">${genCFGBlocks(node.body,depth)}</div>`;
    case 'Return':
      return `<div style="padding:5px 8px;border-radius:5px;background:rgba(124,58,237,0.08);border:1px solid rgba(124,58,237,0.3);font-size:10px;color:#a78bfa;margin-left:${pad}px">⏎ return</div>`;
    case 'VarDecl':
      return `<div style="padding:5px 8px;border-radius:5px;background:rgba(52,211,153,0.06);font-size:10px;color:#34d399;margin-left:${pad}px">□ ${node.vtype} ${node.name}</div>`;
    case 'ExprStmt':
      return `<div style="padding:5px 8px;border-radius:5px;background:rgba(255,255,255,0.03);font-size:10px;color:var(--muted);margin-left:${pad}px">· expr</div>`;
    default: return '';
  }
}

// ─────── RENDER SYMBOL TABLE ───────
function renderSymbolTable(symbols) {
  const el = document.getElementById('symbol-table');
  if(!symbols.length) {
    el.innerHTML = '<div style="color:var(--muted);font-size:11px;text-align:center;padding:8px;">No symbols</div>';
    return;
  }
  el.innerHTML = `
    <div class="sym-row" style="color:var(--muted);font-size:10px;border-bottom:1px solid var(--border);margin-bottom:4px;">
      <span>Name</span><span>Type</span><span>Scope</span>
    </div>
    ${symbols.map(s=>`
      <div class="sym-row">
        <span class="sym-name">${escHtml(s.name)}</span>
        <span class="sym-type">${s.vtype}</span>
        <span class="sym-scope">${s.scope||'local'}</span>
      </div>
    `).join('')}
  `;
}

// ─────── TAB SWITCHING ───────
function switchRTab(id, el) {
  document.querySelectorAll('.rtab').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.rp-section').forEach(s=>s.classList.remove('show'));
  el.classList.add('active');
  document.getElementById('rp-'+id).classList.add('show');
}

// ─────── EXAMPLES ───────
const examples = {
  fibonacci: `int fibonacci(int n) {
  if (n <= 1) {
    return n;
  }
  return fibonacci(n - 1) + fibonacci(n - 2);
}

int main() {
  int result;
  result = fibonacci(10);
  return 0;
}`,
  sorting: `int swap(int a, int b) {
  int temp;
  temp = a;
  a = b;
  b = temp;
  return 0;
}

int bubbleSort(int n) {
  int i;
  int j;
  i = 0;
  while (i < n) {
    j = 0;
    while (j < n - i - 1) {
      j = j + 1;
    }
    i = i + 1;
  }
  return 0;
}

int main() {
  int size;
  size = 5;
  bubbleSort(size);
  return 0;
}`,
  factorial: `int factorial(int n) {
  int result;
  result = 1;
  for (int i = 1; i <= n; i = i + 1) {
    result = result * i;
  }
  return result;
}

int power(int base, int exp) {
  int result;
  int i;
  result = 1;
  i = 0;
  while (i < exp) {
    result = result * base;
    i = i + 1;
  }
  return result;
}

int main() {
  int f;
  int p;
  f = factorial(6);
  p = power(2, 8);
  return 0;
}`
};

function loadExample(name) {
  document.getElementById('code-editor').value = examples[name] || '';
  updateLineNumbers();
  clearConsole();
  resetPhases();
  document.getElementById('status-badge').className='status-badge';
  document.getElementById('status-badge').textContent='Ready';
  log(`Loaded example: ${name}.c`);
}

// ─────── PHASE INFO MODAL ───────
const phaseInfo = {
  src: {title:'Source Code Input', body:`<p style="color:var(--muted);font-size:12px;line-height:1.8;margin-bottom:12px">The source file is the entry point. MiniC supports:</p>
    <pre style="color:var(--text)">• Types:     int, float, char, void
• Control:   if/else, while, for
• Functions: declaration, recursion
• Ops:       +,-,*,/,%,==,!=,<,>,&&,||
• Comments:  // and /* */</pre>`},
  lex: {title:'Lexical Analysis (Lexer)', body:`<p style="color:var(--muted);font-size:12px;line-height:1.8;margin-bottom:12px">Converts raw source characters into a stream of tokens. Uses a hand-written DFA.</p>
    <pre style="color:var(--text)">Input:  int x = 5 + 3;
Output: [INT][IDENT:x][ASSIGN][INT_LIT:5]
        [PLUS][INT_LIT:3][SEMICOLON]</pre>`},
  parse: {title:'Parsing (Recursive Descent)', body:`<p style="color:var(--muted);font-size:12px;line-height:1.8;margin-bottom:12px">Builds an Abstract Syntax Tree from tokens using LL(1) Recursive Descent.</p>
    <pre style="color:var(--text)">Grammar rule:
Statement → 'if' '(' Expr ')' Stmt
          | 'while' '(' Expr ')' Stmt
          | 'return' Expr ';'
          | VarDecl | ExprStmt</pre>`},
  sem: {title:'Semantic Analysis', body:`<p style="color:var(--muted);font-size:12px;line-height:1.8;margin-bottom:12px">Validates the AST for semantic correctness. Builds the Symbol Table.</p>
    <pre style="color:var(--text)">Checks:
• Type checking (int vs float)
• Undefined variable usage
• Function call arity
• Redeclaration errors
• Scope resolution</pre>`},
  ir: {title:'LLVM IR Generation', body:`<p style="color:var(--muted);font-size:12px;line-height:1.8;margin-bottom:12px">Translates AST to LLVM Intermediate Representation (SSA form).</p>
    <pre style="color:var(--text)">define i32 @add(i32 %a, i32 %b) {
entry:
  %a.addr = alloca i32, align 4
  store i32 %a, i32* %a.addr
  %t0 = load i32, i32* %a.addr
  %t1 = load i32, i32* %b.addr
  %t2 = add i32 %t0, %t1
  ret i32 %t2
}</pre>`},
  opt: {title:'LLVM Optimizer (opt)', body:`<p style="color:var(--muted);font-size:12px;line-height:1.8;margin-bottom:12px">The LLVM optimizer runs multiple passes over the IR.</p>
    <pre style="color:var(--text)">O2 Passes Applied:
• mem2reg   — promote allocas to SSA
• instcombine — algebraic simplification
• dce       — dead code elimination
• licm      — loop invariant code motion
• inliner   — small function inlining
• gvn       — global value numbering</pre>`},
  cg: {title:'Code Generation (llc)', body:`<p style="color:var(--muted);font-size:12px;line-height:1.8;margin-bottom:12px">LLVM's backend converts optimized IR to native machine code.</p>
    <pre style="color:var(--text)">add:
  push rbp
  mov  rbp, rsp
  mov  eax, edi    ; arg a
  add  eax, esi    ; + arg b
  pop  rbp
  ret              ; return sum

Target: x86_64-linux-gnu ELF</pre>`},
};

function showPhaseInfo(id) {
  const info = phaseInfo[id];
  if(!info) return;
  document.getElementById('modal-title').textContent = info.title;
  document.getElementById('modal-body').innerHTML = info.body;
  document.getElementById('modal-overlay').classList.add('show');
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('show');
}

function showHelp() {
  document.getElementById('modal-title').textContent = 'MiniC Compiler — Help';
  document.getElementById('modal-body').innerHTML = `
    <p style="color:var(--muted);font-size:12px;line-height:1.8;margin-bottom:12px">
      This is a working mini C compiler implemented entirely in JavaScript with LLVM-style IR generation.
    </p>
    <pre style="color:var(--text)">Keyboard Shortcuts:
  Tab         — Insert 2 spaces
  Ctrl+Enter  — Compile (use button)

UI Features:
  ▶ Compile   — Full pipeline run
  ⏭ Step      — Token-by-token stepping
  Tokens tab  — Full token stream
  AST tab     — Syntax tree viewer
  LLVM IR tab — Generated IR code
  CFG tab     — Control flow graph

Click any phase in the sidebar
for detailed documentation!</pre>`;
  document.getElementById('modal-overlay').classList.add('show');
}

function clearAll() {
  document.getElementById('code-editor').value='';
  updateLineNumbers();
  clearConsole();
  resetPhases();
  document.getElementById('token-list').innerHTML='<div style="color:var(--muted);font-size:11px;text-align:center;padding:20px">Run compiler to see tokens</div>';
  document.getElementById('ast-tree').innerHTML='<div style="color:var(--muted);font-size:11px;text-align:center;padding:20px">Run compiler to see AST</div>';
  document.getElementById('ir-output').innerHTML='<span style="color:var(--muted)">; Compile to generate LLVM IR</span>';
  if(document.getElementById('asm-output')) document.getElementById('asm-output').innerHTML='<span style="color:var(--muted)">; Compile to generate Assembly</span>';
  document.getElementById('symbol-table').innerHTML='<div style="color:var(--muted);font-size:11px;text-align:center;padding:20px">Compile to populate</div>';
  ['stat-tokens','stat-nodes','stat-ir','stat-syms','stat-errs'].forEach(id=>{
    document.getElementById(id).textContent='—';
  });
  document.getElementById('status-badge').className='status-badge';
  document.getElementById('status-badge').textContent='Ready';
}

// ─────── UTILS ───────
function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ─────── INIT ───────
updateLineNumbers();
log('Dashboard ready. Click ▶ Compile to run the full pipeline.', 'log-info');
