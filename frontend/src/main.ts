import { BrowserProvider, Contract, JsonRpcProvider } from "ethers";
import "./style.css";

type EipProvider = {
  request: (args: { method: string; params?: unknown[] | Record<string, unknown> }) => Promise<unknown>;
  on?: (event: string, listener: (...args: unknown[]) => void) => void;
};
type Wallet = { name: string; icon?: string; provider: EipProvider };
type Round = { id: number; entrants: string[]; winner: string; finalized: boolean; preview?: boolean };

const CHAIN = { id: 677, hex: "0x2a5", name: "BOT Mainnet", rpc: "https://rpc.botchain.ai", explorer: "https://scan.botchain.ai", currency: { name: "BOT", symbol: "BOT", decimals: 18 } };
const ADDRESS = (import.meta.env.VITE_CHANCERAIL_ADDRESS || "").trim();
const LIVE = /^0x[a-fA-F0-9]{40}$/.test(ADDRESS);
const ZERO = "0x0000000000000000000000000000000000000000";
const ABI = [
  "function owner() view returns (address)",
  "function currentRound() view returns (uint256)",
  "function roundActive() view returns (bool)",
  "function getParticipants(uint256 roundId) view returns (address[])",
  "function winners(uint256 roundId) view returns (address)",
  "function hasEntered(uint256 roundId,address account) view returns (bool)",
  "function enterCurrentRound()",
  "function finalizeCurrentRound()",
  "function startNextRound()"
];

const demoAddresses = [
  "0x8A4dC11c67B6354F10C95a36F26e49E33471A290",
  "0x27Fea0D94Cd4B0B86dE11C255A877C19D7e01235",
  "0xD3143F2f67E9D02Ae6a34319e01906c4c73C4A81",
  "0x4F7b380C53c6858cBf41D936Af893f2fCbe73160",
  "0x93C6cF4a1f4B38EE418A291DF84Aa3B8bb159D07"
];
const previewRounds: Round[] = [
  { id: 4, entrants: demoAddresses.slice(0, 4), winner: ZERO, finalized: false, preview: true },
  { id: 3, entrants: demoAddresses.slice(0, 5), winner: demoAddresses[2], finalized: true, preview: true },
  { id: 2, entrants: demoAddresses.slice(1, 4), winner: demoAddresses[1], finalized: true, preview: true },
  { id: 1, entrants: demoAddresses.slice(0, 3), winner: demoAddresses[0], finalized: true, preview: true }
];

const state = {
  rounds: [...previewRounds], account: "", chainId: 0, owner: "",
  activeProvider: null as EipProvider | null, browserProvider: null as BrowserProvider | null,
  wallets: [] as Wallet[], busy: false
};
const app = document.querySelector<HTMLDivElement>("#app")!;
const short = (v: string) => v ? `${v.slice(0, 6)}…${v.slice(-4)}` : "";
const current = () => state.rounds[0];
const isOwner = () => !!state.account && state.account.toLowerCase() === state.owner.toLowerCase();
const explorer = (account: string) => `${CHAIN.explorer}/address/${account}`;

