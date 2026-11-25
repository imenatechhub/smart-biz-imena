const SUPABASE_URL="https://qgnnzybeafqcsaqronpl.supabase.co";
const SUPABASE_PUBLISHABLE_KEY="sb_publishable_tVpz1JO5ix1EHu1kFqm9Bw_algtXmsu";
const db=window.supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
let sessionUser=null,activeBusiness=null,activeRole="staff",currentPage="overview",activeForm="",authMode="signin",teamMembers=[];
let data={products:[],sales:[],customers:[],expenses:[]};
const $=id=>document.getElementById(id);
const money=n=>"RWF "+Number(n||0).toLocaleString("en-US");
const total=a=>a.reduce((s,x)=>s+Number(x.amount||0),0);
const dateText=v=>v?new Date(v).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}):"—";
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const msg=(id,s,ok=false)=>{const e=$(id);if(e){e.textContent=s;e.style.color=ok?"#21835f":"#b45309";}};
const toast=s=>{const e=$("toast");e.textContent=s;e.classList.add("show");setTimeout(()=>e.classList.remove("show"),2800);};
$("year").textContent=new Date().getFullYear();
$("todayLabel").textContent=new Date().toLocaleDateString("en-GB",{weekday:"short",day:"numeric",month:"short",year:"numeric"});

