
(() => {
  // DOM
const expressionEl = document.getElementById('expression');
const resultEl = document.getElementById('result');
const historyList = document.getElementById('historyList');
const memoryIndicator = document.getElementById('memoryIndicator');
const modeToggle = document.getElementById('modeToggle');
const themeToggle = document.getElementById('themeToggle');
const clearHistoryBtn = document.getElementById('clearHistory');

  // state
let expr = '';
let memory = 0;
  let history = []; // {expr, result}
let isScientific = false;

  // Operators / functions definitions
const operators = {
    '+': {prec: 2, assoc: 'L', fn: (a,b)=>a+b},
    '-': {prec: 2, assoc: 'L', fn: (a,b)=>a-b},
    '*': {prec: 3, assoc: 'L', fn: (a,b)=>a*b},
    '/': {prec: 3, assoc: 'L', fn: (a,b)=>a/b},
    '^': {prec: 4, assoc: 'R', fn: (a,b)=>Math.pow(a,b)},
    '%': {prec: 3, assoc: 'L', fn: (a,b)=>a*(b/100)}
};

const functions = {
    'sin': {arity:1, fn:(x)=>Math.sin(x)},
    'cos': {arity:1, fn:(x)=>Math.cos(x)},
    'tan': {arity:1, fn:(x)=>Math.tan(x)},
    'ln':  {arity:1, fn:(x)=>Math.log(x)},
    'log10':{arity:1, fn:(x)=>Math.log10 ? Math.log10(x) : Math.log(x)/Math.LN10},
    'sqrt':{arity:1, fn:(x)=>Math.sqrt(x)}
};

  // Factorial (supports integers >=0)
function factorial(n){
    if(n < 0) throw new Error('Factorial: n negativo');
    if(n !== Math.floor(n)) throw new Error('Factorial: n debe ser entero');
    if(n === 0 || n === 1) return 1;
    let res = 1;
    for(let i=2;i<=n;i++) res *= i;
    return res;
}

  // UI helpers
function updateDisplay(){
    expressionEl.textContent = expr || '0';
    resultEl.value = '';
}

function pushToExpr(s){
    expr += s;
    updateDisplay();
}

function setExpr(s){
    expr = s;
    updateDisplay();
}

function clearAll(){
    expr = '';
    resultEl.value = '';
    updateDisplay();
}

function backspace(){
    if(expr.length) expr = expr.slice(0,-1);
    updateDisplay();
}

  // Shunting-yard parser -> RPN tokens
function tokenize(input){
    const tokens = [];
    const pattern = /\s*([0-9]*\.?[0-9]+|\w+|[\+\-\*\/\^\%\(\),!])\s*/g;
    let m;
    while((m = pattern.exec(input)) !== null){
    tokens.push(m[1]);
    }
    return tokens;
}

function toRPN(tokens){
    const output = [];
    const stack = [];
    for(let i=0;i<tokens.length;i++){
    const t = tokens[i];

    if(!isNaN(t)){
        output.push({type:'number', value: parseFloat(t)});
    } else if(t in functions){
        stack.push({type:'func', value:t});
    } else if(t === ',') {
        // function arg separator
        while(stack.length && stack[stack.length-1].value !== '('){
        output.push(stack.pop());
        }
    } else if(t in operators){
        const o1 = t;
        while(stack.length){
        const top = stack[stack.length-1];
        if(top.type === 'op' && (
            (operators[top.value].prec > operators[o1].prec) ||
            (operators[top.value].prec === operators[o1].prec && operators[o1].assoc === 'L')
            )){
            output.push(stack.pop());
        } else break;
        }
        stack.push({type:'op', value:o1});
    } else if(t === '('){
        stack.push({type:'paren', value:'('});
    } else if(t === ')'){
        while(stack.length && stack[stack.length-1].value !== '('){
        output.push(stack.pop());
        }
        if(stack.length && stack[stack.length-1].value === '(') stack.pop();
        // if top is function, pop it into output
        if(stack.length && stack[stack.length-1].type === 'func'){
        output.push(stack.pop());
        }
    } else if(t === '!'){
        // factorial as postfix operator -> convert as special op
        output.push({type:'op', value:'!'});
    } else {
        // unknown token (maybe function like "sin(" without space)
        // Try to match alpha tokens as functions
        if(/^[a-zA-Z]+$/.test(t)){
        if(t in functions) stack.push({type:'func', value:t});
        else throw new Error('Función desconocida: ' + t);
        } else {
        throw new Error('Token desconocido: ' + t);
        }
    }
    }

    while(stack.length){
    const tok = stack.pop();
    if(tok.value === '(' || tok.value === ')') throw new Error('Paréntesis desbalanceados');
    output.push(tok);
    }

    return output;
}

  // Evaluate RPN
function evalRPN(rpn){
    const st = [];
    for(const token of rpn){
    if(token.type === 'number'){
        st.push(token.value);
    } else if(token.type === 'op'){
        if(token.value === '!'){
        const a = st.pop();
        st.push(factorial(a));
        } else if(token.value === '%'){
          // treat as a% where a is left operand and next number b is right -> but we implemented % as binary operator earlier
        const b = st.pop();
        const a = st.pop();
        st.push(operators['%'].fn(a,b));
        } else {
        const b = st.pop();
        const a = st.pop();
        if(b === undefined || a === undefined) throw new Error('Operando faltante');
        const fn = operators[token.value].fn;
        st.push(fn(a,b));
        }
    } else if(token.type === 'func'){
        const info = functions[token.value];
        if(!info) throw new Error('Función no implementada: ' + token.value);
        const args = [];
        for(let i=0;i<info.arity;i++){
        args.unshift(st.pop());
        }
        // trig functions expect radians; keep that behavior
        st.push(info.fn(...args));
    } else {
        throw new Error('Token RPN desconocido: ' + JSON.stringify(token));
    }
    }
    if(st.length !== 1) throw new Error('Expresión inválida');
    return st[0];
}

  // Safe evaluate pipeline
function safeEvaluate(input){
    if(!input || input.trim() === '') throw new Error('Sin expresión');
    // Replace common display characters (×, ÷, −) with internal ones
    input = input.replace(/×/g,'*').replace(/÷/g,'/').replace(/−/g,'-').replace(/×/g,'*');
    // Insert implicit multiplication: e.g. "2(" -> "2*("
    input = input.replace(/(\d|\))\s*\(/g, (m)=> m[0]+'*(');
    // Handle unary minus at start or after '(' or operator -> convert to (0-...)
    input = input.replace(/(^|[\(\+\-\*\/\^,])\s*-\s*(\d+(\.\d+)?|\()/g, (m, p1, p2)=> `${p1}0-${p2}`);
    const tokens = tokenize(input);
    const rpn = toRPN(tokens);
    const val = evalRPN(rpn);
    if(!isFinite(val)) throw new Error('Resultado no finito');
    return val;
}

  // Actions
function calculateAndShow(){
    try{
    const value = safeEvaluate(expr);
    resultEl.value = String(value);
    addHistory(expr, value);
    updateMemoryIndicator();
    return value;
    } catch(err){
    resultEl.value = 'Error';
    console.warn(err);
    return null;
    }
}

function addHistory(e, r){
    const item = {expr:e, result:r};
    history.unshift(item);
    if(history.length>50) history.pop();
    renderHistory();
}

function renderHistory(){
    historyList.innerHTML = '';
    for(const h of history){
    const li = document.createElement('li');
    li.textContent = `${h.expr} = ${h.result}`;
    li.tabIndex = 0;
    li.title = "Pulsa para recuperar esta operación";
    li.addEventListener('click', ()=> {
        setExpr(h.expr);
    });
    li.addEventListener('keydown', (ev)=>{ if(ev.key === 'Enter') setExpr(h.expr); });
    historyList.appendChild(li);
    }
}

  // Memory functions
function memoryClear(){ memory = 0; updateMemoryIndicator(); }
function memoryRecall(){ setExpr(String(memory)); updateMemoryIndicator(); }
function memoryAdd(){
    const val = calculateAndShow();
    if(val !== null) { memory += val; updateMemoryIndicator(); }
}
function memorySubtract(){
    const val = calculateAndShow();
    if(val !== null) { memory -= val; updateMemoryIndicator(); }
}
function updateMemoryIndicator(){
    if(memory !== 0) memoryIndicator.classList.remove('hidden');
    else memoryIndicator.classList.add('hidden');
}

  // Button handling
document.querySelectorAll('[data-value]').forEach(btn=>{
    btn.addEventListener('click', ()=> {
    const v = btn.getAttribute('data-value');
    pushToExpr(v);
    });
  });

  document.querySelectorAll('[data-action]').forEach(btn=>{
    btn.addEventListener('click', ()=> {
      const act = btn.getAttribute('data-action');
      switch(act){
        case 'MC': memoryClear(); break;
        case 'MR': memoryRecall(); break;
        case 'Mplus': memoryAdd(); break;
        case 'Mminus': memorySubtract(); break;
        case 'clearAll': clearAll(); break;
        case 'backspace': backspace(); break;
        case 'equals': calculateAndShow(); break;
        case 'plusMinus': // toggle sign: attempt simple transformation
          if(expr.startsWith('-')) expr = expr.slice(1);
          else expr = '-' + expr;
          updateDisplay();
          break;
        case 'sqrt':
          pushToExpr('sqrt(');
          break;
        case 'factorial':
          pushToExpr('!');
          break;
        default:
          console.warn('Acción no manejada', act);
      }
    });
  });

  // Scientific toggle
  modeToggle.addEventListener('change', (e)=>{
    isScientific = e.target.checked;
    document.querySelectorAll('[data-mode="scientific"]').forEach(el=>{
      if(isScientific) el.classList.remove('hidden');
      else el.classList.add('hidden');
    });
  });

  // Theme toggle (simple)
  themeToggle.addEventListener('click', ()=>{
    document.documentElement.classList.toggle('dark-theme');
    // simple theme inversion
    if(document.documentElement.classList.contains('dark-theme')){
      document.documentElement.style.setProperty('--bg','#0b1226');
      document.documentElement.style.setProperty('--panel','#071224');
      document.documentElement.style.setProperty('--muted','#9aa6bf');
      document.documentElement.style.setProperty('--accent','#e6eefc');
      document.documentElement.style.setProperty('--primary','#4f46e5');
    } else {
      document.documentElement.style.removeProperty('--bg');
      document.documentElement.style.removeProperty('--panel');
      document.documentElement.style.removeProperty('--muted');
      document.documentElement.style.removeProperty('--accent');
      document.documentElement.style.removeProperty('--primary');
    }
  });

  // History clear
  clearHistoryBtn.addEventListener('click', ()=>{
    history = [];
    renderHistory();
  });

  // Keyboard support
  window.addEventListener('keydown', (ev)=>{
    const k = ev.key;
    if((k >= '0' && k <= '9') || k === '.' ){
      pushToExpr(k);
      ev.preventDefault();
      return;
    }
    if(k === '+' || k === '-' || k === '*' || k === '/' || k === '^' || k === '%'){
      pushToExpr(k);
      ev.preventDefault();
      return;
    }
    if(k === 'Enter'){
      calculateAndShow();
      ev.preventDefault();
      return;
    }
    if(k === 'Backspace'){
      backspace();
      ev.preventDefault();
      return;
    }
    if(k === 'Escape'){
      clearAll();
      ev.preventDefault();
      return;
    }
    if(k === '(' || k === ')'){
      pushToExpr(k);
      ev.preventDefault();
      return;
    }
    // support letters for functions: s for sin, c for cos, l for ln/log
    if(/^[a-zA-Z]$/.test(k)){
      // small convenience map
      const map = {s:'sin(',c:'cos(',t:'tan(',l:'ln('};
      if(map[k.toLowerCase()]){ pushToExpr(map[k.toLowerCase()]); ev.preventDefault(); }
    }
  });

  // initialize
  updateDisplay();
  updateMemoryIndicator();

  // expose few functions for console debugging (optional)
  window._calc = {
    setExpr,
    clearAll,
    calculateAndShow,
    safeEvaluate
  };

})();