function render() {
  const round = current();
  const history = state.rounds.filter(r => r.finalized);
  const entered = state.account && round?.entrants.some(x => x.toLowerCase() === state.account.toLowerCase());
  app.innerHTML = `
    <header>
      <a class="brand" href="#top" aria-label="CHANCERAIL home"><span>CR</span><strong>CHANCERAIL</strong></a>
      <nav aria-label="Primary"><a href="#draw">Current draw</a><a href="#entrants">Entrants</a><a href="#history">Archive</a></nav>
      <div class="head-actions"><span class="chain-dot"><i></i>BOT 677</span><button id="wallet">${state.account ? short(state.account) : "Connect wallet"}</button></div>
    </header>
    <main>
      <section class="hero" id="top" data-enter>
        <div class="hero-copy">
          <p class="kicker">FREE ENTRY · PUBLIC RESULT · BOT MAINNET</p>
          <h1>One address leaves the rail <em>as the winner.</em></h1>
          <p class="lead">CHANCERAIL is a free on-chain draw demonstration. Every entry, winner and past round stays inspectable on BOT Chain.</p>
          <div class="hero-actions"><button class="action" data-enter-draw>${entered ? "Entry recorded" : "Enter current draw"}<span>→</span></button><a href="#entrants">Inspect entrants ↓</a></div>
          <div class="hard-facts"><span><b>0 BOT</b> entry price</span><span><b>${round?.entrants.length || 0}</b> public entrants</span><span><b>#${round?.id || 0}</b> current round</span></div>
        </div>
        <div class="draw-stage" id="draw" aria-label="Current on-chain draw">
          <div class="rail-label"><span>ROUND ${String(round?.id || 0).padStart(2,"0")}</span><span>${round?.finalized ? "FINALIZED" : "OPEN"}</span></div>
          <div class="draw-wheel">
            ${Array.from({length: 12},(_,i)=>`<i style="--n:${i}">${String(i+1).padStart(2,"0")}</i>`).join("")}
            <div class="wheel-core"><small>CURRENT</small><strong>#${round?.id || 0}</strong><span>${round?.entrants.length || 0} ENTRIES</span></div>
          </div>
          <div class="draw-ticket"><span>YOUR STATUS</span><strong>${state.account ? (entered ? "ON THE RAIL" : "READY TO ENTER") : "WALLET NOT CONNECTED"}</strong><button data-enter-draw>${entered ? "View your entry" : "Enter free draw"} ↗</button></div>
        </div>
      </section>

      <section class="entrants" id="entrants">
        <div class="section-title"><p class="kicker">LIVE ROUND / ${String(round?.id || 0).padStart(2,"0")}</p><h2>The rail is public before the result.</h2></div>
        ${!LIVE ? `<div class="preview"><b>Preview state</b><span>Deploy ChanceRail and add <code>VITE_CHANCERAIL_ADDRESS</code> to load live rounds.</span></div>` : ""}
        <div class="entrant-board">
          <div class="board-head"><span>Position</span><span>Wallet address</span><span>Network record</span></div>
          ${(round?.entrants || []).map((address,i)=>`<article><b>${String(i+1).padStart(2,"0")}</b><code>${address}</code><a href="${explorer(address)}" target="_blank" rel="noreferrer">Explorer ↗</a></article>`).join("") || `<p class="empty">No entrant has joined this round.</p>`}
        </div>
      </section>

      <section class="winner-section">
        <div class="winner-word">WINNER</div>
        <div class="winner-panel">
          <p class="kicker">LATEST FINALIZED RESULT</p>
          <span>ROUND ${history[0]?.id || "—"}</span>
          <h2>${history[0] ? short(history[0].winner) : "Awaiting result"}</h2>
          <p>${history[0] ? history[0].winner : "The current round is still open."}</p>
          ${history[0] ? `<a class="dark-action" href="${explorer(history[0].winner)}" target="_blank" rel="noreferrer">Inspect winner <span>↗</span></a>` : ""}
        </div>
      </section>

      <section class="history" id="history">
        <div class="section-title"><p class="kicker">IMMUTABLE DRAW ARCHIVE</p><h2>Every finished round keeps its receipt.</h2></div>
        <div class="history-list">
          <div class="history-labels"><span>Round</span><span>Entrants</span><span>Winning address</span><span>Proof</span></div>
          ${history.map(r=>`<article><strong>#${String(r.id).padStart(2,"0")}</strong><span>${r.entrants.length} wallets</span><code>${r.winner}</code><a href="${explorer(r.winner)}" target="_blank" rel="noreferrer">Open ↗</a></article>`).join("") || `<p class="empty">No finalized rounds yet.</p>`}
        </div>
        ${isOwner() ? `<div class="operator"><p><b>Operator controls</b><span>Only the deployed contract owner can finalize or open rounds.</span></p><button id="operatorAction" class="action">${round?.finalized ? "Start next round" : "Finalize current round"}<span>→</span></button></div>` : ""}
      </section>

      <section class="notice">
        <div><p class="kicker">DEMONSTRATION LIMIT</p><h2>Visible is not the same as unpredictable.</h2></div>
        <p>This contract selects a demonstration winner from on-chain inputs. Those inputs can be influenced or anticipated, so this mechanism is not suitable for valuable prizes, gambling, raffles or financial use.</p>
      </section>
    </main>
    <footer><a class="brand foot-brand" href="#top"><span>CR</span><strong>CHANCERAIL</strong></a><p>Free on-chain draw demonstration.</p><div><a href="https://www.botchain.ai/en/" target="_blank" rel="noreferrer">BOT Chain</a><a href="${CHAIN.explorer}" target="_blank" rel="noreferrer">Explorer</a>${LIVE ? `<a href="${explorer(ADDRESS)}" target="_blank" rel="noreferrer">Contract</a>` : ""}</div><small>No prizes, deposits or entry payments are handled by this demonstration.</small></footer>
    <div id="modal"></div>`;
  bind();
}

function bind() {
  document.querySelector("#wallet")?.addEventListener("click", ()=> state.account ? showAccount() : showWallets());
  document.querySelectorAll("[data-enter-draw]").forEach(el=>el.addEventListener("click", enterDraw));
  document.querySelector("#operatorAction")?.addEventListener("click", ()=> write(current()?.finalized ? "startNextRound" : "finalizeCurrentRound", [], current()?.finalized ? "New round opened." : "Winner finalized."));
}

function showModal(content: string) {
  const root = document.querySelector<HTMLDivElement>("#modal")!;
  root.innerHTML = `<div class="backdrop"><section class="modal" role="dialog" aria-modal="true"><button class="close" aria-label="Close">×</button>${content}</section></div>`;
  root.querySelector(".close")?.addEventListener("click", closeModal);
  root.querySelector(".backdrop")?.addEventListener("click", e=>{ if(e.target===e.currentTarget) closeModal(); });
}
function closeModal(){ document.querySelector("#modal")!.innerHTML=""; }
function toast(message:string, error=false){ document.querySelector(".toast")?.remove(); const n=document.createElement("div"); n.className=`toast ${error?"error":""}`; n.textContent=message; document.body.append(n); requestAnimationFrame(()=>n.classList.add("show")); setTimeout(()=>n.classList.remove("show"),3800); setTimeout(()=>n.remove(),4200); }

function showWallets(){
  discoverWallets();
  showModal(`<p class="kicker">WALLET ACCESS</p><h2>Choose a public address.</h2><p class="modal-copy">Connecting only reveals your public account. No signature or transaction is requested until you choose to enter.</p><div class="wallet-list">${state.wallets.map((w,i)=>`<button data-wallet="${i}">${w.icon?`<img src="${w.icon}" alt="">`:`<i>${w.name[0]}</i>`}<span><b>${w.name}</b><small>Browser wallet</small></span><em>Connect ↗</em></button>`).join("")||`<div class="no-wallet"><b>No browser wallet detected.</b><span>Open this site inside an EVM wallet browser.</span></div>`}<a href="https://metamask.app.link/dapp/${location.host}${location.pathname}"><i>M</i><span><b>MetaMask mobile</b><small>Open the in-app browser</small></span><em>Open ↗</em></a></div><p class="security">BOT Mainnet · Chain 677 · Never enter a seed phrase here</p>`);
  document.querySelectorAll<HTMLElement>("[data-wallet]").forEach(el=>el.addEventListener("click",()=>connect(state.wallets[Number(el.dataset.wallet)])));
}
function showAccount(){ showModal(`<p class="kicker">CONNECTED ACCOUNT</p><h2>${short(state.account)}</h2><p class="modal-copy">${state.chainId===CHAIN.id?"Ready on BOT Mainnet.":"Switch networks before entering."}</p><div class="account-buttons"><button id="switch" class="action">Switch to BOT Mainnet <span>→</span></button><button id="forget">Forget session</button></div><a class="inspect" href="${explorer(state.account)}" target="_blank" rel="noreferrer">Inspect account ↗</a>`); document.querySelector("#switch")?.addEventListener("click",ensureChain); document.querySelector("#forget")?.addEventListener("click",()=>{state.account="";state.activeProvider=null;state.browserProvider=null;closeModal();render();}); }

async function discoverWallets(){
  const seen=new Set(state.wallets.map(w=>w.provider)); const add=(w:Wallet)=>{if(!seen.has(w.provider)){seen.add(w.provider);state.wallets.push(w);}};
  const handler=(event:Event)=>{const d=(event as CustomEvent).detail as {info:{name:string;icon?:string};provider:EipProvider};if(d?.provider)add({name:d.info.name,icon:d.info.icon,provider:d.provider});};
  window.addEventListener("eip6963:announceProvider",handler as EventListener); window.dispatchEvent(new Event("eip6963:requestProvider"));
  const eth=(window as Window&{ethereum?:EipProvider&{providers?:EipProvider[];isMetaMask?:boolean}}).ethereum;
  if(eth?.providers?.length)eth.providers.forEach((p,i)=>add({name:i?`Browser wallet ${i+1}`:"Injected wallet",provider:p})); else if(eth)add({name:eth.isMetaMask?"MetaMask":"Browser wallet",provider:eth});
  setTimeout(()=>window.removeEventListener("eip6963:announceProvider",handler as EventListener),1000);
}
async function connect(wallet:Wallet){ try{const accounts=await wallet.provider.request({method:"eth_requestAccounts"}) as string[];if(!accounts?.[0])throw new Error("No account returned.");state.activeProvider=wallet.provider;state.browserProvider=new BrowserProvider(wallet.provider as never);state.account=accounts[0];state.chainId=Number(await wallet.provider.request({method:"eth_chainId"}));wallet.provider.on?.("accountsChanged",(...a)=>{state.account=(a[0] as string[])?.[0]||"";render();});wallet.provider.on?.("chainChanged",(...a)=>{state.chainId=Number(a[0]);render();});closeModal();render();toast(`Connected ${short(state.account)}.`);if(state.chainId!==CHAIN.id)await ensureChain();}catch(e){toast(messageOf(e),true);} }
async function ensureChain(){ if(!state.activeProvider){showWallets();return false;}try{await state.activeProvider.request({method:"wallet_switchEthereumChain",params:[{chainId:CHAIN.hex}]});}catch(e){if((e as {code?:number}).code!==4902){toast(messageOf(e),true);return false;}await state.activeProvider.request({method:"wallet_addEthereumChain",params:[{chainId:CHAIN.hex,chainName:CHAIN.name,nativeCurrency:CHAIN.currency,rpcUrls:[CHAIN.rpc],blockExplorerUrls:[CHAIN.explorer]}]});}state.chainId=CHAIN.id;render();return true; }

async function contract(write=false){ if(!LIVE)throw new Error("Deploy ChanceRail and set VITE_CHANCERAIL_ADDRESS first.");if(!write)return new Contract(ADDRESS,ABI,new JsonRpcProvider(CHAIN.rpc));if(!state.account||!state.browserProvider){showWallets();throw new Error("Connect a wallet first.");}if(!(await ensureChain()))throw new Error("BOT Mainnet is required.");return new Contract(ADDRESS,ABI,await state.browserProvider.getSigner()); }
async function load(){ if(!LIVE)return;try{const c=await contract();const id=Number(await c.currentRound());state.owner=await c.owner();const active=await c.roundActive();const rounds:Round[]=[];for(let n=id;n>=Math.max(1,id-8);n--){const [entrants,winner]=await Promise.all([c.getParticipants(n),c.winners(n)]);rounds.push({id:n,entrants:[...entrants],winner,finalized:n<id||!active||winner!==ZERO});}state.rounds=rounds;render();}catch(e){toast(`Read-only RPC unavailable: ${messageOf(e)}`,true);} }
async function enterDraw(){ const r=current();if(r?.preview){toast("Deploy ChanceRail and set VITE_CHANCERAIL_ADDRESS first.",true);return;}if(state.account&&r?.entrants.some(x=>x.toLowerCase()===state.account.toLowerCase())){toast("This wallet is already entered in the current round.");return;}await write("enterCurrentRound",[],"Entry recorded on-chain."); }
async function write(method:string,args:unknown[],success:string){if(state.busy)return;try{state.busy=true;const c=await contract(true);toast("Confirm the transaction in your wallet.");const tx=await c[method](...args);toast(`Transaction sent: ${short(tx.hash)}`);await tx.wait();closeModal();await load();toast(success);}catch(e){if(!messageOf(e).includes("Connect a wallet first"))toast(messageOf(e),true);}finally{state.busy=false;} }
function messageOf(e:unknown){const x=e as {code?:number;shortMessage?:string;reason?:string;message?:string};if(x.code===4001)return"The wallet request was cancelled.";return x.shortMessage||x.reason||x.message||"The wallet could not complete the request.";}

render();discoverWallets();load();