function authModeSet(mode){
 authMode=mode;$("authTitle").textContent=mode==="signup"?"Create your account":"Welcome back";
 $("authSubtitle").textContent=mode==="signup"?"Start managing your business with Smart Biz.":"Sign in to manage your business securely.";
 $("authSubmit").textContent=mode==="signup"?"Create account":"Sign in";
 $("authPassword").autocomplete=mode==="signup"?"new-password":"current-password";
 $("authToggle").textContent=mode==="signup"?"Already have an account? Sign in":"New to Smart Biz? Create an account";msg("authMessage","");
}
function showAuth(){$("appShell").classList.add("hidden");$("setupScreen").classList.add("hidden");$("authScreen").classList.remove("hidden");}
function showSetup(){$("appShell").classList.add("hidden");$("authScreen").classList.add("hidden");$("setupScreen").classList.remove("hidden");}
async function startWorkspace(user){
 sessionUser=user;
 const m=await db.from("business_members").select("business_id,role").eq("user_id",user.id);
 if(m.error)throw m.error;
 if(!m.data?.length){showSetup();return;}
 const b=await db.from("businesses").select("*").in("id",m.data.map(x=>x.business_id));
 if(b.error)throw b.error;
 if(!b.data?.length){showSetup();return;}
 activeBusiness=b.data[0];
 activeRole=m.data.find(x=>x.business_id===activeBusiness.id)?.role||"staff";
 const rolePages={owner:["overview","sales","inventory","customers","expenses","reports","team"],manager:["overview","sales","inventory","customers","expenses","reports"],cashier:["overview","sales","customers"],inventory:["overview","inventory"],staff:["overview"]};
 const allowedPages=rolePages[activeRole]||["overview"];
 document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("hidden",!allowedPages.includes(b.dataset.page)));
 if(!allowedPages.includes(currentPage))currentPage="overview";
 $("appShell").classList.remove("hidden");$("authScreen").classList.add("hidden");$("setupScreen").classList.add("hidden");
 document.querySelector(".profile strong").textContent=activeBusiness.name;
 document.querySelector(".profile small").textContent=(m.data.find(x=>x.business_id===activeBusiness.id)?.role||"member")+" workspace";
 await loadData();
}
async function loadData(){
 const id=activeBusiness.id;
 const canSeeProducts=["owner","manager","inventory"].includes(activeRole);
 const canSeeSales=["owner","manager","cashier"].includes(activeRole);
 const canSeeCustomers=["owner","manager","cashier"].includes(activeRole);
 const canSeeExpenses=["owner","manager"].includes(activeRole);
 const empty={data:[],error:null};
 const q=await Promise.all([
  canSeeProducts?db.from("products").select("*").eq("business_id",id).eq("is_active",true).order("name"):Promise.resolve(empty),
  canSeeSales?db.from("sales").select("*").eq("business_id",id).order("sold_at",{ascending:false}):Promise.resolve(empty),
  canSeeCustomers?db.from("customers").select("*").eq("business_id",id).order("name"):Promise.resolve(empty),
  canSeeExpenses?db.from("expenses").select("*").eq("business_id",id).order("expense_date",{ascending:false}):Promise.resolve(empty),
  canSeeSales?db.from("sale_items").select("*").eq("business_id",id):Promise.resolve(empty)
 ]);
 for(const x of q)if(x.error)throw x.error;
 const items=q[4].data||[];
 data.products=(q[0].data||[]).map(p=>({id:p.id,name:p.name,category:p.category||"",price:+p.selling_price,stock:+p.stock_quantity,threshold:+p.low_stock_threshold}));
 data.sales=(q[1].data||[]).map(s=>({id:s.id,ref:s.receipt_number,date:s.sold_at,item:items.filter(i=>i.sale_id===s.id).map(i=>i.item_name+" × "+i.quantity).join(", ")||"Sale",amount:+s.total,payment:s.payment_method}));
 data.customers=(q[2].data||[]).map(c=>({id:c.id,name:c.name,phone:c.phone||"",email:c.email||""}));
 data.expenses=(q[3].data||[]).map(e=>({id:e.id,date:e.expense_date,category:e.category||"",description:e.title,amount:+e.amount}));
 renderOverview();if(currentPage!=="overview")renderSection();
}
function lowStock(){return data.products.filter(p=>p.stock<=p.threshold);}
function drawChart(){
 const chart=$("salesChart");if(!data.sales.length){chart.innerHTML='<div class="chart-empty">Your sales chart will appear here as you record transactions.</div>';return;}
 const buckets=Array(7).fill(0),labels=[];
 for(let i=6;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);labels.push(d.toLocaleDateString("en",{weekday:"short"}));}
 data.sales.forEach(s=>{const d=new Date(s.date),diff=Math.floor((new Date().setHours(0,0,0,0)-new Date(d).setHours(0,0,0,0))/86400000);if(diff>=0&&diff<7)buckets[6-diff]+=s.amount;});
 const max=Math.max(...buckets,1);
 chart.innerHTML='<div class="bar-set">'+buckets.map((v,i)=>'<div class="bar-column"><div class="bar" title="'+money(v)+'" style="height:'+Math.max(v?5:0,v/max*78)+'%"></div><span class="bar-label">'+labels[i]+'</span></div>').join("")+'</div>';
}
function renderOverview(){
 $("totalSales").textContent=money(total(data.sales));$("totalOrders").textContent=data.sales.length;
 $("totalProducts").textContent=data.products.length;$("totalExpenses").textContent=money(total(data.expenses));
 $("lowStockText").textContent=lowStock().length;$("salesCount").textContent=data.sales.length;
 const body=$("recentSales");body.innerHTML="";
 data.sales.slice(0,5).forEach(s=>{const tr=document.createElement("tr");tr.innerHTML="<td>"+esc(s.ref)+"</td><td>"+dateText(s.date)+"</td><td>"+esc(s.item)+"</td><td>"+esc(s.payment)+"</td><td class=\"align-right\">"+money(s.amount)+"</td>";body.appendChild(tr);});
 $("salesEmpty").classList.toggle("hidden",data.sales.length>0);
 const stock=$("stockSummary");stock.innerHTML="";
 [{label:"In stock",count:data.products.filter(p=>p.stock>p.threshold).length,cls:""},{label:"Low stock",count:lowStock().filter(p=>p.stock>0).length,cls:"warning"},{label:"Out of stock",count:data.products.filter(p=>p.stock===0).length,cls:"danger"}].forEach(g=>{const row=document.createElement("div");row.innerHTML='<div class="stock-line-head"><span>'+g.label+'</span><strong>'+g.count+' products</strong></div><div class="progress"><span class="'+g.cls+'" style="width:'+(data.products.length?Math.max(3,g.count/data.products.length*100):0)+'%"></span></div>';stock.appendChild(row);});
 drawChart();
 if(activeRole==="cashier"){
  $("totalProducts").textContent="—";$("totalExpenses").textContent="—";$("lowStockText").textContent="—";
  $("stockSummary").innerHTML='<p class="muted">Inventory details are restricted to inventory staff.</p>';
  $("stockSummary").parentElement.classList.add("hidden");
 }else{$("stockSummary").parentElement.classList.remove("hidden");}
}
const pages={overview:["Overview","Here’s what’s happening with your business today."],sales:["Sales","Track transactions and keep your sales records organized."],inventory:["Inventory","Manage products, prices and available stock."],customers:["Customers","Keep useful customer details in one place."],expenses:["Expenses","Record and review your business spending."],reports:["Reports","A simple snapshot of your business performance."],team:["Team","Invite employees and manage their workspace roles."]};
function navigate(page){
 const rolePages={owner:["overview","sales","inventory","customers","expenses","reports","team"],manager:["overview","sales","inventory","customers","expenses","reports"],cashier:["overview","sales","customers"],inventory:["overview","inventory"],staff:["overview"]};
 if(!(rolePages[activeRole]||["overview"]).includes(page)){toast("Your employee role does not have access to this section.");return;}
 currentPage=page;document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.page===page));
 $("pageCrumb").textContent=pages[page][0];$("pageTitle").innerHTML=pages[page][0]+(page==="overview"?' <span class="wave">✦</span>':"");
 $("pageSubtitle").textContent=pages[page][1];$("overviewPage").classList.toggle("hidden",page!=="overview");$("genericPage").classList.toggle("hidden",page==="overview");
 if(page!=="overview")renderSection();$("sidebar").classList.remove("open");
}
function renderSection(){
 if(currentPage==="team"){renderTeam();return;}
 const titles={sales:"Sales transactions",inventory:"Product inventory",customers:"Customer directory",expenses:"Expense records",reports:"Business summary"};
 const desc={sales:"Every sale recorded in this workspace.",inventory:"Manage products, prices and available stock.",customers:"Your saved customer directory.",expenses:"Track the costs of running your business.",reports:"Totals calculated from your saved business records.",team:"Invite employees and manage their workspace roles."};
 $("sectionTitle").textContent=titles[currentPage];$("sectionDescription").textContent=desc[currentPage];$("sectionAddBtn").classList.toggle("hidden",currentPage==="reports");
 const c=$("sectionContent");
 if(currentPage==="reports"){c.innerHTML='<div class="metric-grid"><article class="metric-card"><div class="metric-top">Revenue</div><div class="metric-value">'+money(total(data.sales))+'</div></article><article class="metric-card"><div class="metric-top">Expenses</div><div class="metric-value">'+money(total(data.expenses))+'</div></article><article class="metric-card"><div class="metric-top">Net (before other costs)</div><div class="metric-value">'+money(total(data.sales)-total(data.expenses))+'</div></article><article class="metric-card"><div class="metric-top">Transactions</div><div class="metric-value">'+data.sales.length+'</div></article></div><p style="color:#8994a6;font-size:11px">Figures are loaded from your online business records.</p>';return;}
 let heads=[],rows=[];
 if(currentPage==="inventory"){heads=["PRODUCT","CATEGORY","PRICE","STOCK STATUS","QUANTITY"];rows=data.products.map(p=>[esc(p.name),esc(p.category),money(p.price),p.stock<=p.threshold?'<span class="status low">Low stock</span>':'<span class="status">In stock</span>',p.stock]);}
 if(currentPage==="sales"){heads=["REFERENCE","DATE","ITEM","PAYMENT","AMOUNT"];rows=data.sales.map(s=>[esc(s.ref),dateText(s.date),esc(s.item),esc(s.payment),money(s.amount)]);}
 if(currentPage==="customers"){heads=["NAME","PHONE","EMAIL"];rows=data.customers.map(x=>[esc(x.name),esc(x.phone),esc(x.email)]);}
 if(currentPage==="expenses"){heads=["DATE","CATEGORY","DESCRIPTION","AMOUNT"];rows=data.expenses.map(x=>[dateText(x.date),esc(x.category),esc(x.description),money(x.amount)]);}
 c.innerHTML='<div class="data-toolbar"><input class="search-input" id="tableSearch" placeholder="Search records..." /></div>'+(rows.length?'<div class="table-scroll"><table><thead><tr>'+heads.map(h=>"<th>"+h+"</th>").join("")+'</tr></thead><tbody>'+rows.map(r=>"<tr>"+r.map(v=>"<td>"+v+"</td>").join("")+"</tr>").join("")+"</tbody></table></div>":'<div class="empty-box"><strong>No records yet</strong>Your saved records will appear here when you add them.</div>');
 const search=$("tableSearch");if(search)search.addEventListener("input",()=>{const q=search.value.toLowerCase();c.querySelectorAll("tbody tr").forEach(tr=>tr.classList.toggle("hidden",!tr.textContent.toLowerCase().includes(q)));});
}
function openModal(type){
 activeForm=type;
 const specs={
 team_invite:{title:"Invite an employee",fields:[["email","Employee email address","email","name@example.com"],["role","Assign role","select",["manager","cashier","inventory","staff"]]]},
 sale:{title:"Record a sale",fields:[["item","Product / item","text","e.g. Bottled water"],["quantity","Quantity","number","e.g. 1"],["amount","Total amount (RWF)","number","e.g. 500"],["payment","Payment method","select",["cash","mobile_money","bank_transfer","card","credit","other"]],["customer","Customer name (optional)","text","Customer name"]]},
 product:{title:"Add a product",fields:[["name","Product name","text","e.g. Sugar"],["category","Category","text","e.g. Groceries"],["price","Selling price (RWF)","number","e.g. 2000"],["cost","Purchase price (RWF)","number","e.g. 1500"],["stock","Opening quantity","number","e.g. 20"],["threshold","Low stock alert quantity","number","e.g. 5"]]},
 customer:{title:"Add a customer",fields:[["name","Customer name","text","Full name"],["phone","Phone number","tel","+250..."],["email","Email (optional)","email","name@example.com"]]},
 expense:{title:"Record an expense",fields:[["category","Category","text","e.g. Transport"],["description","Description","text","What was it for?"],["amount","Amount (RWF)","number","e.g. 5000"]]}
 };
 const spec=specs[type];$("modalTitle").textContent=spec.title;
 $("formFields").innerHTML=spec.fields.map(f=>'<div class="field '+(f[0]==="description"?"full":"")+'"><label for="f_'+f[0]+'">'+f[1]+'</label>'+(f[2]==="select"?'<select id="f_'+f[0]+'" name="'+f[0]+'">'+f[3].map(o=>'<option value="'+o+'">'+o.replaceAll("_"," ")+"</option>").join("")+'</select>':'<input id="f_'+f[0]+'" name="'+f[0]+'" type="'+f[2]+'" placeholder="'+f[3]+'" '+(f[2]==="number"?'min="0" step="0.001"':"")+' '+(["customer","email"].includes(f[0])?"":"required")+' />')+'</div>').join("");
 if(type==="sale")$("f_customer").required=false;if(type==="customer")$("f_email").required=false;
 $("modalBackdrop").classList.remove("hidden");
}
async function renderTeam(){
 $("sectionTitle").textContent="Team members";
 $("sectionDescription").textContent="Only the business owner can invite, change roles or remove employees.";
 $("sectionAddBtn").classList.toggle("hidden",activeRole!=="owner");
 const c=$("sectionContent");
 if(activeRole!=="owner"){c.innerHTML='<div class="empty-box"><strong>Owner access required</strong>Ask your business owner to manage team members.</div>';return;}
 c.innerHTML='<div class="empty-box">Loading team members…</div>';
 try{
  const r=await db.functions.invoke("manage-team",{body:{action:"list",business_id:activeBusiness.id}});
  if(r.error)throw r.error;
  teamMembers=r.data.members||[];
  if(!teamMembers.length){c.innerHTML='<div class="empty-box"><strong>No team members yet</strong>Invite your first employee to get started.</div>';return;}
  const roleLabel={owner:"Owner",manager:"Manager",cashier:"Cashier",inventory:"Inventory Manager",staff:"Staff"};
  c.innerHTML='<div class="table-scroll"><table><thead><tr><th>EMAIL</th><th>ROLE</th><th>JOINED</th><th>ACTIONS</th></tr></thead><tbody>'+teamMembers.map(m=>'<tr><td>'+esc(m.email)+'</td><td>'+(m.role==="owner"?'<span class="status">Owner</span>':'<select class="search-input" style="min-width:145px;padding:7px" data-team-role="'+esc(m.id)+'"><option value="manager" '+(m.role==="manager"?"selected":"")+'>Manager</option><option value="cashier" '+(m.role==="cashier"?"selected":"")+'>Cashier</option><option value="inventory" '+(m.role==="inventory"?"selected":"")+'>Inventory Manager</option><option value="staff" '+(m.role==="staff"?"selected":"")+'>Staff</option></select>')+'</td><td>'+dateText(m.created_at)+'</td><td>'+(m.role==="owner"?'—':'<button class="text-button" data-team-update="'+esc(m.id)+'">Save role</button> <button class="text-button" style="color:#c45b55" data-team-remove="'+esc(m.id)+'">Remove</button>')+'</td></tr>').join("")+'</tbody></table></div>';
  c.querySelectorAll("[data-team-update]").forEach(b=>b.addEventListener("click",async()=>{const id=b.dataset.teamUpdate;const role=c.querySelector('[data-team-role="'+id+'"]').value;await teamAction({action:"update_role",member_id:id,role},"Employee role updated.");}));
  c.querySelectorAll("[data-team-remove]").forEach(b=>b.addEventListener("click",async()=>{const id=b.dataset.teamRemove;const member=teamMembers.find(x=>x.id===id);if(!confirm("Remove "+member.email+" from this business? Their login account will not be deleted."))return;await teamAction({action:"remove",member_id:id},"Employee removed from this business.");}));
 }catch(err){c.innerHTML='<div class="empty-box"><strong>Could not load the team</strong>'+esc(err.message||"Please try again.")+'</div>';}
}
async function teamAction(payload,successMessage){
 try{
  const r=await db.functions.invoke("manage-team",{body:{business_id:activeBusiness.id,...payload}});
  if(r.error)throw r.error;
  if(r.data?.error)throw new Error(r.data.error);
  toast(r.data?.message||successMessage);await renderTeam();
 }catch(err){toast(err.message||"Team action failed.");}
}
async function saveEntry(e){
 e.preventDefault();const v=Object.fromEntries(new FormData(e.target).entries()),bid=activeBusiness.id;
 try{
  if(activeForm==="team_invite"){
   const r=await db.functions.invoke("manage-team",{body:{action:"invite",business_id:activeBusiness.id,email:v.email,role:v.role}});
   if(r.error)throw r.error;if(r.data?.error)throw new Error(r.data.error);
   $("modalBackdrop").classList.add("hidden");await renderTeam();toast(r.data?.message||"Employee invitation processed.");return;
  }else if(activeForm==="product"){
   const r=await db.from("products").insert({business_id:bid,name:v.name.trim(),category:v.category||null,selling_price:+v.price,purchase_price:+(v.cost||0),stock_quantity:+v.stock,low_stock_threshold:+(v.threshold||5)});if(r.error)throw r.error;
  }else if(activeForm==="customer"){
   const r=await db.from("customers").insert({business_id:bid,name:v.name.trim(),phone:v.phone||null,email:v.email||null});if(r.error)throw r.error;
  }else if(activeForm==="expense"){
   const r=await db.from("expenses").insert({business_id:bid,title:v.description.trim(),category:v.category||null,amount:+v.amount,recorded_by:sessionUser.id});if(r.error)throw r.error;
  }else if(activeForm==="sale"){
   const qty=+v.quantity,amount=+v.amount;if(qty<=0||amount<=0)throw new Error("Quantity and amount must be greater than zero.");
  const existing=v.customer.trim()?data.customers.find(c=>c.name.toLowerCase()===v.customer.trim().toLowerCase()):null;
  const sr=await db.rpc("record_sale",{p_business_id:bid,p_item_name:v.item.trim(),p_quantity:qty,p_total:amount,p_payment_method:v.payment,p_customer_id:existing?.id||null,p_customer_name:existing?null:(v.customer.trim()||null)});
  if(sr.error)throw sr.error;
  }
  $("modalBackdrop").classList.add("hidden");await loadData();toast("Saved to your online business records.");
 }catch(err){toast(err.message||"Could not save this record.");console.error(err);}
}
document.querySelectorAll(".nav-item").forEach(b=>b.addEventListener("click",()=>navigate(b.dataset.page)));
document.querySelectorAll("[data-goto]").forEach(b=>b.addEventListener("click",()=>navigate(b.dataset.goto)));
$("newSaleBtn").addEventListener("click",()=>openModal("sale"));
$("sectionAddBtn").addEventListener("click",()=>openModal(({inventory:"product",customers:"customer",expenses:"expense",sales:"sale",team:"team_invite"})[currentPage]));
$("closeModal").addEventListener("click",()=>$("modalBackdrop").classList.add("hidden"));
$("cancelModal").addEventListener("click",()=>$("modalBackdrop").classList.add("hidden"));
$("modalBackdrop").addEventListener("click",e=>{if(e.target===$("modalBackdrop"))$("modalBackdrop").classList.add("hidden");});
$("mobileMenu").addEventListener("click",()=>$("sidebar").classList.toggle("open"));
$("entryForm").addEventListener("submit",saveEntry);
$("authToggle").addEventListener("click",()=>authModeSet(authMode==="signin"?"signup":"signin"));
$("authForm").addEventListener("submit",async e=>{
 e.preventDefault();const btn=$("authSubmit");btn.disabled=true;msg("authMessage","Please wait…",true);
 try{
  const email=$("authEmail").value.trim(),password=$("authPassword").value;
  if(authMode==="signup"){const r=await db.auth.signUp({email,password});if(r.error)throw r.error;if(r.data.session)await startWorkspace(r.data.user);else msg("authMessage","Account created. Check your email to confirm it, then sign in.",true);}
  else{const r=await db.auth.signInWithPassword({email,password});if(r.error)throw r.error;await startWorkspace(r.data.user);}
 }catch(err){msg("authMessage",err.message);}finally{btn.disabled=false;}
});
$("businessForm").addEventListener("submit",async e=>{
 e.preventDefault();const btn=e.submitter;btn.disabled=true;msg("setupMessage","Creating your workspace…",true);
 try{
  const auth=await db.auth.getUser();
  if(auth.error)throw auth.error;
  if(!auth.data.user)throw new Error("Your sign-in session has expired. Please sign in again.");
  sessionUser=auth.data.user;
  const r=await db.rpc("create_business_workspace",{p_name:$("businessName").value.trim(),p_business_type:$("businessType").value.trim()||null,p_phone:$("businessPhone").value.trim()||null,p_address:$("businessAddress").value.trim()||null});
  if(r.error)throw r.error;
  await startWorkspace(auth.data.user);
  toast("Your business workspace is ready.");
 }catch(err){msg("setupMessage",err.message);}finally{btn.disabled=false;}
});
$("setupSignOut").addEventListener("click",async()=>{await db.auth.signOut();showAuth();});
$("signOutBtn").addEventListener("click",async()=>{await db.auth.signOut();data={products:[],sales:[],customers:[],expenses:[]};showAuth();});
$("exportBtn").addEventListener("click",()=>{
 const rows=[["Type","Date","Description","Amount (RWF)"]];
 data.sales.forEach(s=>rows.push(["Sale",s.date,s.item,s.amount]));data.expenses.forEach(x=>rows.push(["Expense",x.date,x.description,x.amount]));
 const csv=rows.map(r=>r.map(v=>'"'+String(v??"").replace(/"/g,'""')+'"').join(",")).join("\n");
 const url=URL.createObjectURL(new Blob([csv],{type:"text/csv"})),a=document.createElement("a");a.href=url;a.download="smart-biz-records.csv";a.click();URL.revokeObjectURL(url);
});
db.auth.onAuthStateChange((_event,session)=>{if(session?.user)setTimeout(()=>startWorkspace(session.user).catch(e=>msg("authMessage",e.message)),0);else{sessionUser=null;activeBusiness=null;showAuth();}});
(async()=>{authModeSet("signin");const r=await db.auth.getSession();if(r.error){msg("authMessage",r.error.message);return;}if(r.data.session){try{await startWorkspace(r.data.session.user);}catch(e){showAuth();msg("authMessage",e.message||"Could not load workspace.");}}else showAuth();})();
