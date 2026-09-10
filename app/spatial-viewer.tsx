'use client';
import { forwardRef, useEffect, useRef, useImperativeHandle } from 'react';
import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { views, type Values, type ViewId } from '@/lib/home';
export type ViewerHandle = {
  clearSelection: () => void;
  reset: () => void;
  zoom: (factor: number) => void;
};
type Props = {
  values: Values;
  view: ViewId;
  cutaway: boolean;
  walk: boolean;
  paused: boolean;
  onReady: () => void;
  onProgress: (n: number) => void;
  onError: (e: string) => void;
  onSelect: (name: string) => void;
};
const readable = (source: string) => {
  const n = source.replace(/_/g, ' ');
  const groups = [
    ['Sofa', '客厅 · 亚麻沙发'],
    ['Soft back', '客厅 · 靠背软包'],
    ['Curtain', '智能窗帘'],
    ['Island', '餐厨 · 圆弧石材岛台'],
    ['Dining', '餐厅家具与灯具'],
    ['Master', '主卧家具'],
    ['Child', '儿童空间'],
    ['Z-Touch', 'Z-Touch 智控面屏'],
    ['Max II', 'Max II 智慧中枢'],
    ['Air sensor', '空气质量传感器'],
    ['Water |', '净水与水阀'],
    ['Kitchen', '厨房设备与柜体'],
    ['Oak |', '浅橡木地板'],
    ['Window', '窗户与窗框'],
    ['Living wall', '客厅收纳展示墙'],
    ['Reference', '器物与边几'],
    ['Cinema', '智能投影幕'],
    ['Branch', '自然枝叶'],
    ['Leaf', '自然枝叶'],
    ['Envelope', '建筑墙体'],
    ['Partition', '室内隔墙'],
    ['Shower', '卫浴 · 淋浴'],
    ['Laundry', '洗衣设备'],
  ];
  return (
    groups.find(([s]) => n.startsWith(s))?.[1] ||
    n.replace(/\|/g, '·').replace(/\.\d+$/, '')
  );
};
export default forwardRef<ViewerHandle, Props>(
  function SpatialViewer(props, ref) {
    const host = useRef<HTMLDivElement>(null),
      latest = useRef(props);
    latest.current = props;
    const api = useRef<ViewerHandle>({
      clearSelection: () => {},
      reset: () => {},
      zoom: () => {},
    });
    useImperativeHandle(
      ref,
      () => ({
        clearSelection: () => api.current.clearSelection(),
        reset: () => api.current.reset(),
        zoom: (f) => api.current.zoom(f),
      }),
      [],
    );
    useEffect(() => {
      if (!host.current) return;
      const el = host.current;
      let disposed = false,
        frame = 0,
        loaded = false,
        lastView = '',
        moving = false;
      let renderer: T.WebGLRenderer;
      try {
        renderer = new T.WebGLRenderer({
          antialias: true,
          powerPreference: 'high-performance',
        });
      } catch {
        latest.current.onError(
          '当前浏览器未能启动 WebGL，请开启硬件加速后重试。',
        );
        return;
      }
      renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
      renderer.outputColorSpace = T.SRGBColorSpace;
      renderer.toneMapping = T.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.05;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = T.PCFSoftShadowMap;
      el.appendChild(renderer.domElement);
      renderer.domElement.tabIndex = 0;
      renderer.domElement.setAttribute(
        'aria-label',
        '清语住宅三维视图，拖动旋转，滚轮缩放',
      );
      const scene = new T.Scene();
      scene.background = new T.Color('#2c302e');
      const pmrem = new T.PMREMGenerator(renderer);
      const room = new RoomEnvironment();
      const env = pmrem.fromScene(room, 0.04);
      scene.environment = env.texture;
      scene.environmentIntensity = 0.35;
      room.dispose();
      const hemi = new T.HemisphereLight(0xeaf0f7, 0x5f5039, 0.8);
      scene.add(hemi);
      const sun = new T.DirectionalLight(0xffedcc, 2.6);
      sun.position.set(-3, 10, -6);
      sun.castShadow = true;
      sun.shadow.mapSize.set(2048, 2048);
      Object.assign(sun.shadow.camera, {
        left: -8,
        right: 8,
        top: 8,
        bottom: -8,
        near: 0.1,
        far: 35,
      });
      sun.shadow.bias = -0.0002;
      sun.shadow.normalBias = 0.015;
      scene.add(sun);
      const fill = new T.DirectionalLight(0xc8d5e1, 0.6);
      fill.position.set(6, 9, 9);
      scene.add(fill);
      const ground = new T.Mesh(
        new T.PlaneGeometry(200, 200),
        new T.MeshStandardMaterial({ color: '#393d38', roughness: 1 }),
      );
      ground.rotation.x = -Math.PI / 2;
      ground.position.y = -0.19;
      ground.receiveShadow = true;
      scene.add(ground);
      const perspective = new T.PerspectiveCamera(48, 1, 0.04, 160);
      const ortho = new T.OrthographicCamera(-9, 9, 6.75, -6.75, 0.05, 150);
      ortho.position.set(11, 22, 15);
      let camera: T.PerspectiveCamera | T.OrthographicCamera = ortho;
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.target.set(0, 0.5, 0.1);
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;
      controls.minDistance = 0.25;
      controls.maxDistance = 42;
      controls.maxPolarAngle = Math.PI * 0.49;
      controls.minZoom = 0.55;
      controls.maxZoom = 6;
      controls.update();
      let meta: any = null;
      const dynamic: T.Object3D[] = [],
        rayMeshes: T.Object3D[] = [],
        walls: T.Object3D[] = [];
      const circuits: {
        light: T.PointLight;
        key: keyof Values;
        power: number;
      }[] = [];
      const glows: {
        m: T.MeshStandardMaterial;
        key: keyof Values;
        max: number;
      }[] = [];
      let outline: T.BoxHelper | null = null;
      const cv = (x: number, y: number, z: number) =>
        new T.Vector3((x - 920) / 90, z, (y - 740) / 90);
      for (const [x, y, key, power] of [
        [1175, 622, 'living', 38],
        [1200, 770, 'living', 30],
        [1165, 520, 'dining', 35],
        [570, 925, 'bedroom', 26],
        [550, 605, 'bedroom', 22],
        [743, 600, 'bedroom', 20],
        [929, 587, 'bedroom', 17],
        [912, 970, 'path', 10],
      ] as const) {
        const l = new T.PointLight(0xffce91, 0, 5, 2);
        l.position.copy(cv(x, y, 2.48));
        if (x === 1175) {
          l.castShadow = true;
          l.shadow.mapSize.set(512, 512);
          l.shadow.bias = -0.0003;
          l.shadow.normalBias = 0.025;
        }
        scene.add(l);
        circuits.push({ light: l, key, power });
      }
      for (const [x, y] of [
        [684, 790],
        [812, 776],
        [879, 856],
        [955, 896],
        [1072, 862],
      ]) {
        const l = new T.PointLight(0xff8f36, 0, 1.3, 2);
        l.position.copy(cv(x + 4, y - 3, 0.16));
        scene.add(l);
        circuits.push({ light: l, key: 'path', power: 2.3 });
        const tile = new T.Mesh(
          new T.PlaneGeometry(0.24, 0.45),
          new T.MeshBasicMaterial({
            color: 0xffa64c,
            transparent: true,
            opacity: 0,
            depthWrite: false,
          }),
        );
        tile.rotation.x = -Math.PI / 2;
        tile.position.copy(cv(x + 4, y - 12, 0.016));
        tile.userData.role = 'pathglow';
        scene.add(tile);
        dynamic.push(tile);
      }
      const dest = new T.Vector3(),
        target = new T.Vector3();
      const keys = new Set<string>();
      let then = performance.now();
      function resize() {
        const w = el.clientWidth,
          h = el.clientHeight;
        if (!w || !h) return;
        renderer.setSize(w, h);
        perspective.aspect = w / h;
        perspective.updateProjectionMatrix();
        const height = Math.max(12.5, 16 / (w / h));
        Object.assign(ortho, {
          left: (-height * w) / h / 2,
          right: (height * w) / h / 2,
          top: height / 2,
          bottom: -height / 2,
        });
        ortho.updateProjectionMatrix();
      }
      function clearSelection() {
        if (outline) {
          scene.remove(outline);
          outline.geometry.dispose();
          (outline.material as T.Material).dispose();
          outline = null;
        }
      }
      function setView(id: ViewId, instant = false) {
        clearSelection();
        const all = id === 'overview' || id === 'top';
        camera = all ? ortho : perspective;
        controls.object = camera;
        controls.enablePan = all;
        controls.maxPolarAngle = all ? Math.PI * 0.495 : Math.PI * 0.94;
        if (all) {
          dest.set(
            id === 'top' ? 0 : 11,
            id === 'top' ? 24 : 22,
            id === 'top' ? 0.02 : 15,
          );
          target.set(0, 0.5, 0.1);
          ortho.zoom = 1;
        } else {
          const data =
            meta?.cameras[views.find((v) => v.id === id)?.camera || ''];
          if (data) {
            dest.fromArray(data.position);
            target
              .copy(dest)
              .addScaledVector(new T.Vector3().fromArray(data.direction), 2.8);
            perspective.fov = data.fov;
          }
        }
        moving = !instant;
        if (instant) {
          camera.position.copy(dest);
          controls.target.copy(target);
        }
        resize();
        controls.update();
      }
      api.current = {
        clearSelection,
        reset: () => setView(latest.current.view),
        zoom: (f) => {
          if (camera === ortho) {
            ortho.zoom = T.MathUtils.clamp(ortho.zoom / f, 0.55, 6);
            ortho.updateProjectionMatrix();
          } else
            perspective.position
              .sub(controls.target)
              .multiplyScalar(f)
              .add(controls.target);
          controls.update();
        },
      };
      const resizeObs = new ResizeObserver(resize);
      resizeObs.observe(el);
      resize();
      const ray = new T.Raycaster();
      let start = { x: 0, y: 0 };
      const down = (e: PointerEvent) => {
        start = { x: e.clientX, y: e.clientY };
        renderer.domElement.focus({ preventScroll: true });
        moving = false;
      };
      const up = (e: PointerEvent) => {
        if (Math.hypot(e.clientX - start.x, e.clientY - start.y) > 5 || !loaded)
          return;
        const r = renderer.domElement.getBoundingClientRect();
        ray.setFromCamera(
          new T.Vector2(
            ((e.clientX - r.left) / r.width) * 2 - 1,
            (-(e.clientY - r.top) / r.height) * 2 + 1,
          ),
          camera,
        );
        const hits = ray.intersectObjects(rayMeshes, false).filter((h) => {
          let p: T.Object3D | null = h.object;
          while (p) {
            if (!p.visible) return false;
            p = p.parent;
          }
          return true;
        });
        if (hits.length) {
          latest.current.onSelect(readable(hits[0].object.name));
          if (outline) {
            scene.remove(outline);
            outline.geometry.dispose();
            (outline.material as T.Material).dispose();
          }
          outline = new T.BoxHelper(hits[0].object, 0xd0ad75);
          scene.add(outline);
        }
      };
      const keydown = (e: KeyboardEvent) => {
        if (
          latest.current.walk &&
          [
            'w',
            'a',
            's',
            'd',
            'arrowleft',
            'arrowright',
            'arrowup',
            'arrowdown',
          ].includes(e.key.toLowerCase())
        ) {
          keys.add(e.key.toLowerCase());
          e.preventDefault();
        }
      };
      const keyup = (e: KeyboardEvent) => keys.delete(e.key.toLowerCase());
      const blur = () => keys.clear();
      renderer.domElement.addEventListener('pointerdown', down);
      renderer.domElement.addEventListener('pointerup', up);
      renderer.domElement.addEventListener('keydown', keydown);
      renderer.domElement.addEventListener('keyup', keyup);
      renderer.domElement.addEventListener('blur', blur);
      Promise.all([
        fetch('/assets/model.json').then((r) => {
          if (!r.ok) throw Error('模型配置读取失败');
          return r.json();
        }),
        new GLTFLoader().loadAsync('/assets/qingyu.glb', (e) => {
          if (e.total)
            latest.current.onProgress(Math.round((e.loaded / e.total) * 100));
        }),
      ])
        .then(([data, gltf]) => {
          if (disposed) return;
          meta = data;
          gltf.scene.traverse((o) => {
            if (o.userData.role) {
              o.userData.baseY = o.position.y;
              dynamic.push(o);
            }
            if ((o as T.Mesh).isMesh) {
              const mesh = o as T.Mesh;
              if (/^(Luminaire|Dining)/.test(mesh.name)) {
                mesh.material = Array.isArray(mesh.material)
                  ? mesh.material.map((m) => m.clone())
                  : mesh.material.clone();
              }
              mesh.castShadow = true;
              mesh.receiveShadow = true;
              rayMeshes.push(mesh);
              if (/^(Envelope|Partition)/.test(mesh.name)) walls.push(mesh);
              for (const raw of Array.isArray(mesh.material)
                ? mesh.material
                : [mesh.material]) {
                const m = raw as T.MeshStandardMaterial;
                if (m.map)
                  m.map.anisotropy = Math.min(
                    8,
                    renderer.capabilities.getMaxAnisotropy(),
                  );
                m.envMapIntensity = 0.48;
                if (m.name.includes('Glass')) {
                  Object.assign(m, {
                    transmission: 0.35,
                    transparent: true,
                    opacity: 0.45,
                    depthWrite: false,
                    roughness: 0.12,
                  });
                }
                if (
                  mesh.name.replace(/_/g, ' ').includes('Luminaire | lens') ||
                  mesh.name
                    .replace(/_/g, ' ')
                    .includes('Dining | warm diffuser')
                )
                  glows.push({
                    m,
                    key: mesh.name.includes('Dining')
                      ? 'dining'
                      : mesh.position.x < 1
                        ? 'bedroom'
                        : 'living',
                    max: m.emissiveIntensity || 3,
                  });
              }
            }
          });
          scene.add(gltf.scene);
          setView(latest.current.view, true);
          lastView = latest.current.view;
          loaded = true;
          latest.current.onProgress(100);
          latest.current.onReady();
        })
        .catch((e) => {
          if (!disposed)
            latest.current.onError(e.message || '请检查网络后重新载入。');
        });
      const timeout = setTimeout(() => {
        if (!loaded && !disposed)
          latest.current.onError(
            '模型文件较大，载入超时。可重试或先查看渲染。',
          );
      }, 90000);
      const current = { ...latest.current.values };
      function animate(now: number) {
        if (disposed) return;
        frame = requestAnimationFrame(animate);
        const dt = Math.min((now - then) / 1000, 0.05);
        then = now;
        const p = latest.current;
        if (p.view !== lastView && loaded) {
          setView(p.view);
          lastView = p.view;
        }
        controls.enableRotate = !p.walk;
        const a = 1 - Math.exp(-dt * 4);
        for (const k of [
          'living',
          'dining',
          'bedroom',
          'path',
          'curtain',
          'bedCurtain',
          'daylight',
          'screen',
          'vent',
        ] as const)
          current[k] = T.MathUtils.lerp(current[k], p.values[k], a);
        for (const o of dynamic) {
          const role = o.userData.role;
          if (role === 'ceiling') o.visible = !p.cutaway;
          if (role === 'curtain_living')
            o.scale.x = 1 - (0.83 * current.curtain) / 100;
          if (role === 'curtain_bedroom')
            o.scale.y = 1 - (0.93 * current.bedCurtain) / 100;
          if (role === 'screen')
            o.scale.y = 0.025 + (0.975 * current.screen) / 100;
          if (role === 'cutwall') {
            o.scale.y = T.MathUtils.lerp(o.scale.y, p.cutaway ? 0.14 : 1, a);
            o.position.y = o.userData.baseY * o.scale.y;
          }
          if (role === 'valve')
            o.rotation.y = T.MathUtils.lerp(
              o.rotation.y,
              p.values.valve ? 0 : Math.PI / 2,
              a,
            );
          if (role === 'pathglow')
            (
              o as T.Mesh<T.PlaneGeometry, T.MeshBasicMaterial>
            ).material.opacity = (current.path / 100) * 0.23;
        }
        const day = current.daylight / 100;
        hemi.intensity = 0.13 + day * 0.75;
        sun.intensity = day * 2.9;
        fill.intensity = 0.06 + day * 0.45;
        scene.environmentIntensity = 0.1 + day * 0.38;
        for (const { light, key, power } of circuits)
          light.intensity = (power * Number(current[key])) / 100;
        for (const { m, key, max } of glows)
          m.emissiveIntensity = (max * Number(current[key])) / 100;
        if (moving) {
          camera.position.lerp(dest, dt * 5);
          controls.target.lerp(target, dt * 5);
          if (camera.position.distanceTo(dest) < 0.01) {
            camera.position.copy(dest);
            controls.target.copy(target);
            moving = false;
          }
        }
        if (p.walk && camera === perspective) {
          const forward = new T.Vector3();
          perspective.getWorldDirection(forward);
          forward.y = 0;
          forward.normalize();
          const right = new T.Vector3().crossVectors(
              forward,
              new T.Vector3(0, 1, 0),
            ),
            delta = new T.Vector3();
          if (keys.has('w') || keys.has('arrowup')) delta.add(forward);
          if (keys.has('s') || keys.has('arrowdown')) delta.sub(forward);
          if (keys.has('d')) delta.add(right);
          if (keys.has('a')) delta.sub(right);
          delta.multiplyScalar(dt * 1.5);
          const next = perspective.position.clone().add(delta);
          next.x = T.MathUtils.clamp(next.x, -5.1, 5.1);
          next.z = T.MathUtils.clamp(next.z, -4.2, 3.4);
          delta.copy(next).sub(perspective.position);
          if (delta.lengthSq() > 0) {
            const safety = new T.Raycaster(
              perspective.position,
              delta.clone().normalize(),
              0,
              delta.length() + 0.2,
            );
            if (safety.intersectObjects(walls, false).length)
              delta.set(0, 0, 0);
          }
          perspective.position.add(delta);
          controls.target.add(delta);
          if (keys.has('arrowleft') || keys.has('arrowright')) {
            const offset = controls.target.clone().sub(perspective.position);
            offset.applyAxisAngle(
              new T.Vector3(0, 1, 0),
              (keys.has('arrowleft') ? 1 : -1) * dt,
            );
            controls.target.copy(perspective.position).add(offset);
          }
        }
        controls.update();
        if (!p.paused) renderer.render(scene, camera);
      }
      frame = requestAnimationFrame(animate);
      return () => {
        disposed = true;
        cancelAnimationFrame(frame);
        clearTimeout(timeout);
        resizeObs.disconnect();
        controls.dispose();
        renderer.domElement.removeEventListener('pointerdown', down);
        renderer.domElement.removeEventListener('pointerup', up);
        renderer.domElement.removeEventListener('keydown', keydown);
        renderer.domElement.removeEventListener('keyup', keyup);
        renderer.domElement.removeEventListener('blur', blur);
        scene.traverse((o) => {
          if ((o as T.Mesh).isMesh) {
            const m = o as T.Mesh;
            m.geometry.dispose();
            for (const mat of Array.isArray(m.material)
              ? m.material
              : [m.material])
              mat.dispose();
          }
        });
        env.dispose();
        pmrem.dispose();
        renderer.dispose();
        renderer.domElement.remove();
      };
    }, []);
    return <div className="spatial-canvas" ref={host} />;
  },
);
