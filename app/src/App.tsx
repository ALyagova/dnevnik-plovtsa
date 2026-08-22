import { useEffect, useMemo, useRef, useState } from 'react'
import { Camera, ChevronLeft, Cloud, CloudCheck, Home, Pencil, Trash2, UserRound, BarChart3, Check, ArrowUp, ArrowDown, Equal } from 'lucide-react'
import db from './db'
import { getFamilyCode, saveFamilyCode, synchronizeFamily } from './familySync'
import { displayDate, formatDuration, newId, parseDuration, progressFor } from './logic'
import { distancesFor, styleLabels, styles, type Athlete, type EventType, type PoolLength, type ProgressStatus, type SwimResult, type SwimStyle } from './types'

type Screen = 'onboarding' | 'home' | 'form' | 'history' | 'detail' | 'profile'
type SyncStatus = 'not-connected' | 'synced' | 'syncing' | 'offline' | 'error'
const now = () => new Date().toISOString()
const today = () => new Date().toISOString().slice(0, 10)
const normalizeName = (value: string) => {
  const name = value.trim()
  return name ? `${name[0].toLocaleUpperCase('ru-RU')}${name.slice(1)}` : ''
}

const initialResults = (athleteId: string): SwimResult[] => [
  ['2026-03-01', 8000, 'course', 25], ['2026-03-10', 7850, 'competition', 25], ['2026-03-15', 7910, 'competition', 50], ['2026-03-20', 7910, 'course', 25],
].map(([swimDate, durationCentiseconds, eventType, poolLengthMeters], index) => ({ id: `sample-${index}`, athleteId, style: 'freestyle' as SwimStyle, distanceMeters: 100, swimDate: swimDate as string, durationCentiseconds: durationCentiseconds as number, eventType: eventType as EventType, poolLengthMeters: poolLengthMeters as PoolLength, createdAt: `${swimDate}T10:0${index}:00.000Z`, updatedAt: `${swimDate}T10:0${index}:00.000Z` }))

