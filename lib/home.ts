export type Values = {
  living: number;
  dining: number;
  bedroom: number;
  path: number;
  curtain: number;
  bedCurtain: number;
  daylight: number;
  screen: number;
  temperature: number;
  co2: number;
  vent: number;
  armed: boolean;
  alarm: boolean;
  valve: boolean;
};
export type SceneId =
  | 'morning'
  | 'home'
  | 'cinema'
  | 'sleep'
  | 'night'
  | 'away';
export type ViewId =
  | 'overview'
  | 'living'
  | 'detail'
  | 'bedroom'
  | 'entry'
  | 'top';
export const scenes: {
  id: SceneId;
  name: string;
  time: string;
  description: string;
  values: Values;
}[] = [
  {
    id: 'morning',
    name: '晨起',
    time: '07:00',
    description: '窗帘轻启，让自然光唤醒家。',
    values: {
      living: 25,
      dining: 25,
      bedroom: 20,
      path: 0,
      curtain: 100,
      bedCurtain: 100,
      daylight: 90,
      screen: 0,
      temperature: 24,
      co2: 650,
      vent: 25,
      armed: false,
      alarm: false,
      valve: true,
    },
  },
  {
    id: 'home',
    name: '回家',
    time: '18:30',
    description: '暖光迎接归来，家已准备好。',
    values: {
      living: 56,
      dining: 48,
      bedroom: 25,
      path: 0,
      curtain: 72,
      bedCurtain: 65,
      daylight: 45,
      screen: 0,
      temperature: 24,
      co2: 650,
      vent: 25,
      armed: false,
      alarm: false,
      valve: true,
    },
  },
  {
    id: 'cinema',
    name: '观影',
    time: '20:00',
    description: '闭帘、落幕，留一盏恰好的微光。',
    values: {
      living: 6,
      dining: 0,
      bedroom: 0,
      path: 5,
      curtain: 0,
      bedCurtain: 0,
      daylight: 0,
      screen: 100,
      temperature: 24,
      co2: 700,
      vent: 30,
      armed: false,
      alarm: false,
      valve: true,
    },
  },
  {
    id: 'sleep',
    name: '睡眠',
    time: '22:30',
    description: '灯光渐隐，空间回归安静。',
    values: {
      living: 0,
      dining: 0,
      bedroom: 0,
      path: 0,
      curtain: 0,
      bedCurtain: 0,
      daylight: 0,
      screen: 0,
      temperature: 25,
      co2: 600,
      vent: 15,
      armed: false,
      alarm: false,
      valve: true,
    },
  },
  {
    id: 'night',
    name: '起夜',
    time: '02:00',
    description: '只点亮低位动线，不打扰熟睡的人。',
    values: {
      living: 0,
      dining: 0,
      bedroom: 0,
      path: 65,
      curtain: 0,
      bedCurtain: 0,
      daylight: 0,
      screen: 0,
      temperature: 25,
      co2: 600,
      vent: 15,
      armed: false,
      alarm: false,
      valve: true,
    },
  },
  {
    id: 'away',
    name: '离家',
    time: '08:30',
    description: '关闭灯光，切换节能与守护状态。',
    values: {
      living: 0,
      dining: 0,
      bedroom: 0,
      path: 0,
      curtain: 30,
      bedCurtain: 30,
      daylight: 55,
      screen: 0,
      temperature: 27,
      co2: 550,
      vent: 12,
      armed: true,
      alarm: false,
      valve: true,
    },
  },
];
export const views: {
  id: ViewId;
  name: string;
  file: string;
  camera?: string;
}[] = [
  {
    id: 'overview',
    name: '全屋鸟瞰',
    file: 'overview.png',
    camera: '02 | Floorplan overview',
  },
  {
    id: 'living',
    name: '客餐厅',
    file: 'living.png',
    camera: '01 | Qingyu living room',
  },
  {
    id: 'bedroom',
    name: '主卧',
    file: 'bedroom.png',
    camera: '04 | Master bedroom',
  },
  {
    id: 'detail',
    name: '织物与器物',
    file: 'detail.png',
    camera: '03 | Reference sofa detail',
  },
  {
    id: 'entry',
    name: '入户',
    file: 'living.png',
    camera: '05 | Entry and smart panel',
  },
  { id: 'top', name: '平面俯视', file: 'overview.png' },
];
export const cameraFallback = { position: [11, 22, 15], target: [0, 0.5, 0.1] };
export type EventKind = 'entry' | 'presence' | 'air' | 'leak' | 'clear';
export function simulateEvent(
  kind: EventKind,
  current: Values,
): { values: Values; scene?: SceneId; message: string } {
  if (kind === 'entry')
    return {
      values: { ...scenes.find((s) => s.id === 'home')!.values },
      scene: 'home',
      message: '入户触发 · 已开启回家灯光与窗帘联动',
    };
  if (kind === 'presence')
    return {
      values: { ...scenes.find((s) => s.id === 'night')!.values },
      scene: 'night',
      message: '床侧有人 · 主灯保持关闭，低位动线点亮',
    };
  if (kind === 'air')
    return {
      values: { ...current, co2: 1400, vent: 100 },
      message: 'CO₂ 升高至 1400 ppm · 新风切换强档',
    };
  if (kind === 'leak')
    return {
      values: { ...current, alarm: true, valve: false, path: 100 },
      message: '模拟漏水 · 告警、提示照明与水阀关闭',
    };
  return {
    values: { ...current, co2: 650, vent: 25, alarm: false, valve: true },
    message: '已清除模拟告警，恢复常规环境状态',
  };
}
