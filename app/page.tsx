'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Sunrise,
  House,
  Clapperboard,
  Moon,
  Footprints,
  ShieldCheck,
  Play,
  Pause,
  RotateCcw,
  Lightbulb,
  Wind,
  SlidersHorizontal,
  Scan,
  Move,
  Plus,
  Minus,
  ChevronRight,
  DoorOpen,
  Droplets,
  Check,
  Layers,
  Camera,
  Box,
  Maximize,
  Info,
  X,
  PanelRightClose,
  PanelRightOpen,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  scenes,
  views,
  simulateEvent,
  type EventKind,
  type Values,
  type SceneId,
  type ViewId,
} from '@/lib/home';
import SpatialViewer, { type ViewerHandle } from './spatial-viewer';
const icons = {
  morning: Sunrise,
  home: House,
  cinema: Clapperboard,
  sleep: Moon,
  night: Footprints,
  away: ShieldCheck,
};
export default function Home() {
  const [values, setValues] = useState<Values>({ ...scenes[1].values });
  const [scene, setScene] = useState<SceneId>('home');
  const [view, setView] = useState<ViewId>('overview');
  const [mode, setMode] = useState('model');
  const [playing, setPlaying] = useState(false);
  const [step, setStep] = useState(1);
  const [loaded, setLoaded] = useState(false);
  const [progress, setProgress] = useState(0);
  const [loadError, setLoadError] = useState('');
  const [selected, setSelected] = useState('');
  const [drawer, setDrawer] = useState(true);
  const [info, setInfo] = useState(false);
  const [cutaway, setCutaway] = useState(true);
  const [walk, setWalk] = useState(false);
  const [event, setEvent] = useState('');
  const [manual, setManual] = useState(false);
  const viewer = useRef<ViewerHandle>(null);
  const time = useRef(0);
  const apply = useCallback((id: SceneId, auto = false) => {
    const next = scenes.find((s) => s.id === id)!;
    setMode('model');
    setScene(id);
    setValues({ ...next.values });
    setManual(false);
    setEvent('');
    if (!auto) setPlaying(false);
  }, []);
  useEffect(() => {
    if (!playing) return;
    let i = 0;
    apply(scenes[0].id, true);
    setStep(0);
    time.current = window.setInterval(() => {
      i++;
      if (i >= scenes.length) {
        setPlaying(false);
        apply('home', true);
        setStep(1);
        return;
      }
      apply(scenes[i].id, true);
      setStep(i);
    }, 5000);
    return () => clearInterval(time.current);
  }, [playing, apply]);
  const update = (key: keyof Values, n: number) => {
    setMode('model');
    setPlaying(false);
    setManual(true);
    setValues((v) => ({ ...v, [key]: n }));
  };
  const changeView = (id: ViewId) => {
    if (id === 'top' || id === 'entry') setMode('model');
    setView(id);
    setCutaway(id === 'overview' || id === 'top');
    setWalk(false);
    setSelected('');
  };
  const reset = () => {
    apply('home');
    changeView('overview');
    setMode('model');
    viewer.current?.reset();
  };
  const sensor = (kind: EventKind) => {
    setMode('model');
    setPlaying(false);
    const result = simulateEvent(kind, values);
    setValues(result.values);
    if (result.scene) setScene(result.scene);
    setManual(!result.scene);
    setEvent(result.message);
  };
  const active = scenes.find((s) => s.id === scene)!;
  const image =
    mode === 'render'
      ? scene === 'cinema' && view === 'living'
        ? 'cinema.png'
        : views.find((v) => v.id === view)!.file
      : 'overview.png';
  return (
    <main className="experience">
      <header className="topbar">
        <div className="identity">
          <span className="seal">清</span>
          <div>
            <h1>
              清语<span>空间体验</span>
            </h1>
            <p>QINGYU RESIDENCE</p>
          </div>
        </div>
        <div className="model-badge">
          <span className="status-dot" />
          原模型 · 原比例
          <span className="badge-divider" />
          Z-Link 4.0
        </div>
        <button
          className="icon-btn"
          aria-label="查看模型说明"
          onClick={() => setInfo(true)}
        >
          <Info size={19} />
        </button>
      </header>
      <div className={`workspace ${drawer ? '' : 'panel-closed'}`}>
        <section className="stage" aria-label="可交互三维住宅">
          <img
            className={`render-photo ${mode === 'render' || !loaded ? 'visible' : ''}`}
            src={'/assets/' + image}
            alt="清语住宅原模型鸟瞰渲染"
          />
          <div
            className={
              mode === 'render' ? 'canvas-wrap concealed' : 'canvas-wrap'
            }
          >
            <SpatialViewer
              ref={viewer}
              values={values}
              view={view}
              cutaway={cutaway}
              walk={walk}
              paused={mode === 'render'}
              onReady={() => {
                setLoaded(true);
                setLoadError('');
              }}
              onProgress={setProgress}
              onError={setLoadError}
              onSelect={setSelected}
            />
          </div>
          <div className="stage-top">
            <div className="stage-title">
              <span className="eyebrow">
                {mode === 'render' ? 'CYCLES RENDER' : 'LIVE SPATIAL VIEW'}
              </span>
              <h2>{views.find((v) => v.id === view)?.name}</h2>
              <p>
                {mode === 'render'
                  ? '原始渲染对照 · 此模式显示静态效果图'
                  : '拖动旋转 · 滚轮缩放 · 点击模型查看物件'}
              </p>
            </div>
            <div className="view-tools">
              <Tabs
                value={mode}
                onValueChange={(v) => {
                  setMode(String(v));
                  if (v === 'render') setPlaying(false);
                }}
              >
                <TabsList className="mode-switch">
                  <TabsTrigger value="model">
                    <Box size={16} />
                    实时 3D
                  </TabsTrigger>
                  <TabsTrigger
                    value="render"
                    disabled={view === 'top' || view === 'entry'}
                  >
                    <Camera size={16} />
                    渲染对照
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              <button
                className="icon-btn stage-btn"
                aria-label={drawer ? '收起控制面板' : '展开控制面板'}
                onClick={() => setDrawer(!drawer)}
              >
                {drawer ? (
                  <PanelRightClose size={19} />
                ) : (
                  <PanelRightOpen size={19} />
                )}
              </button>
            </div>
          </div>
          {!loaded && mode === 'model' && (
            <div className="loading-card" role="status">
              {loadError ? (
                <>
                  <b>三维视图暂未载入</b>
                  <p>{loadError}</p>
                  <button onClick={() => window.location.reload()}>
                    重新载入
                  </button>
                  <button onClick={() => setMode('render')}>
                    查看原始渲染
                  </button>
                </>
              ) : (
                <>
                  <span className="spinner" />
                  <div>
                    <b>正在载入原模型</b>
                    <p>几何、木纹与织物材质 · {progress}%</p>
                  </div>
                </>
              )}
            </div>
          )}
          {selected && mode === 'model' && (
            <div className="object-chip">
              <Box size={16} />
              <span>{selected}</span>
              <button
                aria-label="关闭物件信息"
                onClick={() => {
                  setSelected('');
                  viewer.current?.clearSelection();
                }}
              >
                <X size={15} />
              </button>
            </div>
          )}
          <div className="canvas-actions">
            <button
              aria-label="放大"
              title="放大"
              onClick={() => viewer.current?.zoom(0.82)}
              disabled={mode === 'render'}
            >
              <Plus size={18} />
            </button>
            <button
              aria-label="缩小"
              title="缩小"
              onClick={() => viewer.current?.zoom(1.22)}
              disabled={mode === 'render'}
            >
              <Minus size={18} />
            </button>
            <span />
            <button
              className={cutaway ? 'active' : ''}
              aria-label="切换天花剖切"
              title="切换天花剖切"
              disabled={mode === 'render'}
              onClick={() => setCutaway(!cutaway)}
            >
              <Layers size={18} />
            </button>
            <button
              className={walk ? 'active' : ''}
              title="漫游：WASD 移动，方向键转向"
              aria-label="切换空间漫游"
              disabled={mode === 'render'}
              onClick={() => {
                if (view === 'overview' || view === 'top') changeView('living');
                setWalk(!walk);
              }}
            >
              <Footprints size={18} />
            </button>
            <button
              aria-label="复位视角"
              title="复位视角"
              onClick={() => viewer.current?.reset()}
            >
              <Scan size={18} />
            </button>
          </div>
          {walk && (
            <div className="walk-tip">
              点击画面后，用 WASD 移动，方向键转向 · 再次点击脚印退出
            </div>
          )}
          <nav className="room-nav" aria-label="空间导航">
            {views.map((v, i) => (
              <button
                key={v.id}
                className={view === v.id ? 'active' : ''}
                onClick={() => changeView(v.id)}
              >
                <span>{String(i + 1).padStart(2, '0')}</span>
                {v.name}
              </button>
            ))}
          </nav>
          <div className="stage-footer">
            <span>
              <span className="live-dot" />
              {mode === 'model' ? '实时场景' : '静态渲染'} / {active.name}
              {manual ? ' · 自定义' : ''}
            </span>
            <span>以已交付 Blender 模型为尺寸基准</span>
          </div>
        </section>
        {drawer && (
          <aside className="control-panel" aria-label="智能场景控制">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">Z-LINK EXPERIENCE</span>
                <h2>让空间回应生活</h2>
              </div>
              <span className="simulation-badge">模拟体验</span>
            </div>
            <Tabs defaultValue="scene" className="control-tabs">
              <TabsList className="panel-tabs">
                <TabsTrigger value="scene">场景</TabsTrigger>
                <TabsTrigger value="devices">设备</TabsTrigger>
                <TabsTrigger value="events">感知</TabsTrigger>
              </TabsList>
              <TabsContent value="scene">
                <div className="scene-grid">
                  {scenes.map((s) => {
                    const Icon = icons[s.id];
                    return (
                      <button
                        key={s.id}
                        className={`scene-button ${scene === s.id && !manual ? 'active' : ''}`}
                        onClick={() => {
                          apply(s.id);
                          setMode('model');
                        }}
                        aria-pressed={scene === s.id && !manual}
                      >
                        <Icon size={22} strokeWidth={1.6} />
                        <span>{s.name}</span>
                        <small>{s.time}</small>
                      </button>
                    );
                  })}
                </div>
                <div className="scene-description">
                  <span className="fine-label">
                    {manual ? '自定义状态' : active.name + '场景'}
                  </span>
                  <p>
                    {manual
                      ? '当前参数已手动调整。选择场景可恢复预设。'
                      : active.description}
                  </p>
                </div>
                <div className="tour-card">
                  <div>
                    <b>体验家的一天</b>
                    <span>六种场景 · 30 秒自动演示</span>
                  </div>
                  <button
                    aria-label={playing ? '暂停默认体验' : '播放默认体验'}
                    disabled={!loaded}
                    onClick={() => {
                      setMode('model');
                      setPlaying(!playing);
                    }}
                  >
                    {playing ? <Pause size={20} /> : <Play size={20} />}
                  </button>
                  <div className="tour-progress">
                    {scenes.map((s, i) => (
                      <i
                        key={s.id}
                        className={playing && i <= step ? 'active' : ''}
                      />
                    ))}
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="devices">
                <div className="device-section">
                  <h3>
                    <Lightbulb size={17} />
                    分区照明
                  </h3>
                  {(
                    [
                      ['living', '客厅'],
                      ['dining', '餐厅'],
                      ['bedroom', '卧室'],
                      ['path', '低位引导'],
                    ] as const
                  ).map(([key, label]) => (
                    <Range
                      key={key}
                      label={label}
                      value={values[key]}
                      onChange={(v) => update(key, v)}
                    />
                  ))}
                </div>
                <div className="device-section">
                  <h3>
                    <SlidersHorizontal size={17} />
                    光影与遮蔽
                  </h3>
                  {(
                    [
                      ['curtain', '客厅窗帘开度'],
                      ['bedCurtain', '主卧窗帘开度'],
                      ['daylight', '日光强度'],
                      ['screen', '投影幕展开'],
                    ] as const
                  ).map(([key, label]) => (
                    <Range
                      key={key}
                      label={label}
                      value={values[key]}
                      onChange={(v) => update(key, v)}
                    />
                  ))}
                </div>
              </TabsContent>
              <TabsContent value="events">
                <div className="sensor-note">
                  点击触发家庭事件，查看灯光与设备状态如何响应。
                </div>
                <div className="sensor-buttons">
                  {[
                    {
                      id: 'entry',
                      label: '模拟入户',
                      description: '回家灯光与窗帘联动',
                      icon: DoorOpen,
                    },
                    {
                      id: 'presence',
                      label: '模拟起夜有人',
                      description: '低位动线点亮，主灯保持关闭',
                      icon: Footprints,
                    },
                    {
                      id: 'air',
                      label: '模拟 CO₂ 升高',
                      description: '空气感知触发新风强档',
                      icon: Wind,
                    },
                    {
                      id: 'leak',
                      label: '模拟漏水',
                      description: '告警、提示照明及关闭水阀',
                      icon: Droplets,
                    },
                  ].map((e) => (
                    <button
                      key={e.id}
                      onClick={() => {
                        setMode('model');
                        sensor(e.id as EventKind);
                      }}
                    >
                      <e.icon size={21} />
                      <span>
                        <b>{e.label}</b>
                        <small>{e.description}</small>
                      </span>
                      <ChevronRight size={15} />
                    </button>
                  ))}
                </div>
                {event && (
                  <div
                    className={
                      values.alarm ? 'event-message alarm' : 'event-message'
                    }
                    role="status"
                  >
                    {event}
                  </div>
                )}
                <button className="clear-event" onClick={() => sensor('clear')}>
                  <Check size={16} />
                  清除模拟告警
                </button>
                <p className="footnote">
                  水阀联动为扩展示例；真实设备接入需另行配置。
                </p>
              </TabsContent>
            </Tabs>
            <div className="environment-card">
              <div className="environment-title">
                <span>全屋环境</span>
                <span
                  className={values.alarm ? 'alert-status' : 'normal-status'}
                >
                  {values.alarm
                    ? '模拟告警'
                    : values.armed
                      ? '已布防'
                      : '舒适 · 居家'}
                </span>
              </div>
              <div className="metrics">
                <div>
                  <strong>
                    {values.temperature}
                    <em>°C</em>
                  </strong>
                  <span>目标温度</span>
                </div>
                <div>
                  <strong>
                    {values.co2}
                    <em>ppm</em>
                  </strong>
                  <span>CO₂ 模拟值</span>
                </div>
              </div>
              <div className="environment-line">
                <Wind size={16} />
                <span>
                  新风
                  {values.vent >= 80
                    ? '强档'
                    : values.vent < 20
                      ? '静音'
                      : '常规档'}
                </span>
                <i style={{ width: Math.max(10, values.vent) + '%' }} />
              </div>
              <p>
                水阀{values.valve ? '开启' : '关闭'}
                <span>·</span>
                {values.armed ? '安防已布防' : '安防居家模式'}
              </p>
            </div>
            <div className="panel-bottom">
              <button className="reset-button" onClick={reset}>
                <RotateCcw size={16} />
                恢复默认体验
              </button>
              <p>本地场景模拟，未连接真实设备</p>
            </div>
          </aside>
        )}
      </div>
      <Dialog open={info} onOpenChange={setInfo}>
        <DialogContent className="info-card">
          <span className="eyebrow">ABOUT THIS SPACE</span>
          <DialogTitle>同一模型，两种观看方式</DialogTitle>
          <DialogDescription>
            实时 3D 直接读取已交付 Blender
            模型的几何、相机与尺寸，保留家具、木地板、帘体、设备和植物细节。程序材质转换为网页
            PBR 贴图。
          </DialogDescription>
          <p>
            “渲染对照”显示同一模型的 Cycles
            原始效果图。网页实时照明与离线渲染使用不同引擎，像素级光影会有差异。
          </p>
          <p>
            这里的 1:1 指相对于 Blender 模型的尺寸一致；原模型依据 PDF
            重建，不能作为现场测量或施工图。所有智能事件均为本地模拟。
          </p>
          <button className="reset-button" onClick={() => setInfo(false)}>
            继续体验
          </button>
        </DialogContent>
      </Dialog>
    </main>
  );
}
function Range({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="range">
      <div>
        <label>{label}</label>
        <span>
          {Math.round(value)}
          <small>%</small>
        </span>
      </div>
      <Slider
        aria-label={label}
        value={[value]}
        min={0}
        max={100}
        step={1}
        onValueChange={(v) => onChange(Array.isArray(v) ? v[0] : v)}
      />
    </div>
  );
}