export default function App() {
  const [athlete, setAthlete] = useState<Athlete | null>(null)
  const [results, setResults] = useState<SwimResult[]>([])
  const [screen, setScreen] = useState<Screen>('onboarding')
  const [style, setStyle] = useState<SwimStyle>('freestyle')
  const [distance, setDistance] = useState(100)
  const [selected, setSelected] = useState<SwimResult | null>(null)
  const [offline, setOffline] = useState(!navigator.onLine)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(getFamilyCode() ? 'syncing' : 'not-connected')
  const [syncError, setSyncError] = useState('')
  const syncInProgress = useRef(false)

  const refresh = async () => {
    const savedAthlete = await db.athletes.toCollection().first()
    setAthlete(savedAthlete ?? null)
    setResults(await db.results.filter((result) => !result.deletedAt).toArray())
    setScreen(savedAthlete ? 'home' : 'onboarding')
  }
  useEffect(() => { refresh(); const on = () => setOffline(!navigator.onLine); addEventListener('online', on); addEventListener('offline', on); return () => { removeEventListener('online', on); removeEventListener('offline', on) } }, [])
  const sync = async (code = getFamilyCode()) => {
    if (!code) return
    if (!navigator.onLine) { setSyncStatus('offline'); return }
    setSyncStatus('syncing'); setSyncError('')
    try { await synchronizeFamily(code); setSyncStatus('synced'); await refresh() }
    catch (error) { setSyncStatus('error'); setSyncError(error instanceof Error ? error.message : 'Не удалось синхронизировать данные') }
  }
  useEffect(() => {
    const runSync = () => {
      if (syncInProgress.current) return
      syncInProgress.current = true
      void sync().finally(() => { syncInProgress.current = false })
    }
    const onVisible = () => { if (document.visibilityState === 'visible') runSync() }
    runSync()
    addEventListener('online', runSync)
    addEventListener('visibilitychange', onVisible)
    const interval = window.setInterval(onVisible, 30_000)
    return () => {
      removeEventListener('online', runSync)
      removeEventListener('visibilitychange', onVisible)
      window.clearInterval(interval)
    }
  }, [])
  const saveAthlete = async (name: string, birthDate: string, photoUrl?: string) => {
    const normalizedName = normalizeName(name)
    const time = now(); const item: Athlete = athlete ?? { id: newId(), name: normalizedName, birthDate, createdAt: time, updatedAt: time }
    await db.athletes.put({ ...item, name: normalizedName, birthDate, photoUrl, updatedAt: time }); await db.outbox.put({ id: newId(), type: 'upsert-athlete', entityId: item.id, createdAt: time }); await refresh(); void sync()
  }
  const saveResult = async (input: Omit<SwimResult, 'id' | 'athleteId' | 'createdAt' | 'updatedAt'>, existing?: SwimResult) => {
    if (!athlete) return; const time = now(); const item: SwimResult = existing ? { ...existing, ...input, updatedAt: time } : { ...input, id: newId(), athleteId: athlete.id, createdAt: time, updatedAt: time }
    await db.results.put(item); await db.outbox.put({ id: newId(), type: 'upsert-result', entityId: item.id, createdAt: time }); setResults(await db.results.filter((r) => !r.deletedAt).toArray()); setSelected(item); setStyle(item.style); setDistance(item.distanceMeters); setScreen('history'); void sync()
  }
  const removeResult = async (item: SwimResult) => { const time = now(); await db.results.update(item.id, { deletedAt: time, updatedAt: time }); await db.outbox.put({ id: newId(), type: 'delete-result', entityId: item.id, createdAt: time }); setResults(await db.results.filter((r) => !r.deletedAt).toArray()); setScreen('history'); void sync() }
  const connectFamily = async (code: string): Promise<string | null> => {
    const normalizedCode = code.trim()
    if (!normalizedCode) return 'Введите семейный код'
    if (!navigator.onLine) { setSyncStatus('offline'); return 'Подключитесь к интернету и попробуйте ещё раз' }
    setSyncStatus('syncing'); setSyncError('')
    try {
      const sharedState = await synchronizeFamily(normalizedCode)
      if (!sharedState.athlete) {
        setSyncStatus('not-connected')
        return 'В семье пока нет профиля спортсмена'
      }
      saveFamilyCode(normalizedCode)
      setSyncStatus('synced')
      await refresh()
      return null
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не удалось синхронизировать данные'
      setSyncStatus('error'); setSyncError(message)
      return message
    }
  }
  const openForm = (nextStyle = style, nextDistance = distance) => { setSelected(null); setStyle(nextStyle); setDistance(nextDistance); setScreen('form') }
  const nav = (next: Screen) => setScreen(next)
  const current = results.filter((item) => item.style === style && item.distanceMeters === distance)
  return <main className="app-shell">
    {offline && <div className="banner"><Cloud /> Нет интернета. Изменения сохранятся на телефоне</div>}
    {screen === 'onboarding' && <Onboarding athlete={athlete} onSave={saveAthlete} onConnect={connectFamily} />}
    {screen === 'home' && athlete && <HomeScreen athlete={athlete} onOpenForm={openForm} onNav={nav} />}
    {screen === 'form' && <ResultForm style={style} distance={distance} value={selected?.style === style && selected.distanceMeters === distance ? selected : undefined} onBack={() => nav(selected ? 'detail' : 'home')} onSave={saveResult} />}
    {screen === 'history' && <History results={results} syncStatus={syncStatus} onBack={() => nav('home')} onAdd={() => nav('home')} onSelect={(item) => { setSelected(item); setStyle(item.style); setDistance(item.distanceMeters); nav('detail') }} onNav={nav} />}
    {screen === 'detail' && selected && <Detail result={selected} status={progressFor(current).get(selected.id) ?? 'baseline'} onBack={() => nav('history')} onEdit={() => nav('form')} onDelete={removeResult} />}
    {screen === 'profile' && athlete && <Profile athlete={athlete} syncStatus={syncStatus} syncError={syncError} onEdit={() => nav('onboarding')} onSync={connectFamily} onNav={nav} />}
  </main>
}

