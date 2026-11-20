const banner=document.getElementById('android-install');
const install=document.getElementById('android-install-button');
const status=document.getElementById('android-install-status');
const android=/Android/i.test(navigator.userAgent);
const installed=matchMedia('(display-mode: standalone), (display-mode: fullscreen)');
let invitation;
let notice;

function showStatus(message){
  status.textContent=message;
  status.hidden=false;
  clearTimeout(notice);
  notice=setTimeout(()=>{status.hidden=true;},5000);
}

function update(){
  banner.hidden=!android || installed.matches || !invitation;
}
if(android){
  window.addEventListener('beforeinstallprompt',event=>{
    if(installed.matches) return;
    event.preventDefault();
    invitation=event;
    status.hidden=true;
    update();
  });
  window.addEventListener('appinstalled',()=>{
    invitation=undefined;
    update();
  });
  installed.addEventListener('change',update);
  install.addEventListener('click',async()=>{
    if(!invitation) return;
    const prompt=invitation;
    invitation=undefined;
    install.disabled=true;
    try{
      await prompt.prompt();
      const result=await prompt.userChoice;
      if(result.outcome==='dismissed') showStatus('You can install later from the browser menu.');
    }catch{
      showStatus('Use the browser menu to install Chapitre.');
    }finally{
      install.disabled=false;
      update();
    }
  });
}