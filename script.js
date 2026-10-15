// HomeRepairsHub front-end behaviour
const zones = {
 north:{label:"ZONE 01",name:"North Chennai",desc:"North and coastal neighbourhoods",areas:[["Ennore","600057"],["Kathivakkam","600057"],["Manali","600068"],["Tiruvottiyur","600019"],["Minjur","601203"],["Tondiarpet","600081"],["Royapuram","600013"],["Washermanpet","600021"],["Perambur","600011"],["Madhavaram","600060"],["Vyasarpadi","600039"],["Kolathur","600099"],["Red Hills","600052"],["Thiruvika Nagar","600082"]]},
 central:{label:"ZONE 02",name:"Central Chennai",desc:"Central residential and commercial neighbourhoods",areas:[["Egmore","600008"],["Kilpauk","600010"],["Purasawalkam","600084"],["Chetpet","600031"],["Nungambakkam","600034"],["T. Nagar","600017"],["Choolai","600112"],["Vepery","600007"],["Triplicane","600005"],["Royapettah","600014"],["Mylapore","600004"],["Alwarpet","600018"],["Thousand Lights","600006"],["Gopalapuram","600086"]]},
 west:{label:"ZONE 03",name:"West Chennai",desc:"Western residential and industrial neighbourhoods",areas:[["Ambattur","600053"],["Mogappair","600037"],["Anna Nagar West","600040"],["Maduravoyal","600095"],["Porur","600116"],["Valasaravakkam","600087"],["Nolambur","600095"],["Avadi","600054"],["Poonamallee","600056"],["Koyambedu","600107"],["Virugambakkam","600092"],["Nerkundram","600107"],["Thirumullaivoyal","600062"],["Ayappakkam","600077"]]},
 south:{label:"ZONE 04",name:"South Chennai",desc:"Southern residential neighbourhoods",areas:[["Adyar","600020"],["Besant Nagar","600090"],["Velachery","600042"],["Pallikaranai","600100"],["Medavakkam","600100"],["Tambaram","600045"],["Chromepet","600044"],["Guindy","600032"],["Saidapet","600015"],["Nanganallur","600061"],["Keelkattalai","600117"],["Madipakkam","600091"],["St. Thomas Mount","600016"],["Selaiyur","600073"]]},
 omr:{label:"ZONE 05",name:"OMR corridor",desc:"Old Mahabalipuram Road and IT corridor",areas:[["Thoraipakkam","600097"],["Perungudi","600096"],["Sholinganallur","600119"],["Karapakkam","600097"],["Navalur","603103"],["Siruseri","603103"],["Semmenchery","600119"],["Injambakkam","600115"],["Neelankarai","600115"],["Palavakkam","600041"],["Kottivakkam","600041"],["Akkarai","600119"]]}
};
const areaGrid=document.getElementById('area-grid');
function showZone(key){const z=zones[key];if(!z)return;document.getElementById('zone-label').textContent=z.label;document.getElementById('zone-name').textContent=z.name;document.getElementById('zone-desc').textContent=z.desc;areaGrid.innerHTML=z.areas.map(([name,pin])=>`<article class="area-card"><b>${name}</b><span>Common PIN: ${pin}</span><a href="#contact" data-area="${name}" data-pin="${pin}">Enquire in this area ↗</a></article>`).join('');document.querySelectorAll('.zone-tab').forEach(b=>{const active=b.dataset.zone===key;b.classList.toggle('active',active);b.setAttribute('aria-selected',String(active));});document.getElementById('zone-select').value=({north:'North Chennai',central:'Central Chennai',west:'West Chennai',south:'South Chennai',omr:'OMR corridor'})[key];}
document.querySelectorAll('.zone-tab').forEach(b=>b.addEventListener('click',()=>showZone(b.dataset.zone)));showZone('north');
const form=document.getElementById('booking-form');
const storageConfig=window.HOME_REPAIR_CONFIG||{};
const storageNotice=document.getElementById('form-disclaimer');
if(storageNotice&&/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec(?:\?.*)?$/.test(String(storageConfig.googleSheetsEndpoint||''))){
 storageNotice.textContent='Your valuable enquiry is received. We’ll contact you to confirm availability, price and terms before you decide. There’s no obligation to proceed and no payment is collected through this form.';
}
const brandChoices=['A.O. Smith','Blue Star','Bosch','Carrier','Daikin','Godrej','Haier','Hitachi','IFB','LG','Mi / Xiaomi','Onida','Panasonic','Samsung','Voltas','Whirlpool'];
function selectedAppliances(){return [...form.querySelectorAll('input[name="appliances"]:checked')].map(x=>x.value);}
function renderBrandGroups(){
 const root=document.getElementById('brand-groups'),help=document.getElementById('brand-picker-help');
 const selected=selectedAppliances();
 const current=new Set([...root.querySelectorAll('input[name="brands"]:checked')].map(x=>x.dataset.appliance+'::'+x.value));
 const groups=selected.map(x=>x==='Spare parts enquiry'?'Spare parts':x);
 root.innerHTML='';
 if(!groups.length){help.hidden=false;root.hidden=true;return;}
 help.hidden=true;root.hidden=false;
 root.innerHTML=groups.map(appliance=>'<fieldset class="brand-appliance-group"><legend>'+appliance+'</legend><div class="brand-check-grid">'+brandChoices.map(brand=>'<label class="brand-check-option"><input type="checkbox" name="brands" value="'+brand+'" data-appliance="'+appliance+'"><span>'+brand+'</span></label>').join('')+'</div></fieldset>').join('');
 root.querySelectorAll('input[name="brands"]').forEach(input=>{input.checked=current.has(input.dataset.appliance+'::'+input.value);});
}
function collectSelectedBrands(){
 const groups={};
 form.querySelectorAll('input[name="brands"]:checked').forEach(input=>{
  const appliance=input.dataset.appliance||'Appliance';
  if(!groups[appliance])groups[appliance]=[];
  groups[appliance].push(input.value);
 });
 return Object.entries(groups).map(([appliance,brands])=>appliance+': '+brands.join(', ')).join('; ')||'Not specified';
}
function updateFormHeading(){
 const selected=selectedAppliances(),spares=selected.includes('Spare parts enquiry'),repairAppliances=selected.filter(x=>x!=='Spare parts enquiry');
 document.getElementById('form-heading').textContent=spares&&!repairAppliances.length?'Spare parts enquiry':'Repair enquiry';
 form.dataset.intent=spares&&!repairAppliances.length?'spares':'repair';
 renderBrandGroups();
}
function selectAppliance(value){if(!value)return;const check=[...form.querySelectorAll('input[name="appliances"]')].find(x=>x.value===value);if(check)check.checked=true;updateFormHeading();}
document.addEventListener('click',e=>{const service=e.target.closest('[data-appliance]');if(service){selectAppliance(service.dataset.appliance);if(service.dataset.intent==='spares'){const check=[...form.querySelectorAll('input[name="appliances"]')].find(x=>x.value==='Spare parts enquiry');if(check)check.checked=true;selectAppliance('Spare parts enquiry');}}const area=e.target.closest('[data-area]');if(area){document.querySelector('[name="area"]').value=area.dataset.area;document.querySelector('[name="pin"]').value=area.dataset.pin;const z=Object.entries(zones).find(([,v])=>v.areas.some(a=>a[0]===area.dataset.area));if(z)document.getElementById('zone-select').value=({north:'North Chennai',central:'Central Chennai',west:'West Chennai',south:'South Chennai',omr:'OMR corridor'})[z[0]];}});
form.querySelectorAll('input[name="appliances"]').forEach(x=>x.addEventListener('change',updateFormHeading));
renderBrandGroups();
const toggle=document.querySelector('.menu-toggle'),nav=document.getElementById('nav');toggle.addEventListener('click',()=>{const open=nav.classList.toggle('open');toggle.setAttribute('aria-expanded',String(open));});nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{nav.classList.remove('open');toggle.setAttribute('aria-expanded','false');}));
document.getElementById('year').textContent=new Date().getFullYear();
// Numeric-only fields: maxlength and HTML validation remain as a second layer.
for(const [name,max] of [['phone',10],['pin',6]]){const input=form.querySelector(`[name="${name}"]`);input.addEventListener('input',()=>{input.value=input.value.replace(/\D/g,'').slice(0,max);});}
// Browser speech recognition support varies; typed entry always remains available.
const micButton=document.getElementById('voice-input'),micStatus=document.getElementById('mic-status'),problemField=document.getElementById('problem-description');
const SpeechRecognition=window.SpeechRecognition||window.webkitSpeechRecognition;
if(!SpeechRecognition){micButton.disabled=true;micStatus.textContent='Voice input is not supported in this browser. You can type the fault description.';}
else{micButton.addEventListener('click',()=>{const recognition=new SpeechRecognition();recognition.lang='en-IN';recognition.interimResults=false;recognition.maxAlternatives=1;micStatus.textContent='Listening… please describe the appliance fault.';micButton.disabled=true;recognition.onresult=event=>{const spoken=event.results[0][0].transcript;problemField.value=(problemField.value.trim()?problemField.value.trim()+' ':'')+spoken;micStatus.textContent='Voice description added. You can edit it before submitting.';};recognition.onerror=()=>{micStatus.textContent='Could not capture speech. Check microphone permission or type the description.';};recognition.onend=()=>{micButton.disabled=false;if(micStatus.textContent==='Listening… please describe the appliance fault.')micStatus.textContent='Tap to try again, or type the fault description.';};recognition.start();});}
document.getElementById('new-enquiry').addEventListener('click',()=>{form.classList.remove('submitted');document.getElementById('thank-you-screen').hidden=true;form.reset();document.getElementById('form-heading').textContent='Repair enquiry';form.dataset.intent='repair';document.getElementById('form-status').textContent='';updateFormHeading();});
async function postEnquiryToSheet(endpoint, record, onSuccess, onFailure){
 const frame=document.createElement('iframe');
 const requestId=(window.crypto&&crypto.randomUUID)?crypto.randomUUID():String(Date.now())+'-'+Math.random().toString(36).slice(2);
 frame.name='hrh-sheet-response-'+requestId;
 frame.title='Customer enquiry storage response';
 frame.hidden=true;
 document.body.appendChild(frame);
 const postForm=document.createElement('form');
 postForm.method='POST';postForm.action=endpoint;postForm.target=frame.name;postForm.hidden=true;
 record.requestId=requestId;
 const payload=document.createElement('input');payload.type='hidden';payload.name='payload';payload.value=JSON.stringify(record);
 const trap=document.createElement('input');trap.type='hidden';trap.name='website';trap.value='';
 postForm.append(payload,trap);document.body.appendChild(postForm);
 let finished=false;
 const cleanup=()=>{window.removeEventListener('message',receive);postForm.remove();setTimeout(()=>frame.remove(),1000);};
 const receive=(event)=>{
  if(!event.data||event.data.type!=='hrh-sheet-result'||event.data.requestId!==requestId)return;
  finished=true;cleanup();
  if(event.data.ok)onSuccess(event.data);else onFailure(event.data.message||'The customer enquiry could not be saved to the sheet.');
 };
 window.addEventListener('message',receive);
 postForm.submit();
 setTimeout(()=>{if(!finished){cleanup();onFailure('No confirmation came back from Google Sheets. Check the web-app deployment and try again.');}},20000);
}
form.addEventListener('submit',async e=>{
 e.preventDefault();
 const status=document.getElementById('form-status'),cfg=window.HOME_REPAIR_CONFIG||{},phone=String(cfg.businessPhone||'').replace(/\D/g,''),endpoint=String(cfg.googleSheetsEndpoint||'').trim();
 const chosen=[...form.querySelectorAll('input[name="appliances"]:checked')].map(x=>x.value);
 if(!chosen.length){status.textContent='Please select at least one appliance or spare-parts enquiry.';form.querySelector('.appliance-options').scrollIntoView({behavior:'smooth',block:'center'});return;}
 const mobile=form.querySelector('[name="phone"]');if(!/^\d{10}$/.test(mobile.value)){mobile.setCustomValidity('Enter exactly 10 digits.');mobile.reportValidity();mobile.setCustomValidity('');return;}
 const pin=form.querySelector('[name="pin"]');if(!/^\d{6}$/.test(pin.value)){pin.setCustomValidity('Enter exactly 6 digits.');pin.reportValidity();pin.setCustomValidity('');return;}
 if(phone.length<10||String(cfg.businessPhone).includes('REPLACE_')){status.textContent='Setup needed: enter your business WhatsApp number in config.js before submitting.';return;}
 if(!/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec(?:\?.*)?$/.test(endpoint)){status.textContent='Google Sheets storage is not connected yet. Complete the one-time setup in SHEET_SETUP.md before accepting enquiries.';return;}
 const f=new FormData(form),hasSpares=chosen.includes('Spare parts enquiry'),repairAppliances=chosen.filter(x=>x!=='Spare parts enquiry');
 const enquiryType=hasSpares&&!repairAppliances.length?'SPARES SALES ENQUIRY':(hasSpares?'REPAIR + SPARES SALES ENQUIRY':'REPAIR ENQUIRY');
 const headline=hasSpares&&!repairAppliances.length?'SPARES SALES ENQUIRY':`${repairAppliances.join(' + ')} — REPAIR ENQUIRY${hasSpares?' + SPARES SALES ENQUIRY':''}`;
 const submittedAt=new Date().toISOString();
 const record={submittedAt,enquiryType,headline,name:f.get('name'),phone:f.get('phone'),appliances:chosen.join(', '),brands:collectSelectedBrands(),warranty:f.get('warranty'),warrantyConfirmation:f.get('warrantyConfirm'),problem:f.get('problem'),zone:f.get('zone'),area:f.get('area'),pin:f.get('pin'),fullAddress:f.get('address'),preferredTime:f.get('time'),website:f.get('website')||''};
 status.textContent='Saving your enquiry to the customer sheet…';
 const whatsappWindow=window.open('about:blank','_blank');
 postEnquiryToSheet(endpoint,record,(result)=>{
  form.classList.add('submitted');document.getElementById('thank-you-screen').hidden=false;
  status.textContent='Your valuable enquiry is received.';
  const small=document.querySelector('.thank-small');
  small.innerHTML='Your valuable enquiry is received. WhatsApp is an additional notification; press <b>Send</b> in the new tab to message our team.';
  if(whatsappWindow){
   const msg=[`HomeRepairsHub — ${headline}`,`Submitted on: ${new Date(submittedAt).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'})}`,`Customer name: ${record.name}`,`Customer mobile: ${record.phone}`,`Appliance(s): ${record.appliances}`,`Brand(s): ${record.brands}`,`Warranty status: ${record.warranty}`,`Warranty confirmation: ${record.warrantyConfirmation}`,`Fault / request: ${record.problem}`,`Service zone: ${record.zone}`,`Area: ${record.area}`,`PIN code: ${record.pin}`,`Full service address: ${record.fullAddress}`,`Preferred visit time: ${record.preferredTime}`].join('\n');
   whatsappWindow.location.href=`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
  }else{
   status.textContent='Your valuable enquiry is received. Your browser blocked the WhatsApp tab; you can still call our team separately.';
  }
  document.getElementById('thank-you-screen').scrollIntoView({behavior:'smooth',block:'center'});
 },(message)=>{
  if(whatsappWindow)whatsappWindow.close();
  status.textContent=message+' Your enquiry has not been confirmed as saved; please try again.';
 });
});