function Header({ title, onBack, action }: { title: string; onBack?: () => void; action?: React.ReactNode }) { return <header className="page-header">{onBack ? <button className="back" onClick={onBack}><ChevronLeft />Назад</button> : <span /> }<h1>{title}</h1>{action ?? <span />}</header> }
function BottomNav({ active, onNav }: { active: 'home' | 'history' | 'profile'; onNav: (screen: Screen) => void }) { const items = [[Home, 'Главная', 'home'], [BarChart3, 'Результаты', 'history'], [UserRound, 'Профиль', 'profile']] as const; return <nav className="bottom-nav">{items.map(([Icon, label, screen]) => <button key={screen} className={active === screen ? 'active' : ''} onClick={() => onNav(screen)} aria-current={active === screen ? 'page' : undefined}><Icon /><span>{label}</span></button>)}</nav> }
function Onboarding({ athlete, onSave, onConnect }: { athlete: Athlete | null; onSave: (name: string, birthDate: string, photoUrl?: string) => void; onConnect: (code: string) => Promise<string | null> }) {
  const [name, setName] = useState(athlete?.name ?? '')
  const [birthDate, setBirthDate] = useState(athlete?.birthDate ?? '')
  const [photoUrl, setPhotoUrl] = useState(athlete?.photoUrl)
  const [error, setError] = useState('')
  const [isConnecting, setIsConnecting] = useState(false)
  const [familyCode, setFamilyCode] = useState('')
  const [connectError, setConnectError] = useState('')
  const [isSubmittingCode, setIsSubmittingCode] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const selectPhoto = (file?: File) => { if (!file) return; const reader = new FileReader(); reader.onload = () => setPhotoUrl(String(reader.result)); reader.readAsDataURL(file) }
  const submit = () => { if (!name.trim() || !birthDate) return setError('Введите имя и дату рождения'); setError(''); onSave(name, birthDate, photoUrl) }
  const connect = async () => {
    setConnectError(''); setIsSubmittingCode(true)
    const message = await onConnect(familyCode)
    setIsSubmittingCode(false)
    if (message) setConnectError(message)
    else setIsConnecting(false)
  }
  const openConnect = () => { setConnectError(''); setFamilyCode(''); setIsConnecting(true) }
  return <section className="page onboarding"><h1 className="brand"><img src={`${import.meta.env.BASE_URL}swimmer-logo.svg`} alt="" />Дневник пловца</h1><h2 className="onboarding-title">Создадим профиль</h2><p>Здесь будут храниться результаты пловца</p><button type="button" className="photo-add" onClick={() => inputRef.current?.click()} aria-label={photoUrl ? 'Изменить фото' : 'Добавить фото'}>{photoUrl ? <img src={photoUrl} alt="Фото ребёнка" /> : <Camera />}<b>{photoUrl ? 'Изменить фото' : 'Добавить фото'}</b><small>Необязательно</small></button><input ref={inputRef} className="photo-input" type="file" accept="image/*" onChange={(event) => selectPhoto(event.target.files?.[0])} /><label>Имя ребёнка<input value={name} onChange={(e) => setName(e.target.value)} /></label><label>Дата рождения<input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} /></label>{error && <p className="error">{error}</p>}<div className="push" /><button className="primary" onClick={submit}>Создать профиль</button>{!athlete && <button type="button" className="onboarding-family-link" onClick={openConnect}>Уже есть профиль в семье? <span>Ввести код</span></button>}<p className="quiet">Регистрация и пароль не нужны</p>{isConnecting && <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="family-connect-title"><div className="dialog family-dialog"><h2 id="family-connect-title">Подключиться к семье</h2><p>Введите общий семейный код, чтобы открыть профиль спортсмена.</p><label>Семейный код<input autoFocus value={familyCode} onChange={(event) => setFamilyCode(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void connect() }} autoCapitalize="off" autoCorrect="off" aria-describedby={connectError ? 'family-code-error' : undefined} /></label>{connectError && <p id="family-code-error" className="error">{connectError}</p>}<div><button className="secondary" onClick={() => setIsConnecting(false)}>Отмена</button><button className="primary" disabled={!familyCode.trim() || isSubmittingCode} onClick={() => void connect()}>{isSubmittingCode ? 'Проверяем…' : 'Подключиться'}</button></div></div></div>}</section>
}
function HomeScreen({ athlete, onOpenForm, onNav }: { athlete: Athlete; onOpenForm: (style: SwimStyle, distance: number) => void; onNav: (screen: Screen) => void }) { const [selectedStyle, setSelectedStyle] = useState<SwimStyle>('freestyle'); const [selectedDistance, setSelectedDistance] = useState(100); const chooseStyle = (style: SwimStyle) => { setSelectedStyle(style); if (!distancesFor(style).includes(selectedDistance)) setSelectedDistance(distancesFor(style)[0]) }; return <section className="page home-page"><div className="hello"><div className="avatar">{athlete.photoUrl ? <img src={athlete.photoUrl} alt="Фото ребёнка" /> : athlete.name[0]}</div><div><b>Привет, {athlete.name}!</b></div></div><h2>Стиль</h2><div className="style-list">{styles.map((item) => <button className={`style-card ${item} ${selectedStyle === item ? 'selected' : ''}`} onClick={() => chooseStyle(item)} key={item}><span>{styleLabels[item]}</span>{selectedStyle === item && <em><Check />Выбрано</em>}</button>)}</div><section className="distance-section"><h2>Дистанция</h2><div className="distance-grid">{distancesFor(selectedStyle).map((item) => <button className={selectedDistance === item ? 'selected' : ''} onClick={() => { setSelectedDistance(item); onOpenForm(selectedStyle, item) }} key={item}>{selectedDistance === item && <Check />}{item} м</button>)}</div></section><BottomNav active="home" onNav={onNav} /></section> }
function ResultForm({ style, distance, value, onBack, onSave }: { style: SwimStyle; distance: number; value?: SwimResult; onBack: () => void; onSave: (item: Omit<SwimResult, 'id' | 'athleteId' | 'createdAt' | 'updatedAt'>, existing?: SwimResult) => void }) { const resultStyle = value?.style ?? style; const resultDistance = value?.distanceMeters ?? distance; const parts = formatDuration(value?.durationCentiseconds ?? 7850).match(/(\d+):(\d+)\.(\d+)/)!; const [min, setMin] = useState(parts[1]); const [sec, setSec] = useState(parts[2]); const [cs, setCs] = useState(parts[3]); const [date, setDate] = useState(value?.swimDate ?? today()); const [type, setType] = useState<EventType>(value?.eventType ?? 'competition'); const [pool, setPool] = useState<PoolLength>(value?.poolLengthMeters ?? 25); const [error, setError] = useState(''); const submit = () => { const duration = parseDuration(min, sec, cs); if (!duration) return setError('Введите время: секунды от 00 до 59, сотые от 00 до 99'); if (date > today()) return setError('Дата не может быть в будущем'); onSave({ style: resultStyle, distanceMeters: resultDistance, durationCentiseconds: duration, swimDate: date, eventType: type, poolLengthMeters: pool }, value) }; return <section className="page form"><Header title={value ? 'Изменить результат' : `${styleLabels[resultStyle]} · ${resultDistance} м`} onBack={onBack} /><p className="sync-line"><Cloud />Сохраним даже без интернета</p><fieldset><legend>Время</legend><div className="time-inputs"><input aria-label="Минуты" value={min} inputMode="numeric" onChange={(e) => setMin(e.target.value)} /><b>:</b><input aria-label="Секунды" value={sec} inputMode="numeric" onChange={(e) => setSec(e.target.value)} /><b>.</b><input aria-label="Сотые" value={cs} inputMode="numeric" onChange={(e) => setCs(e.target.value)} /></div><div className="time-labels"><span>мин</span><span>сек</span><span>сотые</span></div></fieldset><label>Дата заплыва<input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label><fieldset><legend>Тип заплыва</legend><div className="segmented">{(['course', 'competition'] as EventType[]).map((item) => <button className={`${type === item ? 'selected' : ''} ${item}`} onClick={() => setType(item)} key={item}>{type === item && <Check />}{item === 'course' ? 'Курсовка' : 'Соревнование'}</button>)}</div></fieldset><fieldset><legend>Бассейн</legend><div className="segmented">{([25, 50] as PoolLength[]).map((item) => <button className={pool === item ? 'selected' : ''} onClick={() => setPool(item)} key={item}>{pool === item && <Check />}{item} м</button>)}</div></fieldset>{error && <p className="error">{error}</p>}<button className="primary" onClick={submit}>Сохранить результат</button></section> }
function History({ results, syncStatus, onBack, onAdd, onSelect, onNav }: { results: SwimResult[]; syncStatus: SyncStatus; onBack: () => void; onAdd: () => void; onSelect: (result: SwimResult) => void; onNav: (screen: Screen) => void }) { const [filterStyle, setFilterStyle] = useState<SwimStyle | 'all'>('all'); const [filterDistance, setFilterDistance] = useState<number | 'all'>('all'); const filtered = results.filter((item) => (filterStyle === 'all' || item.style === filterStyle) && (filterDistance === 'all' || item.distanceMeters === filterDistance)); const statuses = useMemo(() => progressFor(filtered), [filtered]); const visible = filtered.slice().sort((a, b) => b.swimDate.localeCompare(a.swimDate) || b.createdAt.localeCompare(a.createdAt)); const updateStyle = (next: SwimStyle | 'all') => { setFilterStyle(next); setFilterDistance('all') }; return <section className="page history"><Header title="Результаты" onBack={onBack} /><div className="result-filters"><label>Стиль<select value={filterStyle} onChange={(event) => updateStyle(event.target.value as SwimStyle | 'all')}><option value="all">Все стили</option>{styles.map((item) => <option value={item} key={item}>{styleLabels[item]}</option>)}</select></label>{filterStyle !== 'all' && <label>Дистанция<select value={filterDistance} onChange={(event) => setFilterDistance(event.target.value === 'all' ? 'all' : Number(event.target.value))}><option value="all">Все дистанции</option>{distancesFor(filterStyle).map((item) => <option value={item} key={item}>{item} м</option>)}</select></label>}</div><p>{visible.length} {visible.length === 1 ? 'результат' : 'результатов'}</p><button className="primary" onClick={onAdd}>Выбрать стиль</button>{syncStatus === 'synced' && <p className="sync-line"><CloudCheck />Все результаты синхронизированы</p>}{syncStatus === 'offline' && <p className="sync-line">Нет интернета: изменения останутся на телефоне</p>}{visible.length ? <div className="result-list">{visible.map((item) => <ResultRow key={item.id} result={item} status={statuses.get(item.id) ?? 'baseline'} onClick={() => onSelect(item)} />)}</div> : <div className="empty"><p>Пока нет результатов.</p><button className="primary" onClick={onAdd}>Выбрать стиль</button></div>}<BottomNav active="history" onNav={onNav} /></section> }
function ResultRow({ result, status, onClick }: { result: SwimResult; status: ProgressStatus; onClick: () => void }) { const progress = { improved: [ArrowUp, 'Время улучшилось'], worsened: [ArrowDown, 'Время стало хуже'], equal: [Equal, 'Без изменений'] } as const; const item = status === 'baseline' ? null : progress[status]; const Icon = item?.[0]; const hasLongStyle = result.style === 'butterfly' || result.style === 'medley'; return <button className={`result-row style-${result.style} ${hasLongStyle ? 'long-discipline' : ''}`} onClick={onClick}><span className="date">{displayDate(result.swimDate)}</span><span className="result-time"><strong>{formatDuration(result.durationCentiseconds)}</strong>{Icon && <span className={`progress-arrow ${status}`} aria-label={item?.[1]}><Icon aria-hidden="true" /><span className="sr-only">{item?.[1]}</span></span>}</span><span className="discipline"><b>{styleLabels[result.style]}</b><span>{result.distanceMeters} м</span></span><span className={`result-meta ${result.eventType === 'competition' ? 'competition' : ''}`}>{result.eventType === 'competition' ? 'Соревнование' : 'Курсовка'} · бассейн {result.poolLengthMeters} м</span></button> }
function Detail({ result, status, onBack, onEdit, onDelete }: { result: SwimResult; status: ProgressStatus; onBack: () => void; onEdit: () => void; onDelete: (result: SwimResult) => void }) { const [confirm, setConfirm] = useState(false); return <section className="page detail"><Header title="Результат" onBack={onBack} /><article className="hero-result"><h2>{styleLabels[result.style]} · {result.distanceMeters} м</h2><strong>{formatDuration(result.durationCentiseconds)}</strong><p className={`progress ${status}`}>{status === 'improved' && <ArrowUp />}{status === 'improved' ? 'Время улучшилось' : status === 'worsened' ? 'Время стало хуже' : 'Без изменений'}</p><p>{displayDate(result.swimDate)}</p><span className="badge">{result.eventType === 'competition' ? 'Соревнование' : 'Курсовка'}</span> · бассейн {result.poolLengthMeters} м</article><button className="primary" onClick={onEdit}>Изменить результат</button><button className="danger-light" onClick={() => setConfirm(true)}><Trash2 />Удалить результат</button><p className="sync-line"><CloudCheck />Результат синхронизирован</p>{confirm && <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="delete-title"><div className="dialog"><h2 id="delete-title">Удалить результат?</h2><p>Восстановить его не получится</p><div><button autoFocus className="secondary" onClick={() => setConfirm(false)}>Отмена</button><button className="danger" onClick={() => onDelete(result)}>Удалить</button></div></div></div>}</section> }
function Profile({ athlete, syncStatus, syncError, onEdit, onSync, onNav }: { athlete: Athlete; syncStatus: SyncStatus; syncError: string; onEdit: () => void; onSync: (code: string) => Promise<string | null>; onNav: (screen: Screen) => void }) { const age = Math.floor((Date.now() - new Date(`${athlete.birthDate}T12:00:00`).getTime()) / 31557600000); const [code, setCode] = useState(getFamilyCode()); const connected = Boolean(getFamilyCode()); const statusText: Record<SyncStatus, string> = { 'not-connected': 'Не подключена', syncing: 'Синхронизация…', synced: 'Все данные сохранены', offline: 'Нет интернета', error: 'Не удалось синхронизировать' }; return <section className="page profile"><Header title="Профиль" action={<button className="text-btn" onClick={onEdit}><Pencil />Изменить</button>} /><article className="profile-card"><div className="avatar big">{athlete.photoUrl ? <img src={athlete.photoUrl} alt="Фото ребёнка" /> : athlete.name[0]}</div><div><h2>{athlete.name}</h2><p>Дата рождения: {displayDate(athlete.birthDate)}</p><p>{age} лет</p></div></article><h2>Приложение</h2><div className="info-card"><p><span>Синхронизация</span><b>{statusText[syncStatus]}</b></p><p><span>Работа без интернета</span><b>Доступна</b></p><small>Результаты сначала сохраняются на этом устройстве.</small></div><section className="family-connect"><h2>{connected ? 'Семья подключена' : 'Подключить семью'}</h2><p>Введите общий семейный код — одинаковый на каждом телефоне.</p><label>Семейный код<input value={code} onChange={(event) => setCode(event.target.value)} autoCapitalize="off" autoCorrect="off" /></label>{syncError && <p className="error">{syncError}</p>}<button className="primary" disabled={!code.trim() || syncStatus === 'syncing'} onClick={() => void onSync(code)}>{connected ? 'Синхронизировать сейчас' : 'Подключить и синхронизировать'}</button></section><BottomNav active="profile" onNav={onNav} /></section> }
