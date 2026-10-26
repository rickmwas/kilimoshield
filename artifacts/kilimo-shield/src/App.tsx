import { type ReactNode, useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import type { Crop, DemoRole, TransportStatus } from '@/lib/domain';
import {
  useDemoState, switchDemoRole, createHarvestRequest, confirmReservation,
  updateTransportStatus, getNextTransportStatus, checkInDelivery, getBuyerListings, createPurchaseOffer,
  respondToPurchaseOffer, confirmPayment, authorizeInventoryRelease,
  confirmCollection, resolveException, retryWorkflow, resetDemo,
} from '@/lib/demo-service';
import {
  Route, Switch, useLocation, Router as WouterRouter,
} from 'wouter';
import {
  ArrowDownRight, ArrowRight, BadgeCheck, Bell, Check, ChevronRight,
  CircleAlert, ClipboardList, Clock3, FileCheck2, Home, Leaf, ListChecks,
  MapPin, Package, Plus, RotateCcw, ShieldCheck, Truck, Warehouse, WalletCards,
} from 'lucide-react';

const queryClient = new QueryClient();
type AnyRecord = Record<string, any>;
type Role = DemoRole;
const roles: { id: Role; title: string; short: string }[] = [
  { id: 'farmer', title: 'Farmer', short: 'Farmer' },
  { id: 'facility', title: 'Facility operator', short: 'Facility' },
  { id: 'transporter', title: 'Transporter', short: 'Transport' },
  { id: 'buyer', title: 'Buyer / cooperative', short: 'Buyer' },
  { id: 'ops', title: 'Platform operations', short: 'Operations' },
];
const roleRoute: Record<Role, string> = { farmer: '/farmer', facility: '/facility', transporter: '/transporter', buyer: '/buyer', ops: '/ops' };
const roleIcon: Record<Role, ReactNode> = {
  farmer: <Leaf />, facility: <Warehouse />, transporter: <Truck />, buyer: <Package />, ops: <ClipboardList />,
};
const arr = (v: unknown): AnyRecord[] => Array.isArray(v) ? v as AnyRecord[] : [];
const text = (v: unknown, fallback = '—') => v === null || v === undefined || v === '' ? fallback : String(v);
const titleCase = (v: unknown) => text(v, 'Pending').replace(/[_-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
const first = (...values: unknown[]) => values.find(v => v !== null && v !== undefined && v !== '');
const idOf = (r: AnyRecord) => String(first(r.id, r.harvestRequestId, r.batchId, r.offerId, 'record'));
const cropOf = (r: AnyRecord) => text(first(r.crop, r.cropName, r.produce, r.commodity), 'Produce');
const quantityOf = (r: AnyRecord) => text(first(r.quantityKg, r.actualReceivedWeightKg, r.receivedKg, r.receivedWeightKg, r.quantity, r.expectedQuantityKg, r.estimatedKgForMatching, r.loadKg, r.weight), 'Not recorded');
const personOf = (r: AnyRecord) => text(first(r.farmerName, r.sellerName, r.farmer?.name, r.seller?.name, r.name), 'Farmer');
const stateValue = (s: AnyRecord, camel: string, snake: string) => arr(s?.[camel] ?? s?.[snake]);
const when = (r: AnyRecord) => text(first(r.createdAt, r.updatedAt, r.receivedAt, r.occurredAt, r.submittedAt, r.date), 'Recorded in demo');

function ActionButton({ children, onClick, variant = '', disabled = false, title }: { children: ReactNode; onClick?: () => void; variant?: string; disabled?: boolean; title?: string }) {
  return <button title={title} onClick={onClick} disabled={disabled} className={`button ${variant}`}>{children}</button>;
}
function Status({ value }: { value: unknown }) {
  const raw = String(value ?? 'pending').toLowerCase();
  const color = /reject|fail|exception|cancel|discrepancy/.test(raw) ? 'red' : /complete|accepted|verified|paid|delivered|released|received|resolved/.test(raw) ? 'green' : /progress|pending|await|submitted|reserved|offered/.test(raw) ? 'orange' : 'blue';
  return <span className={`status ${color}`}>{titleCase(value)}</span>;
}
function PageTitle({ kicker, title, copy, action }: { kicker: string; title: string; copy: string; action?: ReactNode }) {
  return <div className="page-top"><div><div className="tiny-label">{kicker}</div><h1>{title}</h1><p>{copy}</p></div>{action}</div>;
}
function Section({ title, description, children, action }: { title: string; description?: string; children: ReactNode; action?: ReactNode }) {
  return <section className="surface"><div className="surface-title"><div><h2>{title}</h2>{description && <p>{description}</p>}</div>{action}</div>{children}</section>;
}

function AppRouter() {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}><Switch>
    <Route path="/" component={Landing} />
    <Route path="/farmer/harvest/new" component={HarvestForm} />
    <Route path="/farmer" component={FarmerHome} />
    <Route path="/facility" component={FacilityHome} />
    <Route path="/transporter" component={TransportHome} />
    <Route path="/buyer" component={BuyerHome} />
    <Route path="/ops" component={OpsHome} />
    <Route component={NotFound} />
  </Switch></ErrorBoundary>;
}
function Brand({ inverse = false }: { inverse?: boolean }) {
  return <a href="/" className={`brand ${inverse ? 'inverse' : ''}`} aria-label="KilimoShield home"><img src="/kilimo-shield-mark.jpeg" alt="" /><span>KilimoShield</span></a>;
}
function Landing() {
  const [, setLocation] = useLocation();
  return <main className="landing">
    <div className="demo-ribbon"><b>Interactive demo</b><span>Sample and simulated records · No live dispatch, payment or GPS</span></div>
    <nav className="topnav"><Brand /><div className="navlinks"><a href="#how">How it works</a><a href="#roles">For each role</a><a href="#trust">Assessment limits</a><button className="button" onClick={() => setLocation('/farmer')}>Explore the demo <ArrowRight size={15} /></button></div></nav>
    <section className="hero">
      <div className="hero-copy"><div className="eyebrow">A clearer path from harvest to market</div><h1>Keep more of what your harvest is <span>worth.</span></h1><p>One simple request connects smallholder farmers in Kisii and Nyamira with suitable storage, coordinated collection and interested buyers.</p><div className="hero-actions"><button className="button" onClick={() => setLocation('/farmer/harvest/new')}>Report a harvest <ArrowRight size={16} /></button><button className="button secondary" onClick={() => setLocation('/ops')}>See how coordination works</button></div></div>
      <div className="hero-media"><img src="/produce-market.jpg" alt="Fresh produce arranged in a market display" /><div className="hero-stamp">FROM<br />HARVEST<br />TO MARKET</div><div className="photo-note"><strong>Many hands, one clear record.</strong><span>Storage, transport and buyer steps stay connected to the same request.</span></div></div>
    </section>
    <div className="ticker"><span>Farmer first</span><span>Human-confirmed steps</span><span>Traceable records</span><span>Built for local coordination</span></div>
    <section className="section" id="how"><div className="section-head"><div><div className="eyebrow">The route is simple</div><h2>Less chasing. Clearer next steps.</h2></div><p>KilimoShield helps different people work from the same record, without asking farmers to learn an operations system.</p></div>
      <div className="steps">
        <article className="step"><div className="step-num">01 / REPORT</div><h3>Tell us what is ready</h3><p>Choose the crop, quantity and pickup area. Add a photo if useful.</p></article>
        <article className="step"><div className="step-num">02 / REVIEW</div><h3>Compare a storage option</h3><p>See an estimated assessment, the evidence behind the suggestion and its cost details.</p></article>
        <article className="step"><div className="step-num">03 / COORDINATE</div><h3>Confirm before we proceed</h3><p>A confirmed reservation creates an eligible transport job. A transporter must accept it.</p></article>
        <article className="step"><div className="step-num">04 / VERIFY</div><h3>Record the real delivery</h3><p>Facility staff check actual weight and condition before inventory is listed.</p></article>
      </div>
    </section>
    <section className="role-band" id="roles"><div className="eyebrow">One connected demo</div><h2>Every role sees the work that belongs to them.</h2><div className="role-list">{[
      ['FARMER', 'A short path to request storage and follow a harvest.'],
      ['FACILITY OPERATOR', 'Capacity, expected arrivals, check-in and stored batches.'],
      ['TRANSPORTER', 'Suitable eligible jobs and clear delivery progress steps.'],
      ['BUYER / CO-OP', 'Verified inventory, offers and separate collection stages.'],
      ['PLATFORM OPERATIONS', 'Workflow evidence, exceptions and audit history.'],
      ['SHARED RECORD', 'Actions taken in one demo role appear across the journey.'],
    ].map(([label, copy]) => <article className="role-item" key={label}><small>{label}</small><h3>{label === 'SHARED RECORD' ? 'One connected record' : `For ${label.toLowerCase()}`}</h3><p>{copy}</p></article>)}</div><div style={{ marginTop: 27 }}><button className="button" onClick={() => setLocation('/farmer')}>Try the farmer view <ArrowRight size={15} /></button></div></section>
    <section className="section trust-strip" id="trust"><div className="trust-copy"><div className="eyebrow">Clear about what we know</div><h2>Photos can suggest. People verify.</h2><p>Demo assessment observations are estimates of visible condition only. An ordinary photo cannot confirm internal quality, exact shelf life or the weight a facility receives. Facility check-in records the actual quantity and observed condition.</p><button className="button dark" onClick={() => setLocation('/ops')}>Inspect the demo record <ArrowRight size={15} /></button></div><div className="trust-panel"><h3>Recommendations show their evidence</h3><p>In the demo, matching can compare seeded facility capacity, crop compatibility, distance and sample charges. This is simulated data, not a live availability check. Important actions—reservation, offer response, payment confirmation and release—remain separate human-confirmed steps.</p></div></section>
    <footer className="landing-footer"><Brand inverse /><span>Demo experience · Kisii &amp; Nyamira, Kenya</span><button className="button small secondary" onClick={() => setLocation('/farmer')}>Open workspace</button></footer>
  </main>;
}

function Workspace({ role, title, children }: { role: Role; title: string; children: ReactNode }) {
  const [location, setLocation] = useLocation();
  const activeRole = role;
  useEffect(() => { switchDemoRole(role); }, [role]);
  const navItems: { label: string; path: string; icon: ReactNode }[] = role === 'farmer'
    ? [{ label: 'My harvests', path: '/farmer', icon: <Home /> }, { label: 'Report harvest', path: '/farmer/harvest/new', icon: <Plus /> }]
    : role === 'facility'
      ? [{ label: 'Facility overview', path: '/facility', icon: <Warehouse /> }, { label: 'Arrivals & inventory', path: '/facility#inventory', icon: <Package /> }]
      : role === 'transporter'
        ? [{ label: 'Available jobs', path: '/transporter', icon: <Truck /> }]
        : role === 'buyer'
          ? [{ label: 'Produce listings', path: '/buyer', icon: <Package /> }, { label: 'Offers', path: '/buyer#offers', icon: <WalletCards /> }]
          : [{ label: 'Operations overview', path: '/ops', icon: <ClipboardList /> }, { label: 'Automation & audit', path: '/ops#audit', icon: <ListChecks /> }];
  const onRole = (next: Role) => {
    try { switchDemoRole(next); setLocation(roleRoute[next]); } catch (error) { window.dispatchEvent(new CustomEvent('demo-toast', { detail: `Could not switch role: ${String(error)}` })); }
  };
  return <div className="workspace app-shell">
    <header className="workspace-header"><Brand /><div className="header-right"><span className="sample-tag">Sample data · Demo only</span><label className="tiny-label" htmlFor="role-switch" style={{ color: '#c8c8c2' }}>Viewing as</label><select className="role-select" id="role-switch" value={activeRole} onChange={e => onRole(e.target.value as Role)} aria-label="Switch demo role">{roles.map(r => <option key={r.id} value={r.id}>{r.title}</option>)}</select></div></header>
    <div className="work-layout"><aside className="side-nav"><div className="side-label">{title}</div>{navItems.map(item => <a key={item.path} className={`side-link ${location === item.path ? 'active' : ''}`} href={item.path}>{item.icon}{item.label}</a>)}<div className="sample-box">All facilities, buyers, routes, capacity and workflow evidence shown here are seeded sample or simulated data.</div></aside>
      <main className="work-main">{children}</main></div>
    <nav className="mobile-tabs" aria-label="Workspace navigation">{navItems.map(item => <a key={item.path} className={location === item.path ? 'active' : ''} href={item.path}>{item.icon}<span>{item.label}</span></a>)}</nav>
  </div>;
}

function useData() {
  const value = useDemoState() as any;
  return value?.state ?? value?.data ?? value ?? {};
}
function useActions() {
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const run = async (label: string, fn: () => unknown) => {
    setError(''); setMessage('');
    try {
      const result: any = await fn();
      if (result?.ok === false || result?.error || result?.success === false) throw new Error(result.message || result.error || 'The action could not be completed.');
      const data = result?.ok === true && 'data' in result ? result.data : result;
      setMessage(data?.message || label);
      window.setTimeout(() => setMessage(''), 3800);
      return data;
    } catch (e) { setError(e instanceof Error ? e.message : 'This action could not be completed. Please try again.'); return null; }
  };
  const feedback = <>{error && <div className="error-message" role="alert">{error}</div>}{message && <div className="notice green" role="status">{message}</div>}</>;
  return { run, feedback };
}
function FarmerHome() {
  const state = useData(), { run, feedback } = useActions();
  const [, setLocation] = useLocation();
  const requests = stateValue(state, 'harvestRequests', 'harvest_requests');
  const batches = stateValue(state, 'inventoryBatches', 'inventory_batches');
  const offers = stateValue(state, 'purchaseOffers', 'purchase_offers');
  const notifications = stateValue(state, 'notifications', 'notifications');
  const farmer = arr(state.farmers)[0] ?? {};
  const mine = requests.filter(r => !r.farmerId || r.farmerId === farmer.id || r.farmer?.id === farmer.id);
  const visibleBatches = batches.filter(b => !b.farmerId || b.farmerId === farmer.id || b.sellerId === farmer.id);
  const myRequestIds = mine.map(idOf);
  const myOffers = offers.filter(o => visibleBatches.some(b => idOf(b) === String(first(o.inventoryBatchId, o.batchId))));
  const pending = mine.filter(r => /recommend|reservation|offered|awaiting.*farmer/i.test(String(r.status)));
  const latest = [...mine].reverse()[0];
  const confirm = (r: AnyRecord) => {
    const facilityId = String(first(r.selectedFacilityId, r.recommendations?.[0]?.facilityId, state.facilities?.[0]?.id, ''));
    if (!facilityId) return run('No sample facility recommendation is available.', () => ({ ok: false, error: 'No sample facility recommendation is available.' }));
    return run('Reservation confirmed. Transport is still waiting for a transporter to accept.', () => confirmReservation(idOf(r), facilityId));
  };
  return <Workspace role="farmer" title="Farmer workspace"><PageTitle kicker="Your harvest, made easier" title={`Hello${farmer.name ? `, ${String(farmer.name).split(' ')[0]}` : ''}. What’s ready?`} copy="A short path from your farm to suitable storage. Your confirmed actions stay linked to the same record." action={<ActionButton onClick={() => setLocation('/farmer/harvest/new')}><Plus size={15} /> Report a harvest</ActionButton>} />
    {feedback}
    <div className="notice"><strong>Demo information</strong>Facilities, capacity, charges and delivery estimates below are sample/simulated. Assessment observations are estimates; a photo cannot verify inside quality or shelf life.</div>
    {notifications.length > 0 && <Section title="Needs your attention" description="Only actions requiring your confirmation."><div>{notifications.slice(0, 3).map((n: AnyRecord, i: number) => <div className="list-row" key={idOf(n) + i}><Bell size={15} /><div className="row-main"><strong>{text(first(n.title, n.message), 'Update')}</strong><small>{text(n.body, n.message)}</small></div><ChevronRight size={15} /></div>)}</div></Section>}
    <div className="two-col" style={{ marginTop: 16 }}>
      <Section title="Your harvest requests" description="Follow each request and take the next step when it is yours.">
        {mine.length ? mine.map((r: AnyRecord) => <div className="list-row" key={idOf(r)}><div className="row-main"><strong>{cropOf(r)} <span style={{ color: '#85857e', fontWeight: 500 }}>· {quantityOf(r)} kg reported</span></strong><small>Ref {idOf(r)} · {when(r)}</small><small>Next: {text(first(r.nextAction, r.waitingOn), 'Check request status')}</small></div><div style={{ display: 'grid', gap: 8, justifyItems: 'end' }}><Status value={r.status} />{pending.includes(r) && <ActionButton variant="small" onClick={() => confirm(r)}>Confirm storage</ActionButton>}</div></div>) : <div className="empty"><strong>No harvest requests yet</strong>Report what is ready and we’ll show the next step here.<div style={{ marginTop: 12 }}><ActionButton variant="small" onClick={() => setLocation('/farmer/harvest/new')}>Report a harvest</ActionButton></div></div>}
      </Section>
      <Section title={latest ? 'Your latest journey' : 'A simple first step'} description={latest ? 'Progress shown comes from this demo record, not live location tracking.' : 'No request is needed to explore the demo.'}>
        {latest ? <><div className="timeline">{['Request received', 'Assessment estimate', 'Facility recommendation', 'Reservation confirmed', 'Transport accepted', 'Facility check-in'].map((stage, i) => {
          const status = String(latest.status || '').toLowerCase();
          const indexes = /checked|received|inventory/.test(status) ? 6 : /delivered|facility/.test(status) ? 5 : /picked|collected|pickup/.test(status) ? 4 : /transport|accepted|en.route/.test(status) ? 3 : /reserved|confirmed|booked/.test(status) ? 3 : /recommend|assessed|match/.test(status) ? 2 : 1;
          return <div className={`timeline-item ${i < indexes ? 'done' : ''}`} key={stage}><strong>{stage}</strong><small>{i === 0 ? when(latest) : i < indexes ? 'Recorded in sample workflow' : 'Not recorded yet'}</small></div>;
        })}</div><span className="status blue"><MapPin size={11} />No live GPS tracking</span></> :
          <div className="empty"><strong>Ready when you are</strong>Start by sharing your crop and quantity. You can correct an estimated crop suggestion before submitting.<ActionButton variant="small" onClick={() => setLocation('/farmer/harvest/new')}><Plus size={13} /> Report harvest</ActionButton></div>}
      </Section>
    </div>
    <Section title="Produce in storage" description="Facility-checked quantity and condition are distinct from the amount you first reported." >
      {visibleBatches.length ? visibleBatches.map((b: AnyRecord) => <div className="list-row" key={idOf(b)}><div className="row-main"><strong>{cropOf(b)} · {quantityOf(b)} kg received</strong><small>{text(first(b.facilityName, b.facility?.name), 'Sample facility')} · received {when(b)}</small><small>Condition: {text(first(b.condition, b.qualityStatus), 'Awaiting facility check')}</small></div><Status value={b.status} /></div>) : <div className="empty"><strong>No checked-in inventory yet</strong>Once a facility records the received weight and observed condition, the batch appears here.</div>}
    </Section>
    <Section title="Buyer offers" description="An offer is interest—not payment. Offer, payment and physical collection are separate steps." >
      {myOffers.length ? myOffers.map((o: AnyRecord) => <OfferRow key={idOf(o)} offer={{ ...o, crop: visibleBatches.find(b => idOf(b) === o.batchId)?.crop, buyerName: state.buyers?.find((buyer: AnyRecord) => buyer.id === o.buyerId)?.name }} onRespond={(response) => run(`Offer ${response}.`, () => respondToPurchaseOffer(idOf(o), response))} />) : <div className="empty"><strong>No offers yet</strong>Offers appear when a buyer makes an offer on a recorded batch.</div>}
    </Section>
  </Workspace>;
}

function HarvestForm() {
  const state = useData(), { run, feedback } = useActions();
  const [, setLocation] = useLocation();
  const [crop, setCrop] = useState<Crop>('Tomato'), [quantity, setQuantity] = useState(''), [unit, setUnit] = useState<'kg' | 'crate'>('kg'), [location, setPickup] = useState(''), [note, setNote] = useState(''), [photo, setPhoto] = useState(''), [photoError, setPhotoError] = useState(''), [chosenFacilityId, setChosenFacilityId] = useState('');
  const [submitted, setSubmitted] = useState<AnyRecord | null>(null);
  const farmer = arr(state.farmers)[0] ?? {};
  const facilities = arr(state.facilities);
  const previewFacility = facilities[0];
  const assessment = (record: AnyRecord) => record?.assessment ?? record?.recommendation ?? {};
  const onFile = (file?: File) => {
    setPhotoError('');
    if (!file) return;
    if (!file.type.startsWith('image/')) { setPhotoError('Choose a JPG, PNG or other image file.'); return; }
    if (file.size > 8 * 1024 * 1024) { setPhotoError('Image must be smaller than 8 MB.'); return; }
    setPhoto(URL.createObjectURL(file));
  };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (Number(quantity) <= 0 || !Number.isFinite(Number(quantity))) { setPhotoError('Enter a quantity greater than zero.'); return; }
    const result = await run('Harvest request submitted. Review the estimated recommendation below.', () => createHarvestRequest({
      farmerId: farmer.id, crop, quantity: Number(quantity), unit,
      location, note, photoName: photo ? 'Farmer crop photo (demo attachment)' : undefined,
    }) as any);
    if (result) setSubmitted(result.request ?? result.harvestRequest ?? result);
  };
  const assess = assessment(submitted ?? {});
  const recommendations = arr(submitted?.recommendations);
  const recommendation = recommendations.find(rec => rec.facilityId === chosenFacilityId) ?? recommendations[0] ?? {};
  const recommendedFacility = (first(submitted?.recommendedFacility, submitted?.facilityRecommendation, submitted?.recommendation?.facility, facilities.find(f => f.id === recommendation.facilityId), assess.facility, previewFacility) ?? {}) as AnyRecord;
  const recommendationReason = first(submitted?.recommendationReason, submitted?.whyRecommended, recommendation.reason, assess.explanation, assess.reason, 'The sample match considers crop compatibility, sample capacity, estimated distance and sample charges. These values are simulated.');
  const requestId = submitted ? idOf(submitted) : '';
  const confirm = () => run('Reservation confirmed. A transport job is now eligible, but a transporter must accept it.', () => confirmReservation(requestId, String(recommendation.facilityId ?? '')));
  return <Workspace role="farmer" title="Report harvest"><PageTitle kicker="Farmer · New request" title="Tell us what’s ready." copy="A few details help us compare suitable storage and collection options." action={<ActionButton variant="secondary" onClick={() => setLocation('/farmer')}>Back to my harvests</ActionButton>} />
    {feedback}
    {!submitted ? <Section title="Harvest details" description="Use one unit consistently. You can correct your crop selection at any time."><form onSubmit={submit}>
      <div className="form-grid"><div className="field"><label htmlFor="crop">What crop is ready?</label><select id="crop" value={crop} onChange={e => setCrop(e.target.value)}>{['Tomato', 'Avocado', 'Banana', 'Beans', 'Maize', 'Potato'].map(c => <option key={c}>{c}</option>)}</select><small>The demo does not use a production AI crop model.</small></div>
        <div className="field"><label htmlFor="qty">How much do you have?</label><div style={{ display: 'flex', gap: 7 }}><input id="qty" inputMode="decimal" type="number" min="0.1" step="0.1" value={quantity} onChange={e => setQuantity(e.target.value)} required placeholder="e.g. 120" /><select aria-label="Quantity unit" value={unit} onChange={e => setUnit(e.target.value)} style={{ width: 116, border: '1px solid #d9d5cb', borderRadius: 5, padding: '0 8px' }}><option value="kg">Kilograms</option><option value="crate">Crates</option></select></div></div>
      </div>
      <div className="field"><label htmlFor="pickup">Pickup area or landmark</label><input id="pickup" value={location} onChange={e => setPickup(e.target.value)} required placeholder="Village, market or nearby landmark" /><small>Demo location only. Do not share a precise GPS coordinate.</small></div>
      <div className="field"><label htmlFor="photo">Crop photo (optional)</label><div className="filebox"><div><Plus size={19} /><br />Take a photo or choose an image<br /><small>JPG / PNG · up to 8 MB</small></div><input id="photo" type="file" accept="image/*" capture="environment" onChange={e => onFile(e.target.files?.[0])} aria-label="Add an optional crop photo" /></div>{photo && <img className="photo-preview" src={photo} alt="Preview of selected crop" />}</div>
      <div className="field"><label htmlFor="note">Anything we should know? (optional)</label><textarea id="note" value={note} onChange={e => setNote(e.target.value)} placeholder="Urgency, harvest timing, or visible concerns" /></div>
      {photoError && <div className="error-message" role="alert">{photoError}</div>}
      <div className="notice"><strong>Photo limitations</strong>Photos may support an estimate of visible appearance. They cannot verify internal quality, actual weight or exact shelf life.</div>
      <div className="form-actions"><button className="button" type="submit"><FileCheck2 size={15} /> Submit harvest request</button><button className="button secondary" type="button" onClick={() => setLocation('/farmer')}>Cancel</button></div>
    </form></Section> :
    <><div className="notice green"><strong>Request received · {requestId}</strong>This demo assessment is an estimate, not a quality certificate. Check the recommendation before confirming storage.</div>
      <div className="two-col"><Section title="Estimated crop assessment" description="Sample assessment observations only."><div className="list-row"><div className="row-main"><strong>Likely crop</strong><small>Corrected by you before submission</small></div><b>{text(assess.crop, crop)}</b></div><div className="list-row"><div className="row-main"><strong>Reported amount</strong><small>Not a facility-verified weight</small></div><b>{text(submitted.quantity, quantity)} {unit}</b></div><div className="list-row"><div className="row-main"><strong>Visible observations</strong><small>Estimate only; internal condition unverified</small></div><b>{text(assess.visibleObservations, 'Not assessed from this request')}</b></div><div className="notice"><strong>Evidence &amp; limits</strong>{text(assess.limitations, 'This is a simulated assessment. Photos cannot verify internal quality or shelf life.')}</div></Section>
        <Section title="Suggested storage option" description="Sample facility and capacity data · not live availability.">{recommendations.length > 1 && <div className="field"><label htmlFor="facility-choice">Compare sample facility options</label><select id="facility-choice" value={recommendation.facilityId} onChange={e => setChosenFacilityId(e.target.value)}>{recommendations.map((rec, index) => <option key={rec.facilityId} value={rec.facilityId}>{index === 0 ? 'Recommended · ' : 'Alternative · '}{facilities.find(f => f.id === rec.facilityId)?.name || rec.facilityId}</option>)}</select></div>}<div className="row-main"><strong>{text(recommendedFacility?.name, 'Sample facility')}</strong><small>{text(recommendedFacility?.storageType, 'Compatible storage')} · {text(recommendation.estimatedDistanceKm, 'Sample distance')} km (simulated)</small><small>Available sample capacity: {text(recommendedFacility?.availableKg, 'Not listed')} kg · KSh {text(recommendation.estimatedStorageCostPerDayKsh)} per day for this quantity</small><small>Estimated transport: KSh {text(recommendation.estimatedTransportCostKsh)} · first-day estimate: KSh {text(recommendation.estimatedFirstDayTotalKsh)}</small></div><div className="notice green"><strong>Why this option</strong>{String(recommendationReason)}</div><p style={{ color: '#777973', fontSize: 11, lineHeight: 1.6 }}>A confirmed reservation creates an eligible transport job; no transporter is accepted or dispatched automatically.</p><div className="button-row"><ActionButton onClick={confirm}><Check size={14} /> Confirm sample reservation</ActionButton><ActionButton variant="secondary" onClick={() => setLocation('/farmer')}>Decide later</ActionButton></div></Section></div></>}
  </Workspace>;
}

function FacilityHome() {
  const s = useData(), { run, feedback } = useActions();
  const requests = stateValue(s, 'harvestRequests', 'harvest_requests');
  const jobs = stateValue(s, 'transportJobs', 'transport_jobs');
  const batches = stateValue(s, 'inventoryBatches', 'inventory_batches');
  const offers = stateValue(s, 'purchaseOffers', 'purchase_offers');
  const facilities = arr(s.facilities);
  const facility = facilities[0] ?? {};
  const capacity = Number(first(facility.capacityKg, facility.totalCapacityKg, facility.capacity, 0));
  const reserved = requests.filter(r => /reserv|confirm|book/i.test(String(r.status))).reduce((n, r) => n + Number(first(r.quantityKg, r.quantity, 0)), 0);
  const occupied = batches.reduce((n, b) => n + Number(first(b.quantityKg, b.actualReceivedWeightKg, b.quantity, 0)), 0);
  const relevantJobs = jobs.filter(j => !j.facilityId || j.facilityId === facility.id || j.destinationFacilityId === facility.id);
  const expected = relevantJobs.filter(j => !/delivered|received|checked|complete/i.test(String(j.status)));
  const checkin = async (job: AnyRecord) => {
    const weight = window.prompt(`Record actual received weight in kg for ${cropOf(job)}. This is a facility measurement, not an estimate.`);
    if (weight === null) return;
    const n = Number(weight);
    if (!n || n < 0) { window.alert('Enter a received weight greater than zero.'); return; }
    const condition = window.prompt('Record observed condition at receiving (for example: sound, bruised, mixed):', 'Observed at facility');
    if (condition === null) return;
    const observed = /poor|attention|bad/i.test(condition) ? 'Needs attention' : /fair|mixed/i.test(condition) ? 'Fair' : 'Good';
    await run('Facility check-in recorded. Inventory now reflects received quantity.', () => checkInDelivery(idOf(job), { receivedKg: n, condition: observed, decision: 'accepted', qualityGrade: 'Not graded' }));
  };
  return <Workspace role="facility" title="Facility operations"><PageTitle kicker="Sample facility · Kisii county" title="Facility operations" copy="See reserved capacity separately from physically occupied storage, then verify each arrival." />
    {feedback}<div className="notice"><strong>Sample facility data</strong>{text(facility.name, 'Kisii sample facility')} · all capacity, storage rates, route and arrival information shown is simulated, not live.</div>
    <div className="metric-row"><div className="metric"><div className="metric-label">Total capacity</div><div className="metric-value">{capacity || '—'}<small style={{ fontSize: 12 }}> kg</small></div><div className="metric-note">Seeded sample capacity</div></div><div className="metric"><div className="metric-label">Reserved</div><div className="metric-value">{reserved}<small style={{ fontSize: 12 }}> kg</small></div><div className="metric-note">Confirmed request estimates</div></div><div className="metric"><div className="metric-label">Physically occupied</div><div className="metric-value">{occupied}<small style={{ fontSize: 12 }}> kg</small></div><div className="metric-note">Facility-recorded inventory</div></div><div className="metric"><div className="metric-label">Expected arrivals</div><div className="metric-value">{expected.length}</div><div className="metric-note">Simulated transport jobs</div></div></div>
    <div className="two-col"><Section title="Capacity overview" description="Reservations and received inventory are tracked separately."><div className="list-row"><div className="row-main"><strong>Physically occupied</strong><small>Checked in at this facility</small></div><b>{occupied} kg</b></div><div className="bar"><span style={{ width: `${capacity ? Math.min(100, occupied / capacity * 100) : 0}%` }} /></div><div className="list-row" style={{ marginTop: 10 }}><div className="row-main"><strong>Reserved, not yet received</strong><small>Not added to occupied capacity</small></div><b>{reserved} kg</b></div><div className="bar"><span style={{ width: `${capacity ? Math.min(100, reserved / capacity * 100) : 0}%`, background: '#8b9c73' }} /></div></Section>
      <Section title="Incoming deliveries" description="Arrival stages are simulated; no live tracking." >{expected.length ? expected.map(j => <div className="list-row" key={idOf(j)}><div className="row-main"><strong>{cropOf(j)} · {quantityOf(j)} kg</strong><small>{text(first(j.pickupLocation, j.origin), 'Sample pickup area')} → {text(first(facility.name, j.facilityName), 'Sample facility')}</small><small>Transport: {text(first(j.transporterName, j.transporter?.name), 'Awaiting transporter')}</small></div><div style={{ display: 'grid', gap: 7, justifyItems: 'end' }}><Status value={j.status} />{/arrived|deliver|en.route.*facility/i.test(String(j.status)) && <ActionButton variant="small" onClick={() => checkin(j)}>Record check-in</ActionButton>}</div></div>) : <div className="empty"><strong>No incoming deliveries</strong>Confirmed sample reservations appear here after a transporter accepts a job.</div>}</Section></div>
    <Section title="Reservations" description="Bookings are not the same as received inventory."><div className="table-wrap"><table className="data-table"><thead><tr><th>Request</th><th>Farmer</th><th>Crop</th><th>Expected amount</th><th>Status</th></tr></thead><tbody>{requests.length ? requests.map(r => <tr key={idOf(r)}><td>{idOf(r)}</td><td>{personOf(r)}</td><td>{cropOf(r)}</td><td>{quantityOf(r)} kg</td><td><Status value={r.status} /></td></tr>) : <tr><td colSpan={5}>No sample reservations.</td></tr>}</tbody></table></div></Section>
    <Section title="Stored inventory" description="Only check-in records represent facility-verified received quantities." ><div className="table-wrap"><table className="data-table"><thead><tr><th>Batch</th><th>Seller</th><th>Crop</th><th>Received</th><th>Condition</th><th>Offer</th></tr></thead><tbody>{batches.length ? batches.map(b => <tr key={idOf(b)}><td>{idOf(b)}</td><td>{personOf(b)}</td><td>{cropOf(b)}</td><td>{quantityOf(b)} kg</td><td>{text(first(b.condition, b.qualityStatus), 'Not recorded')}</td><td>{offers.some(o => String(first(o.batchId, o.inventoryBatchId)) === idOf(b)) ? 'Offer recorded' : 'No offer yet'}</td></tr>) : <tr><td colSpan={6}>No received batches yet.</td></tr>}</tbody></table></div></Section>
  </Workspace>;
}

function TransportHome() {
  const s = useData(), { run, feedback } = useActions();
  const jobs = stateValue(s, 'transportJobs', 'transport_jobs');
  const [filter, setFilter] = useState('all');
  const visible = jobs.filter(j => filter === 'all' || (filter === 'eligible' ? /available|eligible|pending/i.test(String(j.status)) : !/available|eligible|pending/i.test(String(j.status))));
  const advance = (job: AnyRecord) => {
    const next = getNextTransportStatus(job.status as TransportStatus);
    if (!next) return;
    const labels: Record<string, string> = { accepted: 'Accept job', en_route_to_pickup: 'Start to pickup', arrived_at_pickup: 'Arrived at pickup', picked_up: 'Confirm produce collected', in_transit: 'Start to facility', delivered: 'Confirm facility delivery', facility_received: 'Facility receipt recorded', cancelled: 'Cancelled' };
    const prompt = `${labels[next]} for this sample delivery? This is a demo status update only.`;
    if (!window.confirm(prompt)) return;
    void run(`${labels[next]} recorded in demo. No dispatch or live GPS is involved.`, () => updateTransportStatus(idOf(job), next));
  };
  const nextLabel = (job: AnyRecord) => {
    const next = getNextTransportStatus(job.status as TransportStatus);
    return next ? ({ accepted: 'Accept job', en_route_to_pickup: 'Start to pickup', arrived_at_pickup: 'Arrived at pickup', picked_up: 'Confirm collected', in_transit: 'Start to facility', delivered: 'Confirm delivery', facility_received: 'Receipt confirmed', cancelled: '' } as Record<string, string>)[next] : '';
  };
  return <Workspace role="transporter" title="Transport jobs"><PageTitle kicker="Transporter · Mobile workspace" title="Your next delivery." copy="Review load requirements before accepting. Every route and location in this demo is simulated." /><div className="notice"><strong>No automatic acceptance or live tracking</strong>Accept a suitable job, then record each progress step. This demo does not dispatch vehicles or provide GPS.</div>{feedback}
    <div className="button-row" style={{ margin: '0 0 16px' }}><button className={`button small ${filter === 'all' ? '' : 'secondary'}`} onClick={() => setFilter('all')}>All jobs ({jobs.length})</button><button className={`button small ${filter === 'eligible' ? '' : 'secondary'}`} onClick={() => setFilter('eligible')}>Eligible to accept</button><button className={`button small ${filter === 'active' ? '' : 'secondary'}`} onClick={() => setFilter('active')}>Accepted / active</button></div>
    {visible.length ? visible.map(j => <section className="surface" key={idOf(j)} style={{ marginBottom: 13 }}><div className="surface-title"><div><span className="tiny-label">Job {idOf(j)}</span><h2 style={{ marginTop: 5 }}>{cropOf(j)} · {quantityOf(j)} kg</h2></div><Status value={j.status} /></div><div className="three-col" style={{ margin: '16px 0' }}><div><span className="tiny-label">Pickup area</span><p style={{ fontSize: 12 }}>{text(first(j.pickupLocation, j.origin), 'Sample pickup')}</p></div><div><span className="tiny-label">Destination</span><p style={{ fontSize: 12 }}>{text(first(j.facilityName, j.destinationFacility?.name), 'Sample facility')}</p></div><div><span className="tiny-label">Vehicle / load</span><p style={{ fontSize: 12 }}>{text(first(j.vehicleType, j.vehicleRequirement), 'Requirement not listed')}</p></div></div><div className="list-row"><div className="row-main"><strong>Sample distance: {text(first(j.distanceKm, j.distance), 'Not provided')} km</strong><small>Estimated fee: {text(first(j.fee, j.transportFee), 'Not listed')} · time window: {text(first(j.timeWindow, j.estimatedWindow), 'Sample window')}</small><small>Distance and route are seeded demo data, not navigation or a live driver position.</small></div></div>{nextLabel(j) && <ActionButton onClick={() => advance(j)}><ArrowRight size={14} /> {nextLabel(j)}</ActionButton>}</section>) : <div className="empty"><strong>No jobs in this view</strong>Eligible jobs only appear after a farmer confirms a sample reservation.</div>}
  </Workspace>;
}

function OfferRow({ offer, onRespond }: { offer: AnyRecord; onRespond: (response: 'accepted' | 'rejected') => void }) {
  const total = Number(offer.priceKshPerKg || 0) * Number(offer.quantityKg || 0);
  return <div className="list-row"><div className="row-main"><strong>{text(first(offer.buyerName, offer.buyer?.name), 'Sample buyer')} · {cropOf(offer)}</strong><small>{text(offer.quantityKg, 'Quantity not specified')} kg at KSh {text(offer.priceKshPerKg, '—')}/kg · KSh {total ? total.toLocaleString() : '—'} total</small><small>Payment: {titleCase(first(offer.paymentStatus, 'not confirmed'))} · collection: {titleCase(first(offer.releaseStatus, 'not arranged'))}</small></div><div style={{ display: 'grid', gap: 7, justifyItems: 'end' }}><Status value={offer.status} />{/submitted|pending/i.test(String(offer.status)) && <div className="button-row"><button className="button small" onClick={() => onRespond('accepted')}>Accept</button><button className="button small secondary" onClick={() => onRespond('rejected')}>Reject</button></div>}</div></div>;
}
function BuyerHome() {
  const s = useData(), { run, feedback } = useActions();
  const listingRecords = getBuyerListings(s);
  const batches = listingRecords.filter((listing: AnyRecord) => listing.availableToOfferKg > 0).map((listing: AnyRecord) => ({ ...listing.batch, seller: listing.seller, facility: listing.facility, availableToOfferKg: listing.availableToOfferKg }));
  const offers = stateValue(s, 'purchaseOffers', 'purchase_offers');
  const [cropFilter, setCropFilter] = useState('all'), [query, setQuery] = useState('');
  const available = batches;
  const crops = [...new Set(available.map(cropOf))];
  const listings = available.filter(b => (cropFilter === 'all' || cropOf(b) === cropFilter) && `${cropOf(b)} ${personOf(b)} ${first(b.facilityName, b.facility?.name, '')}`.toLowerCase().includes(query.toLowerCase()));
  const offer = async (b: AnyRecord) => {
    const quantityText = window.prompt(`How many kilograms of ${cropOf(b)} would you like to offer for? Up to ${b.availableToOfferKg} kg is currently free in this sample listing.`);
    if (!quantityText) return;
    const quantityKg = Number(quantityText);
    if (quantityKg <= 0 || !Number.isFinite(quantityKg) || quantityKg > b.availableToOfferKg) { window.alert('Enter a positive quantity no greater than the available sample quantity.'); return; }
    const priceText = window.prompt('Enter your offer price per kg in KSh:');
    if (!priceText) return;
    const priceKshPerKg = Number(priceText);
    if (priceKshPerKg <= 0 || !Number.isFinite(priceKshPerKg)) { window.alert('Enter a valid price per kg.'); return; }
    if (!window.confirm(`Submit ${quantityKg} kg at KSh ${priceKshPerKg}/kg? The seller must respond; payment and collection are separate.`)) return;
    await run('Offer submitted for seller review. No payment has been made.', () => createPurchaseOffer({ batchId: idOf(b), buyerId: s.buyers?.[0]?.id, quantityKg, priceKshPerKg }));
  };
  const accepted = offers.filter(o => /accepted/i.test(String(o.status)));
  return <Workspace role="buyer" title="Buyer sourcing"><PageTitle kicker="Buyer / cooperative" title="Source what you can verify." copy="Browse facility-recorded inventory. Offers require a seller response; payment and physical collection are never implied." />
    {feedback}<div className="notice"><strong>Sample listings · simulated availability</strong>Quantities and facility details come from seeded demo records. Check whether each quantity and condition were verified at check-in.</div>
    <div className="metric-row"><div className="metric"><div className="metric-label">Available sample batches</div><div className="metric-value">{available.length}</div><div className="metric-note">Not live market supply</div></div><div className="metric"><div className="metric-label">Crop types</div><div className="metric-value">{crops.length}</div><div className="metric-note">In current demo inventory</div></div><div className="metric"><div className="metric-label">Offers submitted</div><div className="metric-value">{offers.length}</div><div className="metric-note">Seller response pending where shown</div></div><div className="metric"><div className="metric-label">Accepted offers</div><div className="metric-value">{accepted.length}</div><div className="metric-note">Not equivalent to paid or collected</div></div></div>
    <Section title="Produce listings" description="Only facility-recorded receiving details can verify quantity and observed condition." >
      <div className="form-grid" style={{ marginBottom: 15 }}><div className="field" style={{ marginBottom: 0 }}><label htmlFor="search-listings">Search inventory</label><input id="search-listings" value={query} onChange={e => setQuery(e.target.value)} placeholder="Crop, seller, or facility" /></div><div className="field" style={{ marginBottom: 0 }}><label htmlFor="filter-crop">Filter by crop</label><select id="filter-crop" value={cropFilter} onChange={e => setCropFilter(e.target.value)}><option value="all">All crops</option>{crops.map(c => <option key={c}>{c}</option>)}</select></div></div>
      {listings.length ? listings.map(b => <article className="list-row" key={idOf(b)}><div className="row-main"><strong>{cropOf(b)} · {quantityOf(b)} kg received</strong><small>Seller: {text(b.seller?.name, 'Sample seller')} · facility: {text(b.facility?.name, 'Sample facility')}</small><small>Available for another offer: {b.availableToOfferKg} kg · observed condition: {text(b.condition, 'Not stated')}</small><small>Received {when(b)} · grade: {text(b.qualityGrade, 'Not graded')} · sample listing</small></div><div style={{ display: 'grid', gap: 8, justifyItems: 'end' }}><Status value={b.inventoryStatus} /><ActionButton variant="small" onClick={() => offer(b)}>Make an offer</ActionButton></div></article>) : <div className="empty"><strong>No matching inventory</strong>Try another crop or search term. New listings appear after facility check-in.</div>}
    </Section>
    <Section title="Your offers" description="An accepted offer still needs separate payment confirmation, release authorization and collection."><div id="offers">{offers.length ? offers.map(o => <div className="list-row" key={idOf(o)}><div className="row-main"><strong>{cropOf(o)} · {text(first(o.totalPrice, o.amount), 'Amount not listed')}</strong><small>Offer {idOf(o)} · batch {text(first(o.batchId, o.inventoryBatchId))}</small><small>Payment: {titleCase(first(o.paymentStatus, 'not confirmed'))} · release: {titleCase(first(o.releaseStatus, 'not authorized'))} · collection: {titleCase(first(o.collectionStatus, 'not confirmed'))}</small></div><Status value={o.status} /></div>) : <div className="empty"><strong>No offers submitted</strong>Choose a sample inventory batch to send a proposal.</div>}</div></Section>
    <Section title="Sourcing note" description="This demo does not reserve stock automatically."><p style={{ fontSize: 12, lineHeight: 1.7, color: '#666a67', margin: 0 }}>Compare quantity, storage location and receiving observations. If a sourcing target needs multiple batches, treat each batch as a separate proposal: ownership is not merged, and inventory cannot be reserved twice by this frontend.</p></Section>
  </Workspace>;
}

function OpsHome() {
  const s = useData(), { run, feedback } = useActions();
  const requests = stateValue(s, 'harvestRequests', 'harvest_requests'), jobs = stateValue(s, 'transportJobs', 'transport_jobs'), batches = stateValue(s, 'inventoryBatches', 'inventory_batches'), offers = stateValue(s, 'purchaseOffers', 'purchase_offers'), runs = stateValue(s, 'workflowRuns', 'workflow_runs'), tasks = stateValue(s, 'automationTasks', 'automation_tasks'), exceptions = arr(s.exceptions), audit = stateValue(s, 'auditEvents', 'audit_events'), activities = arr(s.activities);
  const notifications = arr(s.notifications);
  const openExceptions = exceptions.filter(e => !/resolved|closed/i.test(String(e.status)));
  const reset = () => { if (window.confirm('Reset all shared demo state to its seeded starting point? This cannot be undone.')) void run('Shared demo state reset.', () => resetDemo() as any); };
  const resolve = (e: AnyRecord) => { if (window.confirm('Mark this sample exception as reviewed and resolved?')) void run('Exception marked resolved.', () => resolveException(idOf(e), { resolution: 'Reviewed by demo operator' }) as any); };
  const retry = (w: AnyRecord) => { if (window.confirm('Retry this workflow using the demo service?')) void run('Workflow retry requested.', () => retryWorkflow(idOf(w)) as any); };
  const confirmOfferPayment = (o: AnyRecord) => {
    if (!window.confirm('Record payment confirmation for this sample offer? This is a demo record only; no money moves.')) return;
    void run('Sample payment confirmation recorded. Inventory release still needs separate authorization.', () => confirmPayment(idOf(o)) as any);
  };
  const release = (o: AnyRecord) => {
    if (!window.confirm('Authorize physical release for this accepted and payment-confirmed sample offer?')) return;
    void run('Physical release authorization recorded. Collection is a separate confirmation.', () => authorizeInventoryRelease(idOf(o)) as any);
  };
  const collect = (o: AnyRecord) => {
    if (!window.confirm('Confirm that the sample inventory has physically been collected?')) return;
    void run('Collection recorded.', () => confirmCollection(idOf(o)) as any);
  };
  const activity = [...activities, ...audit].slice(-9).reverse();
  return <Workspace role="ops" title="Platform operations"><PageTitle kicker="Control room · demo workflows" title="Supervise the hand-offs." copy="Inspect what the shared workflow recorded, where a person needs to decide, and what evidence supports a recommendation." action={<ActionButton variant="secondary" onClick={reset}><RotateCcw size={14} /> Reset demo</ActionButton>} />
    {feedback}<div className="notice"><strong>Simulation boundary</strong>Workflows and agents shown here are product concepts demonstrated with seeded sample data. No production AI, payment, dispatch, GPS or backend action is running.</div>
    <div className="metric-row">{[['Harvest requests', requests.length], ['Confirmed bookings', requests.filter(r => /confirm|reserv/i.test(String(r.status))).length], ['Transport jobs', jobs.length], ['Stored batches', batches.length], ['Open offers', offers.filter(o => /pending|submitted/i.test(String(o.status))).length], ['Open exceptions', openExceptions.length], ['Workflow records', runs.length + tasks.length], ['Notifications', notifications.length]].map(([label, value]) => <div className="metric" key={String(label)}><div className="metric-label">{label}</div><div className="metric-value">{value}</div><div className="metric-note">Derived from shared sample state</div></div>)}</div>
    <div className="two-col"><Section title="Exceptions needing a person" description="Review decisions and record a deliberate outcome.">{openExceptions.length ? openExceptions.map(e => <div className="list-row" key={idOf(e)}><div className="row-main"><strong>{text(first(e.title, e.type, e.reason), 'Workflow exception')}</strong><small>{text(e.description, e.message)} · {when(e)}</small><small>Related record: {text(first(e.recordId, e.entityId, e.workflowRunId))}</small></div><div style={{ display: 'grid', gap: 7, justifyItems: 'end' }}><Status value={e.status} /><ActionButton variant="small" onClick={() => resolve(e)}>Resolve exception</ActionButton></div></div>) : <div className="empty"><strong>No open sample exceptions</strong>New exceptions are visible here when present in shared demo state.</div>}</Section>
      <Section title="Automation activity" description="Observable inputs, outputs and decisions—not private model reasoning.">{runs.length || tasks.length ? [...runs, ...tasks].slice(-7).reverse().map(w => <div className="list-row" key={idOf(w)}><div className="row-main"><strong>{text(first(w.name, w.workflowName, w.type, w.taskType), 'Workflow task')}</strong><small>{text(first(w.trigger, w.triggerEvent), 'Trigger: sample workflow')} · step: {text(first(w.currentStep, w.step), 'Recorded')}</small><small>{text(first(w.outputSummary, w.summary, w.explanation, w.decision), 'Evidence summary not provided')} </small><small>Records consulted: {text(first(w.recordsConsulted, w.inputsSummary), 'Sample workflow data')} · human approval: {text(first(w.humanApprovalRequired, w.requiresApproval), 'Not specified')}</small></div><div style={{ display: 'grid', gap: 7, justifyItems: 'end' }}><Status value={w.status} />{/fail|error/i.test(String(w.status)) && <ActionButton variant="small" onClick={() => retry(w)}>Retry</ActionButton>}</div></div>) : <div className="empty"><strong>No workflow runs recorded yet</strong>Submit a sample harvest from the farmer view to create traceable workflow evidence.</div>}</Section></div>
    <Section title="Transaction gates" description="Payment confirmation and physical release are deliberately separate. No payment is processed." >{offers.length ? offers.map(o => <div className="list-row" key={idOf(o)}><div className="row-main"><strong>{cropOf(o)} · {text(first(o.amount, o.totalPrice), 'Offer amount not listed')}</strong><small>Offer status: {titleCase(o.status)} · payment: {titleCase(first(o.paymentStatus, 'not confirmed'))}</small><small>Release: {titleCase(first(o.releaseStatus, 'not authorized'))} · collection: {titleCase(first(o.collectionStatus, 'not confirmed'))}</small></div><div className="button-row">{/accepted/i.test(String(o.status)) && !/confirmed|paid/i.test(String(o.paymentStatus)) && <ActionButton variant="small" onClick={() => confirmOfferPayment(o)}>Confirm sample payment</ActionButton>}{/confirmed|paid/i.test(String(o.paymentStatus)) && !/authoriz|released/i.test(String(o.releaseStatus)) && <ActionButton variant="small" onClick={() => release(o)}>Authorize release</ActionButton>}{/authoriz|released/i.test(String(o.releaseStatus)) && !/collected|complete/i.test(String(o.collectionStatus)) && <ActionButton variant="small secondary" onClick={() => collect(o)}>Confirm collection</ActionButton>}</div></div>) : <div className="empty"><strong>No offers to review</strong>Offers created in the buyer view will be tracked here when the seller responds.</div>}</Section>
    <div className="two-col" id="audit"><Section title="Audit history" description="Recent state changes recorded by this demo.">{audit.length ? audit.slice(-10).reverse().map((event: AnyRecord, i: number) => <div className="activity-line" key={idOf(event) + i}><strong>{text(first(event.action, event.eventType, event.type), 'State change')}</strong><small>{text(first(event.description, event.message, event.summary), `Record ${text(first(event.recordId, event.entityId))}`)}</small><small>{when(event)} · {text(first(event.actor, event.role), 'Demo role')}</small></div>) : <div className="empty"><strong>No audit entries yet</strong>Shared-state actions will appear here if the demo service records them.</div>}</Section>
      <Section title="Recent activity" description="Shared farmer, facility, transport and buyer work.">{activity.length ? activity.map((event: AnyRecord, i: number) => <div className="activity-line" key={idOf(event) + i}><strong>{text(first(event.title, event.action, event.type, event.eventType), 'Workflow update')}</strong><small>{text(first(event.description, event.message, event.summary), 'Sample record updated')}</small><small>{when(event)}</small></div>) : <div className="empty"><strong>Nothing recorded yet</strong>Activity from all demo roles is shown here as it becomes available.</div>}</Section></div>
    <Section title="Workflow records" description="All counts and statuses derive from shared demo state."><div className="table-wrap"><table className="data-table"><thead><tr><th>Workflow / task</th><th>Trigger</th><th>Current step</th><th>Status</th><th>Attempts</th></tr></thead><tbody>{[...runs, ...tasks].length ? [...runs, ...tasks].map(w => <tr key={idOf(w)}><td>{text(first(w.name, w.workflowName, w.type, w.taskType))} · {idOf(w)}</td><td>{text(first(w.trigger, w.triggerEvent))}</td><td>{text(first(w.currentStep, w.step))}</td><td><Status value={w.status} /></td><td>{text(w.attempts)}</td></tr>) : <tr><td colSpan={5}>Workflow records appear after a demo action.</td></tr>}</tbody></table></div></Section>
  </Workspace>;
}
function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}
function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><RoutedErrorBoundary><AppRouter /></RoutedErrorBoundary></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>;
}
export default App;
