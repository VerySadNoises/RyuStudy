const paths = {
  home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><path d="M9 21v-7h6v7"/>',
  book:'<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M5 17h14M9 7h6m-6 4h4"/>',
  timer:'<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2M9 2h6m4 4 1-1"/>',
  settings:'<circle cx="12" cy="12" r="3"/><path d="M10 3h4l.7 2.5 2 .9 2.3-1.2 2 3.5-1.8 1.8.2 2.2 1.7 1.7-2 3.5-2.4-.7-2 1-.7 2.8h-4l-.7-2.8-2-1-2.4.7-2-3.5 1.7-1.7.2-2.2L3 8.7l2-3.5 2.3 1.2 2-.9z"/>',
  chart:'<path d="M3 3v17h18M8 15v-4m5 4V7m5 8V4"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  arrow:'<path d="M4 12h15m-6-6 6 6-6 6"/>',
  back:'<path d="M20 12H5m6 6-6-6 6-6"/>',
  calendar:'<rect x="4" y="6" width="16" height="14" rx="2"/><path d="M4 10h16M8 3v5m8-5v5"/>',
  check:'<path d="m5 12 4 4L19 6"/>',
  archive:'<rect x="3" y="4" width="18" height="4" rx="1"/><path d="M5 8v12h14V8m-9 4h4"/>',
  close:'<path d="m6 6 12 12M18 6 6 18"/>',
  play:'<path d="m8 5 11 7-11 7z"/>',
  pause:'<path d="M9 5v14m6-14v14"/>',
  leaf:'<path d="M20 4c-2 2-12-1-15 6-2 5 3 9 7 7 5-2 6-8 8-13ZM4 20l9-9"/>',
  pencil:'<path d="m4 16-1 5 5-1L20 8l-4-4Zm10-10 4 4"/>'
};
export function icon(name) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('viewBox','0 0 24 24');
  svg.setAttribute('fill','none');
  svg.setAttribute('stroke','currentColor');
  svg.setAttribute('stroke-width','1.65');
  svg.setAttribute('stroke-linecap','round');
  svg.setAttribute('stroke-linejoin','round');
  svg.setAttribute('aria-hidden','true');
  svg.innerHTML = paths[name] || paths.book;
  return svg;
}
export function h(tag,attrs={},...children) {
  const e = document.createElement(tag);
  for (const [key,value] of Object.entries(attrs)) {
    if (value===null || value===undefined || value===false) continue;
    if (key.startsWith('on')) e.addEventListener(key.slice(2),value);
    else if (key==='class') e.className=value;
    else if (key==='value') e.value=value;
    else e.setAttribute(key,value===true ? '' : value);
  }
  e.append(...children.flat(Infinity).filter(c=>c!==null && c!==undefined && c!==false));
  return e;
}
export const button = (label,action,kind='',symbol) => h('button',{type:'button',class:'button '+kind,onclick:action},symbol && icon(symbol),label);
export const link = (label,to,kind='',symbol) => h('a',{href:'#'+to,class:'button '+kind},symbol && icon(symbol),label);
export const panel = (...children) => h('section',{class:'panel'},children);
export const group = (...children) => h('div',{class:'actions'},children);
export const muted = text => h('p',{class:'muted'},text);
export const tag = text => h('span',{class:'tag'},text);
export const listRow = (...children) => h('div',{class:'list-row'},children);
export const valueGroup = (label,value) => h('div',{class:'metric'},h('span',{},label),h('strong',{},value));
export const progressBar = (n,label) => h('progress',{max:100,value:n,'aria-label':label},n+'%');
export const checkbox = (checked,action,label) => h('input',{type:'checkbox',checked,onchange:action,'aria-label':label});
export const field = (label,input) => h('label',{class:'field'},h('span',{},label),input);
export const input = attrs => h('input',attrs);
export function select(choices,value,attrs={}) {
  const control = h('select',attrs,choices.map(([id,title])=>h('option',{value:id},title)));
  control.value=value;
  return control;
}
export const subheading = (title,action) => h('div',{class:'section-head'},h('h2',{},title),action);
export const heading = (title,body,actions) => h('div',{class:'page-head'},h('div',{},h('h1',{},title),body && muted(body)),actions);
export const cat = (state='idle') => h('img',{class:'cat cat-'+state,src:'./assets/cat.svg',alt:'',width:360,height:250});

export function openDialog(title,build,which='dialog') {
  const dialog = document.getElementById(which);
  if (dialog.open) dialog.close();
  const error = h('p',{class:'form-error',role:'alert',hidden:true});
  const showError = message => { error.textContent=message; error.hidden=false; };
  const close = () => dialog.close();
  const closeButton = button('',close,'quiet icon-button','close');
  closeButton.setAttribute('aria-label','Close dialog');
  dialog.replaceChildren(h('div',{class:'dialog-head'},h('h2',{id:which==='dialog'?'dialog-title':'confirm-title'},title),closeButton),build(close,showError),error);
  dialog.showModal();
  return dialog;
}

export function modalForm(title,build,save,label='Save') {
  return openDialog(title,(close,showError)=>{
    const submit = h('button',{type:'submit',class:'button primary'},label);
    const form = h('form',{class:'stack'},build(),group(button('Cancel',close,'quiet'),submit));
    form.addEventListener('submit',async event=>{
      event.preventDefault();
      submit.disabled=true;
      try { await save(); close(); }
      catch (error) { showError(error.message); }
      finally { submit.disabled=false; }
    });
    return form;
  });
}

export function confirmAction(title,description,label,action,danger=false) {
  return openDialog(title,(close,showError)=>{
    const submit = button(label,async ()=>{
      submit.disabled=true;
      try { await action(); close(); }
      catch (error) { showError(error.message); }
      finally { submit.disabled=false; }
    },danger?'danger':'primary');
    return h('div',{class:'stack'},muted(description),group(button('Cancel',close,'quiet'),submit));
  },'confirm-dialog');
}
