const storeKey = "smartbiz-imena-demo-v1";
const initialData = {
  products: [
    {id:1,name:"Bottled water",category:"Beverages",price:500,stock:48},
    {id:2,name:"Notebook",category:"Stationery",price:1500,stock:8},
    {id:3,name:"Coffee",category:"Beverages",price:2500,stock:4}
  ],
  sales: [],
  customers: [],
  expenses: []
};
let data;
try { data = JSON.parse(localStorage.getItem(storeKey)) || structuredClone(initialData); }
catch { data = structuredClone(initialData); }
let currentPage = "overview";
let activeForm = "";

const money = n => "RWF " + Number(n || 0).toLocaleString("en-US");
const save = () => localStorage.setItem(storeKey, JSON.stringify(data));
const byId = id => document.getElementById(id);
const dateText = value => new Date(value).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"});
const total = list => list.reduce((sum,item)=>sum+Number(item.amount||0),0);
const lowStock = () => data.products.filter(p=>p.stock<=10);
byId("todayLabel").textContent = new Date().toLocaleDateString("en-GB",{weekday:"short",day:"numeric",month:"short",year:"numeric"});
byId("year").textContent = new Date().getFullYear();

function renderOverview(){
  byId("totalSales").textContent=money(total(data.sales));
  byId("totalOrders").textContent=data.sales.length;
  byId("totalProducts").textContent=data.products.length;
  byId("totalExpenses").textContent=money(total(data.expenses));
  byId("lowStockText").textContent=lowStock().length;
  byId("salesCount").textContent=data.sales.length;
  const tbody=byId("recentSales"); tbody.innerHTML="";
  [...data.sales].slice(-5).reverse().forEach(s=>{
    const tr=document.createElement("tr");
    tr.innerHTML=`<td>${s.ref}</td><td>${dateText(s.date)}</td><td>${escapeHtml(s.item)}</td><td>${escapeHtml(s.payment)}</td><td class="align-right">${money(s.amount)}</td>`;
    tbody.appendChild(tr);
  });
  byId("salesEmpty").classList.toggle("hidden",data.sales.length>0);
  const stock=byId("stockSummary"); stock.innerHTML="";
  const groups=[{label:"In stock",count:data.products.filter(p=>p.stock>10).length,cls:""},{label:"Low stock",count:lowStock().length,cls:"warning"},{label:"Out of stock",count:data.products.filter(p=>p.stock===0).length,cls:"danger"}];
  groups.forEach(g=>{const row=document.createElement("div");row.innerHTML=`<div class="stock-line-head"><span>${g.label}</span><strong>${g.count} products</strong></div><div class="progress"><span class="${g.cls}" style="width:${data.products.length?Math.max(3,g.count/data.products.length*100):0}%"></span></div>`;stock.appendChild(row)});
  drawChart();
}
function drawChart(){
 const chart=byId("salesChart"); if(!data.sales.length){chart.innerHTML='<div class="chart-empty">Your sales chart will appear here as you record transactions.</div>';return}
 const buckets=Array(7).fill(0),labels=[];
 for(let i=6;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);labels.push(d.toLocaleDateString("en",{weekday:"short"}));}
 data.sales.forEach(s=>{const d=new Date(s.date);const diff=Math.floor((new Date().setHours(0,0,0,0)-new Date(d).setHours(0,0,0,0))/86400000);if(diff>=0&&diff<7)buckets[6-diff]+=Number(s.amount)});
 const max=Math.max(...buckets,1);
 chart.innerHTML='<div class="bar-set">'+buckets.map((v,i)=>`<div class="bar-column"><div class="bar" title="${money(v)}" style="height:${Math.max(v?5:0,v/max*78)}%"></div><span class="bar-label">${labels[i]}</span></div>`).join("")+'</div>';
}
function escapeHtml(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
const pageInfo={
 overview:["Overview","Here’s what’s happening with your business today."],
 sales:["Sales","Track transactions and keep your sales records organized."],
 inventory:["Inventory","Manage products, prices and available stock."],
 customers:["Customers","Keep useful customer details in one place."],
 expenses:["Expenses","Record and review your business spending."],
 reports:["Reports","A simple snapshot of your business performance."]
};
function navigate(page){
 currentPage=page;document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.page===page));
 byId("pageCrumb").textContent=pageInfo[page][0];byId("pageTitle").innerHTML=pageInfo[page][0]+(page==="overview"?' <span class="wave">✦</span>':'');byId("pageSubtitle").textContent=pageInfo[page][1];
 byId("overviewPage").classList.toggle("hidden",page!=="overview");byId("genericPage").classList.toggle("hidden",page==="overview");
 if(page!=="overview")renderSection();byId("sidebar").classList.remove("open");
}
function renderSection(){
 const titles={sales:"Sales transactions",inventory:"Product inventory",customers:"Customer directory",expenses:"Expense records",reports:"Business summary"};
 const descriptions={sales:"Every sale recorded in this workspace.",inventory:"Update quantities and product prices.",customers:"Customers added when you record or enter their details.",expenses:"Track the costs of running your business.",reports:"Your current recorded totals. Export your records whenever you need."};
 byId("sectionTitle").textContent=titles[currentPage];byId("sectionDescription").textContent=descriptions[currentPage];
 byId("sectionAddBtn").classList.toggle("hidden",currentPage==="reports");
 const content=byId("sectionContent");
 if(currentPage==="reports"){
  content.innerHTML=`<div class="metric-grid"><article class="metric-card"><div class="metric-top">Revenue</div><div class="metric-value">${money(total(data.sales))}</div></article><article class="metric-card"><div class="metric-top">Expenses</div><div class="metric-value">${money(total(data.expenses))}</div></article><article class="metric-card"><div class="metric-top">Net (before other costs)</div><div class="metric-value">${money(total(data.sales)-total(data.expenses))}</div></article><article class="metric-card"><div class="metric-top">Transactions</div><div class="metric-value">${data.sales.length}</div></article></div><p style="color:#8994a6;font-size:11px">Figures are calculated from records entered in this browser demo.</p>`;return;
 }
 const search=`<div class="data-toolbar"><input class="search-input" id="tableSearch" placeholder="Search records..." /></div>`;
 let rows=[],heads=[];
 if(currentPage==="inventory"){heads=["PRODUCT","CATEGORY","PRICE","STOCK STATUS","QUANTITY"];rows=data.products.map(p=>[p.name,p.category,money(p.price),p.stock<=10?'<span class="status low">Low stock</span>':'<span class="status">In stock</span>',p.stock])}
 if(currentPage==="sales"){heads=["REFERENCE","DATE","ITEM","PAYMENT","AMOUNT"];rows=data.sales.map(s=>[s.ref,dateText(s.date),s.item,s.payment,money(s.amount)])}
 if(currentPage==="customers"){heads=["NAME","PHONE","EMAIL","TOTAL SPENT"];rows=data.customers.map(c=>[c.name,c.phone||"—",c.email||"—",money(c.spent||0)])}
 if(currentPage==="expenses"){heads=["DATE","CATEGORY","DESCRIPTION","AMOUNT"];rows=data.expenses.map(e=>[dateText(e.date),e.category,e.description,money(e.amount)])}
 content.innerHTML=search+(rows.length?`<div class="table-scroll"><table><thead><tr>${heads.map(h=>'<th>'+h+'</th>').join("")}</tr></thead><tbody>${rows.map(r=>'<tr>'+r.map(v=>'<td>'+v+'</td>').join("")+'</tr>').join("")}</tbody></table></div>`:'<div class="empty-box"><strong>No records yet</strong>Your records will appear here when you add them.</div>');
 const input=byId("tableSearch");if(input)input.addEventListener("input",()=>{const q=input.value.toLowerCase();content.querySelectorAll("tbody tr").forEach(tr=>tr.classList.toggle("hidden",!tr.textContent.toLowerCase().includes(q)))});
}
function openModal(type){
 activeForm=type;const specs={
 sale:{title:"Record a sale",fields:[["item","Product / item","text","e.g. Bottled water"],["amount","Amount (RWF)","number","e.g. 500"],["payment","Payment method","select",["Cash","Mobile Money","Bank transfer","Card"]],["customer","Customer name (optional)","text","Customer name"]]},
 product:{title:"Add a product",fields:[["name","Product name","text","e.g. Sugar"],["category","Category","text","e.g. Groceries"],["price","Selling price (RWF)","number","e.g. 2000"],["stock","Opening quantity","number","e.g. 20"]]},
 customer:{title:"Add a customer",fields:[["name","Customer name","text","Full name"],["phone","Phone number","tel","+250..."],["email","Email (optional)","email","name@example.com"]]},
 expense:{title:"Record an expense",fields:[["category","Category","text","e.g. Transport"],["description","Description","text","What was it for?"],["amount","Amount (RWF)","number","e.g. 5000"]]}
 };
 const spec=specs[type];byId("modalTitle").textContent=spec.title;byId("formFields").innerHTML=spec.fields.map(([name,label,kind,placeholder])=>`<div class="field ${name==="description"?"full":""}"><label for="f_${name}">${label}</label>${kind==="select"?`<select id="f_${name}" name="${name}">${placeholder.map(o=>`<option>${o}</option>`).join("")}</select>`:`<input id="f_${name}" name="${name}" type="${kind}" placeholder="${placeholder}" ${kind==="number"?'min="0" step="1"':''} required ${name==="customer"||name==="email"?'':' '}/>`}</div>`).join("");
 if(type==="sale")byId("f_customer").required=false;if(type==="customer")byId("f_email").required=false;
 byId("modalBackdrop").classList.remove("hidden");setTimeout(()=>byId("formFields").querySelector("input")?.focus(),50);
}
function closeModal(){byId("modalBackdrop").classList.add("hidden")}
function showToast(msg){const t=byId("toast");t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2600)}
document.querySelectorAll(".nav-item").forEach(b=>b.addEventListener("click",()=>navigate(b.dataset.page)));
document.querySelectorAll("[data-goto]").forEach(b=>b.addEventListener("click",()=>navigate(b.dataset.goto)));
byId("newSaleBtn").addEventListener("click",()=>openModal("sale"));
byId("sectionAddBtn").addEventListener("click",()=>openModal(({inventory:"product",customers:"customer",expenses:"expense",sales:"sale"})[currentPage]));
byId("closeModal").addEventListener("click",closeModal);byId("cancelModal").addEventListener("click",closeModal);
byId("modalBackdrop").addEventListener("click",e=>{if(e.target===byId("modalBackdrop"))closeModal()});
byId("mobileMenu").addEventListener("click",()=>byId("sidebar").classList.toggle("open"));
byId("entryForm").addEventListener("submit",e=>{
 e.preventDefault();const v=Object.fromEntries(new FormData(e.target).entries());
 if(activeForm==="sale"){const amount=Number(v.amount);if(amount<=0)return showToast("Enter an amount greater than zero.");data.sales.push({ref:"SB-"+String(Date.now()).slice(-6),date:new Date().toISOString(),item:v.item,amount,payment:v.payment});if(v.customer.trim()){let c=data.customers.find(x=>x.name.toLowerCase()===v.customer.trim().toLowerCase());if(c)c.spent=(c.spent||0)+amount;else data.customers.push({name:v.customer.trim(),phone:"",email:"",spent:amount})}}
 if(activeForm==="product"){if(Number(v.price)<0||Number(v.stock)<0)return showToast("Price and quantity cannot be negative.");data.products.push({id:Date.now(),name:v.name,category:v.category,price:Number(v.price),stock:Number(v.stock)})}
 if(activeForm==="customer")data.customers.push({name:v.name,phone:v.phone,email:v.email,spent:0});
 if(activeForm==="expense"){if(Number(v.amount)<=0)return showToast("Enter an amount greater than zero.");data.expenses.push({date:new Date().toISOString(),category:v.category,description:v.description,amount:Number(v.amount)})}
 save();closeModal();renderOverview();if(currentPage!=="overview")renderSection();showToast("Record saved successfully.");
});
byId("exportBtn").addEventListener("click",()=>{
 const rows=[["Type","Date","Description","Amount (RWF)"]];
 data.sales.forEach(s=>rows.push(["Sale",s.date,s.item,s.amount]));
 data.expenses.forEach(x=>rows.push(["Expense",x.date,x.description,x.amount]));
 const csv=rows.map(r=>r.map(v=>'"'+String(v??"").replace(/"/g,'""')+'"').join(",")).join("\n");
 const url=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));const a=document.createElement("a");a.href=url;a.download="smart-biz-records.csv";a.click();URL.revokeObjectURL(url);showToast("Your CSV export is ready.");
});
renderOverview();