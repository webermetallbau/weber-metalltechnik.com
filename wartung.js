(function(){
var q=new URLSearchParams(location.search);
var io='IntersectionObserver' in window?new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('da');io.unobserve(e.target)}})},{rootMargin:'0px 0px -8% 0px'}):null;
document.querySelectorAll('.rv').forEach(function(el){io?io.observe(el):el.classList.add('da')});
var f=document.querySelector('form#anfrage-form');
if(f){var h=f.querySelector('.form-hinweis'),k=f.querySelector('button[type=submit]'),ts=f.querySelector('[name=ts]');if(ts)ts.value=String(Date.now());
 var sag=function(t,a){h.textContent=t;h.className='form-hinweis '+(a||'')};
 f.addEventListener('submit',function(e){var n=f.name.value.trim(),m=f.mail.value.trim(),t=f.nachricht.value.trim(),ok=f.einwilligung.checked;
  if(!n){e.preventDefault();sag('Bitte tragen Sie noch Ihren Namen ein.','fehler');f.name.focus();return}
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(m)){e.preventDefault();sag('Bitte tragen Sie eine gültige E-Mail-Adresse ein.','fehler');f.mail.focus();return}
  if(!t){e.preventDefault();sag('Bitte schreiben Sie kurz, worum es geht.','fehler');f.nachricht.focus();return}
  if(!ok){e.preventDefault();sag('Bitte bestätigen Sie noch die Zeile zum Datenschutz.','fehler');return}
  k.disabled=true;k.textContent='Wird gesendet …'});
 if(q.has('gesendet')){sag('Danke, Ihre Anfrage ist raus. Wir melden uns meist am selben oder nächsten Werktag.','gut');history.replaceState(null,'',location.pathname+'#anfrage')}
 if(q.has('fehler')){sag('Das Absenden hat gerade nicht funktioniert. Rufen Sie uns einfach an: 08772 803707.','fehler');history.replaceState(null,'',location.pathname+'#anfrage')}}
if(/(^|\.)weber-metalltechnik\.com$/.test(location.hostname)){var r='direkt';try{if(document.referrer){var x=new URL(document.referrer).hostname.replace(/^www\./,'');if(x&&x!==location.hostname)r=x}}catch(e){}
 var d=JSON.stringify({t:'v',s:location.hostname,p:location.pathname,g:innerWidth<768?'m':'d',id:Math.random().toString(36).slice(2,12),r:r});var Z='https://seiten-zaehler.handwerksmanufaktur.workers.dev/z';
 try{if(!(navigator.sendBeacon&&navigator.sendBeacon(Z,new Blob([d],{type:'text/plain'}))))fetch(Z,{method:'POST',body:d,keepalive:true,mode:'no-cors'})}catch(e){}}
})();
