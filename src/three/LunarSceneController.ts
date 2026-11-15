import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { audioEngine } from '../game/audioEngine';
import {
  BOULDERS,
  OUTPOST_SITES,
  ROCK_TARGETS,
  ROVER_SPAWN,
  SHADOWED_CRATERS,
  getTerrainHeight,
  getTerrainNormal,
  isInShadowedCrater,
  isOnLooseRegolith,
} from '../game/lunarTerrain';
import { MOON_TOUR_TOPICS, ROVER_PARTS } from '../game/nasaMedia';
import { PHASE4_CHALLENGES, STRUCTURES } from '../game/missionData';
import { checkDynamicObstacleAhead } from '../game/pathSystem';
import { evaluatePlacementSuitability, getRecommendedOutpostSlots } from '../game/rules';
import {
  CameraMode,
  GameState,
  OutpostConnection,
  PathPoint3D,
  PlacedStructure,
  Point2D,
  RoverAnimState,
  StructureType,
} from '../game/types';
import {
  RoverModelHandles,
  createBoulderMesh,
  createRoverModel,
  createStructureModel,
  createTargetMarkerModel,
  setStructureVisualStatus,
} from './models';
import {
  createContactShadowTexture,
  createEarthTextures,
  createLunarRegolithTextures,
  createMoonSphereTextures,
} from './proceduralTextures';

const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _v3 = new THREE.Vector3();
const _mat4 = new THREE.Matrix4();
const _quat = new THREE.Quaternion();
const _euler = new THREE.Euler();
const _up = new THREE.Vector3(0, 1, 0);
const _ndc = new THREE.Vector2();

export interface SceneObjectLabel {
  id: string;
  label: string;
  sub: string;
  xPct: number;
  yPct: number;
  kind: 'rover' | 'target' | 'structure' | 'proposed' | 'site';
  worldX: number;
  worldZ: number;
  targetStructureId?: string;
  proposedType?: StructureType;
}

export interface SceneCallbacks {
  onCameraAction: (action: 'rotate' | 'zoom') => void;
  onRoverStep: (payload: {
    x: number;
    y: number;
    z: number;
    headingRad: number;
    speed: number;
    animState: RoverAnimState;
    distanceDelta: number;
    inCrater: boolean;
    onLooseRegolith: boolean;
    dustDelta: number;
    energyDelta: number;
  }) => void;
  onRouteDrawSample: (points: Point2D[], finished: boolean) => void;
  onRouteProgress: (index: number, finished: boolean) => void;
  onDynamicObstacle: (boulderId: string) => void;
  onTerrainClickForBuild: (x: number, z: number) => void;
  onStructureClick?: (structureId: string) => void;
  onInspectSceneObject?: (payload: {
    kind: string;
    title: string;
    badge: string;
    x: number;
    z: number;
    structureId?: string;
  }) => void;
  onProjectedLabels?: (labels: SceneObjectLabel[]) => void;
}

const DUST_POOL_SIZE = 72;

interface DustParticle {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  age: number;
  maxAge: number;
  scale: number;
}

export class LunarSceneController {
  private container: HTMLElement;
  private callbacks: SceneCallbacks;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private isSoftwareGl: boolean;
  private maxAnisotropy: number;

  private sunLight!: THREE.DirectionalLight;
  private earthshineLight!: THREE.DirectionalLight;
  private terrainMesh!: THREE.Mesh;
  private rover!: RoverModelHandles;
  private shadowTex!: THREE.CanvasTexture;
  private targetGroups = new Map<string, THREE.Group>();
  private boulderGroups = new Map<string, THREE.Group>();
  private siteRings = new Map<string, THREE.Mesh>();
  private structureGroup = new THREE.Group();
  private placedStructureMeshes = new Map<string, { group: THREE.Group; deployProgress: number }>();
  private connectionGroup = new THREE.Group();
  private connectionBeads: Array<{
    mesh: THREE.Mesh;
    curve: THREE.CatmullRomCurve3;
    phase: number;
    active: boolean;
  }> = [];
  private lastConnSignature = '';
  private buildGhostGroup: THREE.Group | null = null;
  private buildGhostRing: THREE.Mesh | null = null;
  private buildGhostType: StructureType | null = null;
  private proposedSlotsGroup = new THREE.Group();
  private lastProposedSig = '';
  private phase4BeaconRing!: THREE.Mesh;
  private phase4BeaconBeam!: THREE.Mesh;
  private craterRings: THREE.Mesh[] = [];
  private pointerDownPos = { x: 0, y: 0 };

  // Sky & Intro Space Props
  private introGroup = new THREE.Group();
  private earthMesh!: THREE.Mesh;
  private earthCloudMesh!: THREE.Mesh;
  private distantEarthMesh!: THREE.Mesh;
  private distantEarthCloudMesh!: THREE.Mesh;
  private moonIntroMesh!: THREE.Mesh;
  private solarStormGroup = new THREE.Group();
  private tourHighlightRing!: THREE.Mesh;

  // Route visualization
  private routeGroup = new THREE.Group();
  private routeValidMesh: THREE.Mesh | null = null;
  private routeInvalidMesh: THREE.Mesh | null = null;
  private routePinStart: THREE.Mesh;
  private routePinEnd: THREE.Mesh;
  private lastRouteSignature = '';

  // Dust particle ring buffer
  private dustMesh!: THREE.InstancedMesh;
  private dustParticles: DustParticle[] = [];
  private dustCursor = 0;

  // Input & Loop state
  private keysHeld = new Set<string>();
  private touchMoveVec = { forward: 0, turn: 0 };
  private isPointerDrawing = false;
  private drawnPoints: Point2D[] = [];
  private lastDrawSampleTime = 0;
  private raycaster = new THREE.Raycaster();
  private lastState!: GameState;

  private frameId = 0;
  private disposed = false;
  private lastTimeMs = 0;
  private elapsedSec = 0;
  private cameraShakeTrauma = 0;
  private introLandingProgress = 0;
  private introDescendProgress = 0;
  private lastRoverReportTime = 0;
  private lastLabelEmitTime = 0;
  private lastEmittedLabels: SceneObjectLabel[] = [];
  private scanTimer = 0;
  private drillTimer = 0;
  private scoopTimer = 0;
  private jumpReactTimer = 0;
  private currentRouteIndex = 0;
  private lastPrevDist = 0;
  private lastCamMode: CameraMode = 'follow';
  private userInteractedCamera = false;
  private resizeObserver: ResizeObserver;

  constructor(container: HTMLElement, initialState: GameState, callbacks: SceneCallbacks) {
    this.container = container;
    this.lastState = initialState;
    this.callbacks = callbacks;

    // 1. Software WebGL probe
    this.isSoftwareGl = (() => {
      try {
        const probe = document.createElement('canvas').getContext('webgl2');
        if (!probe) return true;
        const ext = probe.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : probe.RENDERER;
        const gpu = String(probe.getParameter(param));
        probe.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    // 2. Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);
    this.maxAnisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy() || 1);

    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.style.touchAction = 'none';
    container.appendChild(this.renderer.domElement);

    // 3. Scene (pure black vacuum space, no muddy fog)
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x020408);
    this.scene.fog = new THREE.FogExp2(0x020408, 0.0042);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    // 4. Camera & OrbitControls
    const aspect = (container.clientWidth || 1280) / (container.clientHeight || 720);
    this.camera = new THREE.PerspectiveCamera(48, aspect, 0.2, 520);
    this.camera.position.set(ROVER_SPAWN.x + 8, 8.5, ROVER_SPAWN.z + 11);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = !this.isSoftwareGl;
    this.controls.dampingFactor = 0.08;
    this.controls.maxPolarAngle = Math.PI * 0.47;
    this.controls.minDistance = 4;
    this.controls.maxDistance = 58;
    this.controls.target.set(ROVER_SPAWN.x, getTerrainHeight(ROVER_SPAWN.x, ROVER_SPAWN.z) + 0.8, ROVER_SPAWN.z);
    this.lastPrevDist = this.camera.position.distanceTo(this.controls.target);

    this.controls.addEventListener('start', () => {
      this.userInteractedCamera = true;
      this.lastPrevDist = this.camera.position.distanceTo(this.controls.target);
    });
    this.controls.addEventListener('end', () => {
      this.userInteractedCamera = false;
    });
    this.controls.addEventListener('change', () => {
      if (
        this.userInteractedCamera &&
        this.lastState.screen === 'tutorial' &&
        !this.lastState.routePlanning.isDrawingMode
      ) {
        const d = this.camera.position.distanceTo(this.controls.target);
        if (Math.abs(d - this.lastPrevDist) > 0.35) {
          this.lastPrevDist = d;
          this.callbacks.onCameraAction('zoom');
        } else {
          this.callbacks.onCameraAction('rotate');
        }
      }
    });

    // 5. Route pins & outpost connection group
    this.routePinStart = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.28, 0.14, 16),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
    );
    this.routePinEnd = new THREE.Mesh(
      new THREE.ConeGeometry(0.42, 1.15, 16),
      new THREE.MeshBasicMaterial({ color: 0x34d399 })
    );
    this.routePinStart.visible = false;
    this.routePinEnd.visible = false;
    this.routeGroup.add(this.routePinStart, this.routePinEnd);
    this.scene.add(this.routeGroup);
    this.scene.add(this.proposedSlotsGroup);
    this.scene.add(this.structureGroup);
    this.scene.add(this.connectionGroup);
    this.scene.add(this.solarStormGroup);

    this.phase4BeaconRing = new THREE.Mesh(
      new THREE.RingGeometry(2.2, 2.85, 36),
      new THREE.MeshBasicMaterial({
        color: 0xf59e0b,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
      })
    );
    this.phase4BeaconRing.rotation.x = -Math.PI / 2;
    this.phase4BeaconRing.visible = false;
    this.scene.add(this.phase4BeaconRing);

    this.phase4BeaconBeam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.55, 7.5, 16, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0xfbbf24,
        transparent: true,
        opacity: 0.24,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    this.phase4BeaconBeam.visible = false;
    this.scene.add(this.phase4BeaconBeam);

    this.setupLighting();
    this.buildSkyAndEarth();
    this.buildTerrain();
    this.buildBouldersAndMicroRocks();
    this.buildTargetsAndSites();
    this.buildRover();
    this.buildDustPool();
    this.buildIntroSpaceObjects();
    this.buildSolarStormStreaks();

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    this.bindEvents();
    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(container);

    this.updateScene(0.016);
    this.renderer.render(this.scene, this.camera);

    this.lastTimeMs = performance.now();
    this.scheduleNextFrame();
  }

  private setupLighting() {
    // Low-angle South Pole warm solar key light (creates crisp long lunar shadows)
    this.sunLight = new THREE.DirectionalLight(0xfff6e5, 3.75);
    this.sunLight.position.set(52, 18, 32);
    this.sunLight.castShadow = !this.isSoftwareGl;
    this.sunLight.shadow.mapSize.set(1024, 1024);
    this.sunLight.shadow.camera.near = 5;
    this.sunLight.shadow.camera.far = 140;
    this.sunLight.shadow.camera.left = -46;
    this.sunLight.shadow.camera.right = 46;
    this.sunLight.shadow.camera.top = 46;
    this.sunLight.shadow.camera.bottom = -46;
    this.sunLight.shadow.bias = -0.0006;
    this.sunLight.shadow.normalBias = 0.03;
    this.scene.add(this.sunLight);

    // Subtle cool Earthshine rim light from Earth's direction in the black sky
    this.earthshineLight = new THREE.DirectionalLight(0x6394db, 0.34);
    this.earthshineLight.position.set(22, 26, -80);
    this.scene.add(this.earthshineLight);

    // Very subtle bounce fill so shadowed craters stay dramatically dark
    const hemi = new THREE.HemisphereLight(0x7ca6dc, 0x0b0d12, 0.16);
    this.scene.add(hemi);
  }

  private buildSkyAndEarth() {
    // Multi-magnitude starfield via InstancedMesh
    const starCount = 720;
    const starGeo = new THREE.SphereGeometry(0.24, 5, 5);
    const starMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const stars = new THREE.InstancedMesh(starGeo, starMat, starCount);
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();

    let s = 1337;
    const rng = () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };

    for (let i = 0; i < starCount; i++) {
      const theta = rng() * Math.PI * 2;
      const phi = Math.acos(0.04 + rng() * 0.96);
      const r = 185 + rng() * 80;
      dummy.position.set(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.cos(phi),
        r * Math.sin(phi) * Math.sin(theta)
      );
      const isBright = i < 45;
      const sc = isBright ? 1.15 + rng() * 0.95 : 0.35 + rng() * 0.85;
      dummy.scale.setScalar(sc);
      dummy.updateMatrix();
      stars.setMatrixAt(i, dummy.matrix);
      color.setHSL(0.57 + rng() * 0.14, isBright ? 0.32 : 0.18, isBright ? 0.96 : 0.72 + rng() * 0.24);
      stars.setColorAt(i, color);
    }
    stars.instanceMatrix.needsUpdate = true;
    if (stars.instanceColor) stars.instanceColor.needsUpdate = true;
    stars.computeBoundingSphere();
    this.scene.add(stars);

    // Prominent Earth hanging over the black South Pole horizon
    const sunDir = this.sunLight.position.clone().normalize();
    const { surfaceMap, bumpMap, roughnessMap, cloudMap, nightMap } = createEarthTextures(this.maxAnisotropy);
    const earthGrp = new THREE.Group();
    earthGrp.position.set(13, 21, -135);

    const distantEarthMat = this.createEarthSurfaceMaterial(
      surfaceMap,
      bumpMap,
      roughnessMap,
      nightMap,
      sunDir,
      0.1
    );
    this.distantEarthMesh = new THREE.Mesh(
      new THREE.SphereGeometry(9.2, 48, 36),
      distantEarthMat
    );
    earthGrp.add(this.distantEarthMesh);

    this.distantEarthCloudMesh = new THREE.Mesh(
      new THREE.SphereGeometry(9.35, 48, 36),
      new THREE.MeshStandardMaterial({
        map: cloudMap,
        transparent: true,
        opacity: 0.78,
        roughness: 0.94,
        envMapIntensity: 0.08,
        depthWrite: false,
      })
    );
    earthGrp.add(this.distantEarthCloudMesh);

    const distantHalo = new THREE.Mesh(
      new THREE.SphereGeometry(9.78, 40, 32),
      this.createEarthAtmosphereMaterial(sunDir, 0.72)
    );
    earthGrp.add(distantHalo);
    this.scene.add(earthGrp);
  }

  private createEarthSurfaceMaterial(
    surfaceMap: THREE.Texture,
    bumpMap: THREE.Texture,
    roughnessMap: THREE.Texture,
    nightMap: THREE.Texture,
    sunDir: THREE.Vector3,
    bumpScale = 0.14
  ): THREE.MeshStandardMaterial {
    const mat = new THREE.MeshStandardMaterial({
      map: surfaceMap,
      bumpMap,
      bumpScale,
      roughnessMap,
      roughness: 0.98,
      metalness: 0.0,
      envMapIntensity: 0.08,
      emissive: 0xffcf70,
      emissiveMap: nightMap,
      emissiveIntensity: 0.95,
    });
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uEarthSunDir = { value: sunDir };
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vEarthWorldNorm;')
        .replace(
          '#include <begin_vertex>',
          '#include <begin_vertex>\nvEarthWorldNorm = normalize((modelMatrix * vec4(normal, 0.0)).xyz);'
        );
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform vec3 uEarthSunDir;\nvarying vec3 vEarthWorldNorm;')
        .replace(
          '#include <emissivemap_fragment>',
          '#include <emissivemap_fragment>\nfloat earthNightMask = smoothstep(0.14, -0.22, dot(normalize(vEarthWorldNorm), normalize(uEarthSunDir)));\ntotalEmissiveRadiance *= earthNightMask;'
        );
    };
    return mat;
  }

  private createEarthAtmosphereMaterial(sunDir: THREE.Vector3, intensity = 0.85): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      uniforms: {
        uSunDir: { value: sunDir },
        uIntensity: { value: intensity },
        uGlowColor: { value: new THREE.Color(0x4ea8ff) },
      },
      vertexShader: `
        varying vec3 vWorldPos;
        varying vec3 vWorldNormal;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldPos = wp.xyz;
          vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
        uniform vec3 uSunDir;
        uniform float uIntensity;
        uniform vec3 uGlowColor;
        varying vec3 vWorldPos;
        varying vec3 vWorldNormal;
        void main() {
          vec3 viewDir = normalize(cameraPosition - vWorldPos);
          vec3 n = normalize(vWorldNormal);
          float limb = pow(smoothstep(0.0, -0.36, dot(viewDir, n)), 2.2);
          float sunlit = smoothstep(-0.26, 0.45, dot(n, normalize(uSunDir)));
          float alpha = limb * (0.14 + 0.86 * sunlit) * uIntensity;
          gl_FragColor = vec4(uGlowColor, clamp(alpha, 0.0, 0.85));
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.BackSide,
    });
  }

  private buildTerrain() {
    const size = 140;
    const segs = 112;
    const geo = new THREE.PlaneGeometry(size, size, segs, segs);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const y = getTerrainHeight(x, z);
      pos.setY(i, y);

      const inShadow = isInShadowedCrater(x, z);
      const loose = isOnLooseRegolith(x, z);
      let shade = 0.72 + Math.min(0.3, Math.max(-0.24, y * 0.065));
      if (inShadow) shade *= 0.36;
      if (loose) shade *= 0.85;
      colors[i * 3] = shade;
      colors[i * 3 + 1] = shade;
      colors[i * 3 + 2] = shade * (inShadow ? 1.12 : 1.0);
    }

    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();

    const { albedoMap, normalMap, roughnessMap } = createLunarRegolithTextures(this.maxAnisotropy);
    const terrainMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: albedoMap,
      normalMap,
      normalScale: new THREE.Vector2(0.85, 0.85),
      roughnessMap,
      roughness: 0.94,
      metalness: 0.02,
      vertexColors: true,
    });

    this.terrainMesh = new THREE.Mesh(geo, terrainMat);
    this.terrainMesh.receiveShadow = true;
    this.scene.add(this.terrainMesh);

    // Subtle shadowed crater boundary ring indicators
    for (const c of SHADOWED_CRATERS) {
      const cy = getTerrainHeight(c.x, c.z);
      const craterRing = new THREE.Mesh(
        new THREE.RingGeometry(c.radius * 0.85, c.radius * 0.89, 48),
        new THREE.MeshBasicMaterial({
          color: 0x38bdf8,
          transparent: true,
          opacity: 0.18,
          side: THREE.DoubleSide,
          depthWrite: false,
        })
      );
      craterRing.rotation.x = -Math.PI / 2;
      craterRing.position.set(c.x, cy + 1.85, c.z);
      craterRing.userData.inspectPayload = {
        kind: 'crater',
        title: c.name,
        badge: 'Shadowed Crater',
        x: c.x,
        z: c.z,
      };
      this.scene.add(craterRing);
      this.craterRings.push(craterRing);
    }
  }

  private buildBouldersAndMicroRocks() {
    for (const b of BOULDERS) {
      const grp = createBoulderMesh(b);
      grp.position.y = getTerrainHeight(b.x, b.z) - 0.1;
      grp.userData.inspectPayload = {
        kind: 'boulder',
        title: 'Lunar Boulder Cluster',
        badge: 'Surface Hazard',
        x: b.x,
        z: b.z,
      };
      this.scene.add(grp);
      this.boulderGroups.set(b.id, grp);
    }

    const count = 180;
    const rockGeo = new THREE.DodecahedronGeometry(0.27, 0);
    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x8d9299,
      roughness: 0.92,
      metalness: 0.04,
      flatShading: true,
    });
    const inst = new THREE.InstancedMesh(rockGeo, rockMat, count);
    inst.receiveShadow = true;

    const dummy = new THREE.Object3D();
    const tint = new THREE.Color();
    let seed = 8899;
    const rng = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };

    for (let i = 0; i < count; i++) {
      const angle = rng() * Math.PI * 2;
      const rad = 5.5 + rng() * 46;
      const rx = Math.cos(angle) * rad;
      const rz = Math.sin(angle) * rad;
      const ry = getTerrainHeight(rx, rz);

      dummy.position.set(rx, ry + 0.05, rz);
      dummy.rotation.set(rng() * 3, rng() * 3, rng() * 3);
      const sc = 0.45 + rng() * 1.25;
      dummy.scale.set(sc * (0.85 + rng() * 0.35), sc * 0.68, sc * (0.85 + rng() * 0.35));
      dummy.updateMatrix();
      inst.setMatrixAt(i, dummy.matrix);

      const v = 0.72 + rng() * 0.36;
      tint.setRGB(v, v, v * 1.02);
      inst.setColorAt(i, tint);
    }
    inst.instanceMatrix.needsUpdate = true;
    if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
    inst.computeBoundingSphere();
    this.scene.add(inst);
  }

  private buildTargetsAndSites() {
    for (const target of ROCK_TARGETS) {
      const grp = createTargetMarkerModel(target);
      grp.position.set(target.x, getTerrainHeight(target.x, target.z), target.z);
      grp.userData.inspectPayload = {
        kind: target.kind,
        title: target.name,
        badge: `Phase ${target.phase} Target`,
        x: target.x,
        z: target.z,
      };
      this.scene.add(grp);
      this.targetGroups.set(target.id, grp);
    }

    for (const site of OUTPOST_SITES) {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(4.2, 4.6, 40),
        new THREE.MeshBasicMaterial({
          color: site.id === 'ridge_haven' ? 0xfbbf24 : 0x38bdf8,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.45,
          depthWrite: false,
        })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(site.x, getTerrainHeight(site.x, site.z) + 0.08, site.z);
      this.scene.add(ring);
      this.siteRings.set(site.id, ring);
    }
  }

  private buildRover() {
    this.shadowTex = createContactShadowTexture();
    this.rover = createRoverModel(this.shadowTex, this.maxAnisotropy, this.isSoftwareGl);
    this.rover.root.position.set(
      this.lastState.rover.x,
      this.lastState.rover.y,
      this.lastState.rover.z
    );
    this.rover.root.rotation.y = this.lastState.rover.headingRad;
    this.rover.root.userData.inspectPayload = {
      kind: 'rover',
      title: this.lastState.roverName || 'ASTRO Rover',
      badge: 'Moon Rover Companion',
      x: this.lastState.rover.x,
      z: this.lastState.rover.z,
    };
    this.rover.setHeadlights(this.lastState.rover.headlightsOn);
    this.scene.add(this.rover.root);
  }

  private buildDustPool() {
    const geo = new THREE.DodecahedronGeometry(0.11, 0);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x9ca3af,
      roughness: 0.96,
      metalness: 0.0,
      transparent: true,
      opacity: 0.72,
    });
    this.dustMesh = new THREE.InstancedMesh(geo, mat, DUST_POOL_SIZE);
    this.dustMesh.frustumCulled = false;

    for (let i = 0; i < DUST_POOL_SIZE; i++) {
      this.dustParticles.push({
        active: false,
        x: 0,
        y: -50,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        age: 0,
        maxAge: 0.8,
        scale: 0,
      });
      _mat4.makeScale(0, 0, 0);
      this.dustMesh.setMatrixAt(i, _mat4);
    }
    this.dustMesh.instanceMatrix.needsUpdate = true;
    this.scene.add(this.dustMesh);
  }

  private buildIntroSpaceObjects() {
    this.introGroup.position.set(0, 160, 0);
    const sunDir = this.sunLight.position.clone().normalize();
    const { surfaceMap, bumpMap, roughnessMap, cloudMap, nightMap } = createEarthTextures(
      this.maxAnisotropy
    );

    // Earth radius = 9.5 (12,742 km reference); Moon radius = 2.59 (3,475 km -> 27.3% true diameter ratio)
    const earthRadius = 9.5;
    const moonRadius = 2.59;

    this.earthMesh = new THREE.Mesh(
      new THREE.SphereGeometry(earthRadius, 64, 48),
      this.createEarthSurfaceMaterial(surfaceMap, bumpMap, roughnessMap, nightMap, sunDir, 0.14)
    );
    this.earthMesh.position.set(-8.0, 0.5, -18);
    // Start rotation showing recognizable Atlantic/Americas/Africa curvature
    this.earthMesh.rotation.y = -0.55;
    this.introGroup.add(this.earthMesh);

    const atmosHalo = new THREE.Mesh(
      new THREE.SphereGeometry(earthRadius * 1.06, 48, 36),
      this.createEarthAtmosphereMaterial(sunDir, 0.92)
    );
    atmosHalo.position.copy(this.earthMesh.position);
    this.introGroup.add(atmosHalo);

    this.earthCloudMesh = new THREE.Mesh(
      new THREE.SphereGeometry(earthRadius * 1.015, 64, 48),
      new THREE.MeshStandardMaterial({
        map: cloudMap,
        transparent: true,
        opacity: 0.86,
        roughness: 0.95,
        envMapIntensity: 0.08,
        depthWrite: false,
      })
    );
    this.earthCloudMesh.position.copy(this.earthMesh.position);
    this.introGroup.add(this.earthCloudMesh);

    const { surfaceMap: moonSurface, bumpMap: moonBump } = createMoonSphereTextures(
      this.maxAnisotropy
    );
    this.moonIntroMesh = new THREE.Mesh(
      new THREE.SphereGeometry(moonRadius, 48, 36),
      new THREE.MeshStandardMaterial({
        color: 0xd8dce3,
        map: moonSurface,
        bumpMap: moonBump,
        bumpScale: 0.18,
        roughness: 0.95,
        metalness: 0.02,
        envMapIntensity: 0.12,
      })
    );
    this.moonIntroMesh.position.set(22.0, -0.4, -18);
    this.introGroup.add(this.moonIntroMesh);

    this.scene.add(this.introGroup);

    this.tourHighlightRing = new THREE.Mesh(
      new THREE.RingGeometry(2.0, 2.55, 36),
      new THREE.MeshBasicMaterial({
        color: 0xfbbf24,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
      })
    );
    this.tourHighlightRing.rotation.x = -Math.PI / 2;
    this.tourHighlightRing.visible = false;
    this.scene.add(this.tourHighlightRing);
  }

  private buildSolarStormStreaks() {
    this.solarStormGroup.visible = false;
    const streakMat = new THREE.MeshBasicMaterial({
      color: 0xfb923c,
      transparent: true,
      opacity: 0.55,
    });
    const streakGeo = new THREE.CylinderGeometry(0.03, 0.03, 4.5, 6);
    for (let i = 0; i < 16; i++) {
      const m = new THREE.Mesh(streakGeo, streakMat);
      m.position.set(((i % 4) - 1.5) * 9, 14 + (i % 3) * 4, (Math.floor(i / 4) - 1.5) * 9);
      m.rotation.z = 0.65;
      m.rotation.x = 0.35;
      this.solarStormGroup.add(m);
    }
  }

  private spawnDustBurst(x: number, y: number, z: number, count = 4, speedFactor = 1) {
    for (let i = 0; i < count; i++) {
      const p = this.dustParticles[this.dustCursor];
      this.dustCursor = (this.dustCursor + 1) % DUST_POOL_SIZE;
      p.active = true;
      p.x = x + (Math.random() - 0.5) * 0.9;
      p.y = y + 0.12;
      p.z = z + (Math.random() - 0.5) * 0.9;
      p.vx = (Math.random() - 0.5) * 1.4 * speedFactor;
      p.vy = (0.8 + Math.random() * 1.3) * speedFactor;
      p.vz = (Math.random() - 0.5) * 1.4 * speedFactor;
      p.age = 0;
      p.maxAge = 0.55 + Math.random() * 0.45;
      p.scale = 0.7 + Math.random() * 0.9;
    }
  }

  public syncState(nextState: GameState) {
    const prev = this.lastState;
    this.lastState = nextState;

    // Trigger rover reaction when named in Scene 5
    if (nextState.roverName !== prev.roverName && nextState.screen === 'intro') {
      this.jumpReactTimer = 1.1;
      this.rover.setMood('victory');
    }

    // Only snap camera when FIRST entering intro (from title/settings); keep transitions smooth inside intro!
    if (nextState.screen === 'intro' && prev.screen !== 'intro') {
      this.introLandingProgress = 0;
      this.introDescendProgress = 0;
      if (nextState.introScene === 0) {
        const pPull = this.camera.aspect < 0.85 ? (0.85 - this.camera.aspect) * 44 : 0;
        this.camera.position.set(-9.5, 161.2, 8.5 + pPull);
        this.controls.target.set(-8.0, 160.5, -18);
        this.camera.lookAt(this.controls.target);
      } else if (nextState.introScene >= 4) {
        const groundY = getTerrainHeight(ROVER_SPAWN.x, ROVER_SPAWN.z);
        this.camera.position.set(ROVER_SPAWN.x - 4.0, groundY + 2.55, ROVER_SPAWN.z - 6.8);
        this.controls.target.set(ROVER_SPAWN.x - 0.9, groundY + 1.35, ROVER_SPAWN.z);
        this.camera.lookAt(this.controls.target);
      }
    }
    if (nextState.screen === 'intro' && nextState.introScene === 2 && prev.introScene < 2) {
      this.introDescendProgress = 0;
      this.camera.position.set(16, 48, 36);
      this.controls.target.set(-4, 0, -4);
    }
    if (nextState.screen === 'intro' && nextState.introScene >= 4 && prev.introScene < 4) {
      this.introLandingProgress = 0;
    }

    if (
      (prev.screen === 'intro' || prev.screen === 'title') &&
      (nextState.screen === 'tutorial' || nextState.screen === 'playing')
    ) {
      this.rover.root.position.set(nextState.rover.x, nextState.rover.y, nextState.rover.z);
      this.rover.root.rotation.y = nextState.rover.headingRad;
      this.applyCameraModeInstantHint(nextState.cameraMode);
      this.lastCamMode = nextState.cameraMode;
      this.lastPrevDist = this.camera.position.distanceTo(this.controls.target);
    }

    if (nextState.cameraMode !== this.lastCamMode) {
      this.lastCamMode = nextState.cameraMode;
      this.applyCameraModeInstantHint(nextState.cameraMode);
      this.lastPrevDist = this.camera.position.distanceTo(this.controls.target);
    }

    this.controls.enabled =
      nextState.screen !== 'intro' &&
      nextState.screen !== 'victory' &&
      !nextState.routePlanning.isDrawingMode;

    // Headlights & dust visual state (force warm headlights ON during Mission Complete rover appreciation)
    this.rover.setHeadlights(nextState.rover.headlightsOn || nextState.screen === 'victory');
    this.rover.dustOverlayMat.opacity = Math.min(0.85, (nextState.rover.dustLevel / 100) * 0.85);

    // Phase 4 environmental feedback in 3D scene
    if (nextState.phase === 4 && nextState.screen === 'playing') {
      const ch = nextState.survival.activeChallenge;
      this.sunLight.intensity = ch === 'low_sunlight' ? 1.55 : 3.75;
      this.solarStormGroup.visible = ch === 'solar_particle_event';
    } else {
      this.sunLight.intensity = 3.75;
      this.solarStormGroup.visible = false;
    }

    // Sync route visualization
    const lastRaw = nextState.routePlanning.rawPoints[nextState.routePlanning.rawPoints.length - 1];
    const sig = JSON.stringify({
      pts: nextState.routePlanning.validation?.sampledPoints?.length ?? 0,
      valid: nextState.routePlanning.validation?.valid,
      raw: nextState.routePlanning.rawPoints.length,
      lx: lastRaw ? Math.round(lastRaw.x * 10) : null,
      lz: lastRaw ? Math.round(lastRaw.z * 10) : null,
    });
    const routeChanged = sig !== this.lastRouteSignature;
    if (routeChanged) {
      this.lastRouteSignature = sig;
      this.rebuildRouteMeshes(nextState);
    }

    if (nextState.routePlanning.isExecuting && (!prev.routePlanning.isExecuting || routeChanged)) {
      this.currentRouteIndex = nextState.routePlanning.progressIndex;
    }

    // Sync placed structures & status beacons
    for (const s of nextState.structures) {
      const entry = this.placedStructureMeshes.get(s.id);
      if (!entry) {
        this.addPlacedStructureMesh(s);
      } else {
        setStructureVisualStatus(entry.group, s.status, Boolean(s.damaged));
      }
    }
    const activeIds = new Set(nextState.structures.map((s) => s.id));
    for (const [sid, entry] of this.placedStructureMeshes.entries()) {
      if (!activeIds.has(sid)) {
        this.structureGroup.remove(entry.group);
        this.placedStructureMeshes.delete(sid);
      }
    }

    // Highlight selected connectSourceId or buildMode visual
    const connSig = JSON.stringify(nextState.connections) + `::${nextState.connectSourceId ?? ''}`;
    if (connSig !== this.lastConnSignature) {
      this.lastConnSignature = connSig;
      this.rebuildConnectionMeshes(nextState.structures, nextState.connections);
    }

    // Sync build ghost & suitability halo in Phase 3 Place mode
    if (
      nextState.phase === 3 &&
      nextState.buildMode === 'place' &&
      nextState.selectedBuildType &&
      nextState.screen === 'playing'
    ) {
      if (this.buildGhostType !== nextState.selectedBuildType) {
        this.clearBuildGhost();
        this.buildGhostType = nextState.selectedBuildType;
        this.buildGhostGroup = createStructureModel(
          nextState.selectedBuildType,
          this.shadowTex,
          this.maxAnisotropy
        );
        this.buildGhostGroup.traverse((obj) => {
          if ((obj as THREE.Mesh).isMesh) {
            const m = ((obj as THREE.Mesh).material as THREE.Material).clone();
            m.transparent = true;
            m.opacity = 0.45;
            (obj as THREE.Mesh).material = m;
          }
        });
        this.scene.add(this.buildGhostGroup);

        this.buildGhostRing = new THREE.Mesh(
          new THREE.RingGeometry(2.1, 2.55, 36),
          new THREE.MeshBasicMaterial({
            color: 0x34d399,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.75,
            depthWrite: false,
          })
        );
        this.buildGhostRing.rotation.x = -Math.PI / 2;
        this.scene.add(this.buildGhostRing);
      }
      if (this.buildGhostGroup) {
        this.buildGhostGroup.rotation.y = THREE.MathUtils.degToRad(nextState.buildRotationDeg);
      }
    } else {
      this.clearBuildGhost();
    }

    // Highlight targets based on completion
    for (const [id, grp] of this.targetGroups.entries()) {
      const done =
        nextState.scannedTargetIds.includes(id) || nextState.collectedTargetIds.includes(id);
      grp.scale.setScalar(done ? 0.72 : 1.0);
    }

    // Update rover inspect payload
    if (this.rover?.root) {
      this.rover.root.userData.inspectPayload = {
        kind: 'rover',
        title: nextState.roverName || 'ASTRO Rover',
        badge: 'Moon Rover Companion',
        x: nextState.rover.x,
        z: nextState.rover.z,
      };
    }

    // Sync 3D dotted build slot previews in Phase 3
    this.rebuildProposedSlots(nextState);

    // Sync Phase 4 highlighted station beacon
    if (
      nextState.phase === 4 &&
      nextState.screen === 'playing' &&
      nextState.survival.overviewSeen &&
      !nextState.survival.stationVisited &&
      nextState.survival.activeChallenge
    ) {
      const ch = PHASE4_CHALLENGES.find((c) => c.id === nextState.survival.activeChallenge);
      const targetType = ch?.targetStructure ?? 'habitat';
      const placed = nextState.structures.find((s) => s.type === targetType);
      const fallbackSlot = getRecommendedOutpostSlots(nextState.selectedOutpostSite).find(
        (sl) => sl.type === targetType
      );
      const bx = placed?.x ?? fallbackSlot?.x ?? 20;
      const bz = placed?.z ?? fallbackSlot?.z ?? 16;
      const by = getTerrainHeight(bx, bz);
      this.phase4BeaconRing.position.set(bx, by + 0.14, bz);
      this.phase4BeaconBeam.position.set(bx, by + 3.8, bz);
      this.phase4BeaconRing.visible = true;
      this.phase4BeaconBeam.visible = true;
    } else {
      this.phase4BeaconRing.visible = false;
      this.phase4BeaconBeam.visible = false;
    }

    // Highlight blocking boulder if route hit one
    const blockedId = nextState.routePlanning.validation?.blockedByBoulderId;
    for (const [id, grp] of this.boulderGroups.entries()) {
      grp.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mat = (child as THREE.Mesh).material as THREE.MeshStandardMaterial;
          if (id === blockedId) {
            mat.emissive.setHex(0xef4444);
            mat.emissiveIntensity = 0.65;
          } else {
            mat.emissive.setHex(0x000000);
            mat.emissiveIntensity = 0;
          }
        }
      });
    }
  }

  private clearProposedSlots() {
    while (this.proposedSlotsGroup.children.length > 0) {
      const ch = this.proposedSlotsGroup.children[0];
      this.proposedSlotsGroup.remove(ch);
      ch.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        const mat = mesh.material;
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else if (mat) mat.dispose();
      });
    }
    this.lastProposedSig = '';
  }

  private rebuildProposedSlots(state: GameState) {
    if (state.phase !== 3 || state.screen !== 'playing') {
      if (this.proposedSlotsGroup.children.length > 0) {
        this.clearProposedSlots();
      }
      return;
    }

    const placedTypes = state.structures
      .map((s) => s.type)
      .sort()
      .join(',');
    const sig = `${state.selectedOutpostSite ?? 'ridge_haven'}::${state.selectedBuildType ?? 'none'}::${placedTypes}`;
    if (sig === this.lastProposedSig) return;

    this.clearProposedSlots();
    this.lastProposedSig = sig;

    const placedSet = new Set(state.structures.map((s) => s.type));
    const slots = getRecommendedOutpostSlots(state.selectedOutpostSite);

    for (const slot of slots) {
      if (placedSet.has(slot.type)) continue;
      const isSelected = state.selectedBuildType === slot.type;
      const color = isSelected ? 0x22d3ee : 0x38bdf8;
      const rad = slot.type === 'habitat' ? 2.45 : 1.45;
      const y = getTerrainHeight(slot.x, slot.z) + 0.14;

      const slotGrp = new THREE.Group();
      slotGrp.position.set(slot.x, y, slot.z);
      slotGrp.userData.proposedSlotType = slot.type;
      slotGrp.userData.proposedSlotX = slot.x;
      slotGrp.userData.proposedSlotZ = slot.z;
      slotGrp.userData.isSelectedSlot = isSelected;

      // Dotted perimeter circle via LineDashedMaterial
      const pts: THREE.Vector3[] = [];
      const segs = 32;
      for (let i = 0; i < segs; i++) {
        const ang = (i / segs) * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(ang) * rad, 0, Math.sin(ang) * rad));
      }
      const lineGeo = new THREE.BufferGeometry().setFromPoints(pts);
      const lineMat = new THREE.LineDashedMaterial({
        color,
        dashSize: 0.48,
        gapSize: 0.34,
        transparent: true,
        opacity: isSelected ? 0.98 : 0.65,
      });
      const loop = new THREE.LineLoop(lineGeo, lineMat);
      loop.computeLineDistances();
      slotGrp.add(loop);

      // Rich type-specific wireframe silhouette preview
      const previewMat = new THREE.MeshBasicMaterial({
        color,
        wireframe: true,
        transparent: true,
        opacity: isSelected ? 0.55 : 0.25,
      });
      if (slot.type === 'habitat') {
        const baseMesh = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.95, 1.05, 14), previewMat);
        baseMesh.position.y = 0.52;
        const domeMesh = new THREE.Mesh(
          new THREE.SphereGeometry(1.75, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.5),
          previewMat
        );
        domeMesh.position.y = 1.02;
        slotGrp.add(baseMesh, domeMesh);
      } else if (slot.type === 'solar') {
        const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 1.3, 8), previewMat);
        mast.position.y = 0.65;
        const panel = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.08, 1.05), previewMat);
        panel.position.y = 1.35;
        panel.rotation.x = 0.42;
        slotGrp.add(mast, panel);
      } else if (slot.type === 'water') {
        for (const ox of [-0.45, 0.45]) {
          const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 1.35, 10), previewMat);
          tank.position.set(ox, 0.7, 0);
          slotGrp.add(tank);
        }
      } else if (slot.type === 'battery') {
        const pack = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.9, 1.05), previewMat);
        pack.position.y = 0.45;
        slotGrp.add(pack);
      } else if (slot.type === 'air' || slot.type === 'oxygen') {
        const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.72, 1.35, 12), previewMat);
        cyl.position.y = 0.68;
        const cap = new THREE.Mesh(new THREE.SphereGeometry(0.65, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.5), previewMat);
        cap.position.y = 1.32;
        slotGrp.add(cyl, cap);
      } else {
        const box = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.1, 0.95), previewMat);
        box.position.y = 0.55;
        slotGrp.add(box);
      }

      this.proposedSlotsGroup.add(slotGrp);
    }
  }

  private clearBuildGhost() {
    if (this.buildGhostGroup) {
      this.scene.remove(this.buildGhostGroup);
      this.buildGhostGroup = null;
    }
    if (this.buildGhostRing) {
      this.scene.remove(this.buildGhostRing);
      this.buildGhostRing = null;
    }
    this.buildGhostType = null;
  }

  public triggerScanAnimation() {
    this.scanTimer = 1.35;
    this.rover.setMood('scanning');
  }

  public triggerDrillAnimation() {
    this.drillTimer = 1.5;
    this.rover.setMood('curious');
    this.spawnDustBurst(this.rover.root.position.x, this.rover.root.position.y, this.rover.root.position.z, 10, 1.3);
  }

  public triggerScoopAnimation() {
    this.scoopTimer = 1.5;
    this.rover.setMood('curious');
    this.spawnDustBurst(this.rover.root.position.x, this.rover.root.position.y, this.rover.root.position.z, 8, 1.0);
  }

  public triggerVictoryReaction() {
    this.jumpReactTimer = 1.6;
    this.rover.setMood('victory');
  }

  public setTouchDrive(forward: number, turn: number) {
    this.touchMoveVec.forward = forward;
    this.touchMoveVec.turn = turn;
  }

  public zoomBy(deltaFactor: number) {
    const offset = _v1.copy(this.camera.position).sub(this.controls.target);
    const len = THREE.MathUtils.clamp(offset.length() * deltaFactor, 4, 55);
    offset.setLength(len);
    this.camera.position.copy(this.controls.target).add(offset);
    this.controls.update();
    this.callbacks.onCameraAction('zoom');
  }

  private applyCameraModeInstantHint(mode: CameraMode) {
    const rx = this.rover.root.position.x;
    const ry = this.rover.root.position.y;
    const rz = this.rover.root.position.z;
    if (mode === 'topDown') {
      this.controls.target.set(rx, ry, rz);
      this.camera.position.set(rx, ry + 38, rz + 4);
    } else if (mode === 'routePlan') {
      this.controls.target.set(rx, ry, rz - 4);
      this.camera.position.set(rx + 6, ry + 24, rz + 20);
    } else if (mode === 'follow') {
      this.controls.target.set(rx, ry + 0.9, rz);
      const backX = rx - Math.sin(this.rover.root.rotation.y) * 9;
      const backZ = rz - Math.cos(this.rover.root.rotation.y) * 9;
      this.camera.position.set(backX, ry + 5.5, backZ);
    }
  }

  public focusCandidateSite(x: number, z: number) {
    const sy = getTerrainHeight(x, z);
    this.controls.target.set(x, sy + 0.8, z);
    this.camera.position.set(x + 11.5, sy + 9.5, z + 12.5);
    this.controls.update();
    this.callbacks.onCameraAction('zoom');
  }

  public focusStationPoint(x: number, z: number) {
    let ax = x - 2.6;
    let az = z + 2.6;
    const rad = Math.hypot(ax, az);
    if (rad > 43) {
      ax = (ax / rad) * 43;
      az = (az / rad) * 43;
    }
    const ay = getTerrainHeight(ax, az);
    const heading = Math.atan2(x - ax, z - az);
    this.rover.root.position.set(ax, ay, az);
    this.rover.root.rotation.y = heading;
    this.jumpReactTimer = 0.75;
    this.controls.target.set(x, getTerrainHeight(x, z) + 0.9, z);
    this.camera.position.set(ax - Math.sin(heading) * 7.5, ay + 5.2, az - Math.cos(heading) * 7.5);
    this.controls.update();
    this.callbacks.onRoverStep({
      x: ax,
      y: ay,
      z: az,
      headingRad: heading,
      speed: 0,
      animState: 'idle',
      distanceDelta: 0.25,
      inCrater: isInShadowedCrater(ax, az),
      onLooseRegolith: isOnLooseRegolith(ax, az),
      dustDelta: 0,
      energyDelta: 0,
    });
  }

  private addPlacedStructureMesh(s: PlacedStructure) {
    const mesh = createStructureModel(
      s.type,
      this.shadowTex,
      this.maxAnisotropy,
      s.damaged,
      s.status ?? (s.connectedToHabitat ? 'connected' : 'needs_attention')
    );
    mesh.userData.structureId = s.id;
    mesh.userData.inspectPayload = {
      kind: s.type,
      title: STRUCTURES[s.type]?.name ?? s.type,
      badge: 'Outpost Module',
      x: s.x,
      z: s.z,
      structureId: s.id,
    };
    mesh.position.set(s.x, getTerrainHeight(s.x, s.z), s.z);
    mesh.rotation.y = THREE.MathUtils.degToRad(s.rotationDeg);
    const deployGrp = mesh.userData.deployGroup as THREE.Group | undefined;
    if (deployGrp) deployGrp.scale.set(1, 0.15, 1);
    this.structureGroup.add(mesh);
    this.placedStructureMeshes.set(s.id, { group: mesh, deployProgress: 0 });
  }

  private rebuildConnectionMeshes(
    structures: PlacedStructure[],
    connections: OutpostConnection[]
  ) {
    while (this.connectionGroup.children.length > 0) {
      const ch = this.connectionGroup.children[0] as THREE.Mesh;
      this.connectionGroup.remove(ch);
      ch.geometry?.dispose();
      const mat = ch.material;
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
      else if (mat) mat.dispose();
    }
    this.connectionBeads = [];

    const byId = new Map(structures.map((s) => [s.id, s]));
    connections.forEach((c, idx) => {
      const a = byId.get(c.fromId);
      const b = byId.get(c.toId);
      if (!a || !b) return;
      const ax = a.x;
      const az = a.z;
      const ay = getTerrainHeight(ax, az) + 0.45;
      const bx = b.x;
      const bz = b.z;
      const by = getTerrainHeight(bx, bz) + 0.45;
      const mx = (ax + bx) * 0.5;
      const mz = (az + bz) * 0.5;
      const my = Math.max(ay, by, getTerrainHeight(mx, mz) + 0.55);

      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(ax, ay, az),
        new THREE.Vector3(mx, my, mz),
        new THREE.Vector3(bx, by, bz),
      ]);
      const geo = new THREE.TubeGeometry(curve, 16, 0.11, 8, false);
      const color =
        c.status === 'offline'
          ? 0xef4444
          : c.status === 'needs_attention'
          ? 0xfbbf24
          : c.kind === 'power'
          ? 0xf59e0b
          : c.kind === 'water'
          ? 0x38bdf8
          : 0x34d399;
      const mat = new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.55,
        roughness: 0.35,
        metalness: 0.5,
      });
      this.connectionGroup.add(new THREE.Mesh(geo, mat));

      // Two glowing flow beads per connected/active cable
      const isFlowing = c.status !== 'offline';
      for (let k = 0; k < 2; k++) {
        const beadGeo = new THREE.SphereGeometry(0.18, 10, 10);
        const beadMat = new THREE.MeshBasicMaterial({
          color: c.status === 'needs_attention' ? 0xfef08a : color,
          transparent: true,
          opacity: isFlowing ? 0.95 : 0.25,
        });
        const bead = new THREE.Mesh(beadGeo, beadMat);
        bead.position.copy(curve.getPoint((k * 0.5 + idx * 0.17) % 1));
        this.connectionGroup.add(bead);
        this.connectionBeads.push({
          mesh: bead,
          curve,
          phase: (k * 0.5 + idx * 0.21) % 1,
          active: isFlowing,
        });
      }
    });
  }

  private rebuildRouteMeshes(state: GameState) {
    if (this.routeValidMesh) {
      this.routeGroup.remove(this.routeValidMesh);
      this.routeValidMesh.geometry.dispose();
      this.routeValidMesh = null;
    }
    if (this.routeInvalidMesh) {
      this.routeGroup.remove(this.routeInvalidMesh);
      this.routeInvalidMesh.geometry.dispose();
      this.routeInvalidMesh = null;
    }

    const validation = state.routePlanning.validation;
    const pts: PathPoint3D[] =
      validation?.sampledPoints ??
      state.routePlanning.rawPoints.map((p) => ({
        x: p.x,
        y: getTerrainHeight(p.x, p.z),
        z: p.z,
        slopeDeg: 0,
        valid: true,
      }));

    if (pts.length < 2) {
      this.routePinStart.visible = false;
      this.routePinEnd.visible = false;
      return;
    }

    const validVecs: THREE.Vector3[] = [];
    const invalidVecs: THREE.Vector3[] = [];
    for (const p of pts) {
      const vec = new THREE.Vector3(p.x, p.y + 0.18, p.z);
      if (p.valid) validVecs.push(vec);
      else invalidVecs.push(vec);
    }

    if (validVecs.length >= 2) {
      const curve = new THREE.CatmullRomCurve3(validVecs);
      const tube = new THREE.TubeGeometry(curve, Math.max(12, validVecs.length * 2), 0.16, 8, false);
      const mat = new THREE.MeshBasicMaterial({
        color: validation?.valid ? 0x34d399 : 0x38bdf8,
      });
      this.routeValidMesh = new THREE.Mesh(tube, mat);
      this.routeGroup.add(this.routeValidMesh);
    }

    if (invalidVecs.length >= 2) {
      const curve = new THREE.CatmullRomCurve3(invalidVecs);
      const tube = new THREE.TubeGeometry(curve, Math.max(8, invalidVecs.length * 2), 0.21, 8, false);
      const mat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
      this.routeInvalidMesh = new THREE.Mesh(tube, mat);
      this.routeGroup.add(this.routeInvalidMesh);
    }

    const first = pts[0];
    const last = pts[pts.length - 1];
    this.routePinStart.position.set(first.x, first.y + 0.1, first.z);
    this.routePinStart.visible = true;
    this.routePinEnd.position.set(last.x, last.y + 0.65, last.z);
    this.routePinEnd.visible = true;
  }

  private raycastTerrain(clientX: number, clientY: number): THREE.Vector3 | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    _ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    _ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(_ndc, this.camera);
    const hits = this.raycaster.intersectObject(this.terrainMesh, false);
    return hits.length > 0 ? hits[0].point : null;
  }

  private raycastStructureId(clientX: number, clientY: number): string | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    _ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    _ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(_ndc, this.camera);
    const hits = this.raycaster.intersectObjects(this.structureGroup.children, true);
    if (hits.length === 0) return null;
    let obj: THREE.Object3D | null = hits[0].object;
    while (obj) {
      if (obj.userData?.structureId) return String(obj.userData.structureId);
      obj = obj.parent;
    }
    return null;
  }

  private raycastInspectable(clientX: number, clientY: number): {
    kind: string;
    title: string;
    badge: string;
    x: number;
    z: number;
    structureId?: string;
  } | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    _ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    _ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(_ndc, this.camera);

    const candidates: THREE.Object3D[] = [
      ...this.structureGroup.children,
      ...Array.from(this.targetGroups.values()),
      ...Array.from(this.boulderGroups.values()),
      this.rover.root,
      ...this.craterRings,
    ];
    const hits = this.raycaster.intersectObjects(candidates, true);
    if (hits.length === 0) return null;
    let obj: THREE.Object3D | null = hits[0].object;
    while (obj) {
      if (obj.userData?.inspectPayload) {
        return obj.userData.inspectPayload as {
          kind: string;
          title: string;
          badge: string;
          x: number;
          z: number;
          structureId?: string;
        };
      }
      obj = obj.parent;
    }
    return null;
  }

  private raycastProposedSlot(clientX: number, clientY: number): { x: number; z: number } | null {
    if (this.proposedSlotsGroup.children.length === 0) return null;
    const rect = this.renderer.domElement.getBoundingClientRect();
    _ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    _ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(_ndc, this.camera);
    const hits = this.raycaster.intersectObjects(this.proposedSlotsGroup.children, true);
    if (hits.length === 0) return null;
    let obj: THREE.Object3D | null = hits[0].object;
    while (obj) {
      if (typeof obj.userData?.proposedSlotX === 'number' && typeof obj.userData?.proposedSlotZ === 'number') {
        return { x: obj.userData.proposedSlotX, z: obj.userData.proposedSlotZ };
      }
      obj = obj.parent;
    }
    return null;
  }

  private bindEvents() {
    const dom = this.renderer.domElement;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      this.keysHeld.add(e.code);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      this.keysHeld.delete(e.code);
    };
    const onBlur = () => {
      this.keysHeld.clear();
      this.touchMoveVec.forward = 0;
      this.touchMoveVec.turn = 0;
      this.isPointerDrawing = false;
    };

    const onPointerDown = (e: PointerEvent) => {
      this.pointerDownPos = { x: e.clientX, y: e.clientY };

      if (this.lastState.routePlanning.isDrawingMode && e.button === 0) {
        const hit = this.raycastTerrain(e.clientX, e.clientY);
        if (hit) {
          this.isPointerDrawing = true;
          this.drawnPoints = [{ x: hit.x, z: hit.z }];
          dom.setPointerCapture?.(e.pointerId);
          this.callbacks.onRouteDrawSample([...this.drawnPoints], false);
        }
        return;
      }

      if (this.lastState.phase === 3 && this.lastState.screen === 'playing' && e.button === 0) {
        if (this.lastState.buildMode === 'connect') {
          const hitStructId = this.raycastStructureId(e.clientX, e.clientY);
          if (hitStructId && this.callbacks.onStructureClick) {
            this.callbacks.onStructureClick(hitStructId);
          }
          return;
        }
        if (this.lastState.selectedBuildType) {
          const slotHit = this.raycastProposedSlot(e.clientX, e.clientY);
          if (slotHit) {
            this.callbacks.onTerrainClickForBuild(slotHit.x, slotHit.z);
            return;
          }
          const hit = this.raycastTerrain(e.clientX, e.clientY);
          if (hit) {
            this.callbacks.onTerrainClickForBuild(hit.x, hit.z);
          }
        }
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      const now = performance.now();
      if (this.isPointerDrawing && this.lastState.routePlanning.isDrawingMode) {
        if (now - this.lastDrawSampleTime < 40) return;
        this.lastDrawSampleTime = now;
        const hit = this.raycastTerrain(e.clientX, e.clientY);
        if (hit) {
          const last = this.drawnPoints[this.drawnPoints.length - 1];
          if (!last || Math.hypot(hit.x - last.x, hit.z - last.z) >= 0.9) {
            this.drawnPoints.push({ x: hit.x, z: hit.z });
            this.callbacks.onRouteDrawSample([...this.drawnPoints], false);
          }
        }
        return;
      }

      if (this.buildGhostGroup && this.lastState.phase === 3 && this.lastState.selectedBuildType) {
        if (now - this.lastDrawSampleTime < 45) return;
        this.lastDrawSampleTime = now;
        const hit = this.raycastTerrain(e.clientX, e.clientY);
        if (hit) {
          const y = getTerrainHeight(hit.x, hit.z);
          this.buildGhostGroup.position.set(hit.x, y, hit.z);
          if (this.buildGhostRing) {
            this.buildGhostRing.position.set(hit.x, y + 0.08, hit.z);
            const suit = evaluatePlacementSuitability(
              this.lastState.selectedBuildType,
              hit.x,
              hit.z,
              this.lastState.structures
            );
            const ringMat = this.buildGhostRing.material as THREE.MeshBasicMaterial;
            ringMat.color.setHex(
              suit.grade === 'great' ? 0x34d399 : suit.grade === 'okay' ? 0xfbbf24 : 0xef4444
            );
          }
        }
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      if (this.isPointerDrawing) {
        this.isPointerDrawing = false;
        dom.releasePointerCapture?.(e.pointerId);
        this.callbacks.onRouteDrawSample([...this.drawnPoints], true);
        return;
      }

      if (
        e.button === 0 &&
        (this.lastState.screen === 'playing' || this.lastState.screen === 'tutorial') &&
        !this.lastState.routePlanning.isDrawingMode &&
        !(this.lastState.phase === 3 && this.lastState.buildMode === 'place')
      ) {
        const movedPx = Math.hypot(e.clientX - this.pointerDownPos.x, e.clientY - this.pointerDownPos.y);
        if (movedPx < 6) {
          const inspected = this.raycastInspectable(e.clientX, e.clientY);
          if (inspected) {
            if (this.lastState.phase === 4 && inspected.structureId && this.callbacks.onStructureClick) {
              this.callbacks.onStructureClick(inspected.structureId);
            }
            this.callbacks.onInspectSceneObject?.(inspected);
          }
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    dom.addEventListener('pointerdown', onPointerDown);
    dom.addEventListener('pointermove', onPointerMove);
    dom.addEventListener('pointerup', onPointerUp);

    this.cleanupEvents = () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      dom.removeEventListener('pointerdown', onPointerDown);
      dom.removeEventListener('pointermove', onPointerMove);
      dom.removeEventListener('pointerup', onPointerUp);
    };
  }

  private cleanupEvents: () => void = () => {};

  private handleResize() {
    if (this.disposed) return;
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  private scheduleNextFrame() {
    if (this.disposed) return;
    if (this.isSoftwareGl) {
      this.afterDraw(() => this.tick());
    } else {
      this.frameId = requestAnimationFrame(() => this.tick());
    }
  }

  private afterDraw(cb: () => void) {
    try {
      const gl = this.renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (this.disposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          this.frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          this.frameId = window.setTimeout(cb, 24);
        }
      };
      this.frameId = window.setTimeout(poll, 5);
    } catch {
      this.frameId = window.setTimeout(cb, 24);
    }
  }

  private tick() {
    if (this.disposed) return;

    const nowMs = performance.now();
    const rawDt = (nowMs - this.lastTimeMs) / 1000;
    this.lastTimeMs = nowMs;
    const maxDt = this.isSoftwareGl ? 0.1 : 0.05;
    const dt = Math.min(Math.max(rawDt, 0.001), maxDt);
    this.elapsedSec += dt;

    this.updateScene(dt);
    this.renderer.render(this.scene, this.camera);
    this.scheduleNextFrame();
  }

  private updateScene(dt: number) {
    const state = this.lastState;
    const reduced = state.audio.reducedMotion;

    if (this.earthMesh && this.earthCloudMesh) {
      this.earthMesh.rotation.y += dt * 0.045;
      this.earthCloudMesh.rotation.y += dt * 0.072;
    }
    if (this.moonIntroMesh) {
      this.moonIntroMesh.rotation.y += dt * 0.032;
    }
    if (this.distantEarthMesh) {
      this.distantEarthMesh.rotation.y += dt * 0.022;
    }
    if (this.distantEarthCloudMesh) {
      this.distantEarthCloudMesh.rotation.y += dt * 0.038;
    }

    // Floating animation on target beacons
    for (const grp of this.targetGroups.values()) {
      const crystal = grp.children[2];
      if (crystal && !reduced) {
        crystal.rotation.y += dt * 1.4;
      }
    }

    // Smooth unfolding animation for newly built outpost structures
    for (const entry of this.placedStructureMeshes.values()) {
      if (entry.deployProgress < 1) {
        entry.deployProgress = Math.min(1, entry.deployProgress + dt * 1.5);
        const ease = 1 - Math.pow(1 - entry.deployProgress, 3);
        const deployGrp = entry.group.userData.deployGroup as THREE.Group | undefined;
        if (deployGrp) {
          deployGrp.scale.set(1, 0.15 + 0.85 * ease, 1);
        }
        const wings = entry.group.userData.solarWings as THREE.Mesh[] | undefined;
        if (wings) {
          for (const w of wings) {
            w.scale.x = 0.15 + 0.85 * ease;
          }
        }
      }
    }

    // Animate solar storm streaks subtly if active
    if (this.solarStormGroup.visible && !reduced) {
      for (const child of this.solarStormGroup.children) {
        child.position.y -= dt * 8;
        if (child.position.y < 1) child.position.y = 22;
      }
    }

    // Update dust particle pool
    let dustDirty = false;
    for (let i = 0; i < DUST_POOL_SIZE; i++) {
      const p = this.dustParticles[i];
      if (!p.active) continue;
      p.age += dt;
      if (p.age >= p.maxAge) {
        p.active = false;
        _mat4.makeScale(0, 0, 0);
        this.dustMesh.setMatrixAt(i, _mat4);
        dustDirty = true;
        continue;
      }
      // Lunar gravity ~ 1.62 m/s^2 (no wind drift!)
      p.vy -= 2.2 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      const groundY = getTerrainHeight(p.x, p.z);
      if (p.y < groundY + 0.05) {
        p.y = groundY + 0.05;
        p.vx *= 0.4;
        p.vz *= 0.4;
        p.vy = 0;
      }
      const lifeRatio = 1 - p.age / p.maxAge;
      const sc = p.scale * lifeRatio;
      _v1.set(p.x, p.y, p.z);
      _v2.set(sc, sc, sc);
      _quat.identity();
      _mat4.compose(_v1, _quat, _v2);
      this.dustMesh.setMatrixAt(i, _mat4);
      dustDirty = true;
    }
    if (dustDirty) {
      this.dustMesh.instanceMatrix.needsUpdate = true;
    }

    // Title screen framing (front-quarter rover portrait with Earth rising in the lunar sky)
    if (state.screen === 'title') {
      const angle = 0.42 + this.elapsedSec * 0.08;
      const rx = this.rover.root.position.x;
      const ry = this.rover.root.position.y;
      const rz = this.rover.root.position.z;
      this.camera.position.set(rx + Math.sin(angle) * 7.4, ry + 2.35, rz + Math.cos(angle) * 7.4);
      this.camera.lookAt(rx - 0.8, ry + 1.45, rz - 4.0);
      this.rover.headPivot.rotation.y = Math.sin(this.elapsedSec * 0.9) * 0.35;
      return;
    }

    // 6-scene Continuous Cinematic Intro (zero abrupt cuts!)
    if (state.screen === 'intro') {
      this.updateIntroCamera(dt, state.introScene, state.introTourTopicIndex, state.roverPartIndex);
      return;
    } else {
      this.tourHighlightRing.visible = false;
    }

    if (state.screen === 'paused') {
      return;
    }

    // Pulse active connection flow & animate sliding energy beads in Phase 3, 4 & Victory celebration
    if ((state.phase >= 3 || state.screen === 'victory') && !reduced) {
      for (const ch of this.connectionGroup.children) {
        const mat = (ch as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
        if (mat && 'emissiveIntensity' in mat) {
          mat.emissiveIntensity = 0.45 + 0.3 * Math.sin(this.elapsedSec * 4.5);
        }
      }
      for (const bead of this.connectionBeads) {
        if (!bead.active) continue;
        bead.phase = (bead.phase + dt * 0.42) % 1;
        bead.curve.getPoint(bead.phase, _v3);
        bead.mesh.position.copy(_v3);
      }
      if (this.phase4BeaconRing.visible) {
        const sc = 1 + 0.14 * Math.sin(this.elapsedSec * 4);
        this.phase4BeaconRing.scale.setScalar(sc);
        (this.phase4BeaconBeam.material as THREE.MeshBasicMaterial).opacity =
          0.18 + 0.12 * Math.sin(this.elapsedSec * 4);
      }
      for (const slotGrp of this.proposedSlotsGroup.children) {
        if (slotGrp.userData?.isSelectedSlot) {
          slotGrp.scale.setScalar(1 + 0.06 * Math.sin(this.elapsedSec * 4.2));
        }
      }
    }

    if (state.screen === 'victory') {
      this.updateVictoryCamera(dt, state);
      this.updateProjectedLabels(state);
      return;
    }

    this.updateRoverMovementAndAnim(dt, state);
    this.updateActiveCamera(dt, state);
    this.updateProjectedLabels(state);
  }

  private updateVictoryCamera(dt: number, state: GameState) {
    // Frame the player's actual constructed outpost + rover near Habitat turning warmly toward the camera
    const hab = state.structures.find((s) => s.type === 'habitat') ?? state.structures[0];
    const centerX = hab ? hab.x : ROVER_SPAWN.x;
    const centerZ = hab ? hab.z : ROVER_SPAWN.z;
    const centerY = getTerrainHeight(centerX, centerZ);

    // Park rover just beside the Habitat/outpost and face camera joyfully
    const parkX = centerX - 3.6;
    const parkZ = centerZ + 3.2;
    const parkY = getTerrainHeight(parkX, parkZ);
    this.rover.root.position.set(parkX, parkY, parkZ);

    const orbitAngle = this.elapsedSec * 0.24 + 0.6;
    const radius = 15.5;
    const camX = centerX + Math.sin(orbitAngle) * radius;
    const camZ = centerZ + Math.cos(orbitAngle) * radius;
    const camY = Math.max(centerY + 7.2, getTerrainHeight(camX, camZ) + 4.8);

    const alpha = 1 - Math.exp(-2.4 * dt);
    _v1.set(camX, camY, camZ);
    _v2.set(centerX, centerY + 1.4, centerZ);
    this.camera.position.lerp(_v1, alpha);
    this.controls.target.lerp(_v2, alpha);
    this.camera.lookAt(this.controls.target);

    // Turn rover toward camera with celebratory headlights, gentle bounce & head wave
    const faceAngle = Math.atan2(this.camera.position.x - parkX, this.camera.position.z - parkZ);
    this.rover.root.rotation.y = faceAngle;
    this.rover.setMood('victory', false);
    if (!state.audio.reducedMotion) {
      this.rover.headPivot.rotation.y = Math.sin(this.elapsedSec * 2.5) * 0.35;
      this.rover.bodyGroup.position.y = 0.55 + Math.abs(Math.sin(this.elapsedSec * 3.8)) * 0.14;
      this.rover.mastPivot.rotation.y = Math.sin(this.elapsedSec * 1.6) * 0.22;
    } else {
      this.rover.bodyGroup.position.y = 0.55;
    }
  }

  private updateProjectedLabels(state: GameState) {
    if (!this.callbacks.onProjectedLabels) return;
    if (state.screen !== 'playing' && state.screen !== 'tutorial') {
      if (this.lastEmittedLabels.length > 0) {
        this.lastEmittedLabels = [];
        this.callbacks.onProjectedLabels([]);
      }
      return;
    }

    const now = performance.now();
    if (now - this.lastLabelEmitTime < 75) return;
    this.lastLabelEmitTime = now;

    const candidates: Array<{
      id: string;
      label: string;
      sub: string;
      wx: number;
      wy: number;
      wz: number;
      kind: SceneObjectLabel['kind'];
      targetStructureId?: string;
      proposedType?: StructureType;
    }> = [];

    // 1. ASTRO Rover
    const rx = this.rover.root.position.x;
    const ry = this.rover.root.position.y;
    const rz = this.rover.root.position.z;
    candidates.push({
      id: 'lbl_rover',
      label: state.roverName || 'ASTRO',
      sub: state.rover.headlightsOn ? 'Lights On' : 'Rover',
      wx: rx,
      wy: ry + 2.25,
      wz: rz,
      kind: 'rover',
    });

    // 2. Phase-relevant key objects (capped cleanly to prevent clutter)
    if (state.phase === 1) {
      const nextTarget =
        ROCK_TARGETS.find(
          (t) =>
            (t.kind === 'basalt' || t.kind === 'anorthosite' || t.kind === 'hydrogen_clue') &&
            !state.scannedTargetIds.includes(t.id)
        ) ?? ROCK_TARGETS[0];
      if (nextTarget) {
        candidates.push({
          id: `lbl_${nextTarget.id}`,
          label: nextTarget.name,
          sub: 'Scan Target',
          wx: nextTarget.x,
          wy: getTerrainHeight(nextTarget.x, nextTarget.z) + 2.1,
          wz: nextTarget.z,
          kind: 'target',
        });
      }
      if (!state.selectedOutpostSite && state.scannedTargetIds.length >= 2) {
        for (const site of OUTPOST_SITES) {
          candidates.push({
            id: `lbl_${site.id}`,
            label: site.name,
            sub: `${site.sunlightScore}% Sunlight`,
            wx: site.x,
            wy: getTerrainHeight(site.x, site.z) + 2.6,
            wz: site.z,
            kind: 'site',
          });
        }
      }
    } else if (state.phase === 2) {
      const nextGather = ROCK_TARGETS.find(
        (t) =>
          (t.kind === 'regolith_loose' || t.kind === 'hydrogen_clue' || t.kind === 'sunlight_beacon') &&
          !state.collectedTargetIds.includes(t.id)
      );
      if (nextGather) {
        candidates.push({
          id: `lbl_${nextGather.id}`,
          label: nextGather.name,
          sub: nextGather.kind === 'hydrogen_clue' ? 'Drill Ice' : nextGather.kind === 'sunlight_beacon' ? 'Align Solar' : 'Scoop Soil',
          wx: nextGather.x,
          wy: getTerrainHeight(nextGather.x, nextGather.z) + 2.15,
          wz: nextGather.z,
          kind: 'target',
        });
      }
    } else if (state.phase === 3) {
      const placedSet = new Set(state.structures.map((s) => s.type));
      const slots = getRecommendedOutpostSlots(state.selectedOutpostSite);
      for (const s of state.structures.slice(0, 4)) {
        const info = STRUCTURES[s.type];
        candidates.push({
          id: `lbl_st_${s.id}`,
          label: info?.name ?? s.type,
          sub: s.connectedToHabitat ? 'Connected' : s.type === 'habitat' ? 'Core Hub' : 'Connect Cable',
          wx: s.x,
          wy: getTerrainHeight(s.x, s.z) + 2.35,
          wz: s.z,
          kind: 'structure',
          targetStructureId: s.id,
        });
      }
      if (state.selectedBuildType && !placedSet.has(state.selectedBuildType)) {
        const slot = slots.find((sl) => sl.type === state.selectedBuildType);
        if (slot) {
          candidates.push({
            id: `lbl_slot_${slot.type}`,
            label: `${STRUCTURES[slot.type]?.name ?? slot.type} Slot`,
            sub: 'Proposed Spot',
            wx: slot.x,
            wy: getTerrainHeight(slot.x, slot.z) + 2.25,
            wz: slot.z,
            kind: 'proposed',
            proposedType: slot.type,
          });
        }
      }
    } else if (state.phase === 4) {
      const activeCh = PHASE4_CHALLENGES.find((c) => c.id === state.survival.activeChallenge);
      const targetType = activeCh?.targetStructure ?? 'habitat';
      const targetSt = state.structures.find((s) => s.type === targetType) ?? state.structures[0];
      if (targetSt) {
        candidates.push({
          id: `lbl_p4_${targetSt.id}`,
          label: STRUCTURES[targetSt.type]?.name ?? targetSt.type,
          sub: state.survival.stationVisited ? 'Checking Station' : 'Drive / Go Here',
          wx: targetSt.x,
          wy: getTerrainHeight(targetSt.x, targetSt.z) + 2.5,
          wz: targetSt.z,
          kind: 'structure',
          targetStructureId: targetSt.id,
        });
      }
    }

    const projected: SceneObjectLabel[] = [];
    for (const c of candidates) {
      _v1.set(c.wx, c.wy, c.wz);
      _v1.project(this.camera);
      // In front of camera and inside safe HUD framing
      if (_v1.z > 1 || _v1.z < -1) continue;
      const xPct = (_v1.x * 0.5 + 0.5) * 100;
      const yPct = (-_v1.y * 0.5 + 0.5) * 100;
      if (xPct < 8 || xPct > 92 || yPct < 14 || yPct > 78) continue;
      projected.push({
        id: c.id,
        label: c.label,
        sub: c.sub,
        xPct: Math.round(xPct * 10) / 10,
        yPct: Math.round(yPct * 10) / 10,
        kind: c.kind,
        worldX: c.wx,
        worldZ: c.wz,
        targetStructureId: c.targetStructureId,
        proposedType: c.proposedType,
      });
    }

    const changed =
      projected.length !== this.lastEmittedLabels.length ||
      projected.some((p, i) => {
        const prev = this.lastEmittedLabels[i];
        return (
          !prev ||
          prev.id !== p.id ||
          prev.sub !== p.sub ||
          Math.abs(prev.xPct - p.xPct) > 0.7 ||
          Math.abs(prev.yPct - p.yPct) > 0.7
        );
      });

    if (changed) {
      this.lastEmittedLabels = projected;
      this.callbacks.onProjectedLabels(projected);
    }
  }

  private updateIntroCamera(dt: number, sceneIdx: number, topicIdx: number, roverPartIdx: number) {
    let k = 1.65;
    this.tourHighlightRing.visible = false;

    if (this.moonIntroMesh) {
      const targetMoonX = sceneIdx === 0 ? 22.0 : 12.2;
      this.moonIntroMesh.position.x +=
        (targetMoonX - this.moonIntroMesh.position.x) * (1 - Math.exp(-2.4 * dt));
    }

    if (sceneIdx === 0) {
      // Scene 0: Introduce realistic Earth solo first with swirling clouds & sunlit atmospheric rim
      const portraitPull0 = this.camera.aspect < 0.85 ? (0.85 - this.camera.aspect) * 44 : 0;
      const drift = Math.sin(this.elapsedSec * 0.28) * 1.6;
      const lift = Math.cos(this.elapsedSec * 0.22) * 0.6;
      _v1.set(-9.5 + drift, 161.2 + lift, 8.5 + portraitPull0);
      _v2.copy(this.earthMesh.getWorldPosition(_v3));
      k = 1.65;
    } else if (sceneIdx === 1) {
      // Scene 1: Pull back cleanly so BOTH Earth & the 27.3%-scale Moon stay framed side-by-side without clipping
      const portraitPull = this.camera.aspect < 0.85 ? (0.85 - this.camera.aspect) * 128 : 0;
      const sweep = Math.sin(this.elapsedSec * 0.35) * 1.4;
      _v1.set(-1.0 + sweep, 160.8, 25.0 + portraitPull);
      _v2.set(-1.0, 160.2, -18.0);
      k = 1.45;
    } else if (sceneIdx === 2) {
      // Scene 2: 12-Topic Interactive Moon Tour - smoothly pan across South Pole features!
      this.introDescendProgress = Math.min(1, this.introDescendProgress + dt * 0.45);
      const topic = MOON_TOUR_TOPICS[topicIdx] ?? MOON_TOUR_TOPICS[0];
      const focus = topic.sceneFocus ?? { x: -4, z: -4, camOffsetX: 12, camOffsetY: 9, camOffsetZ: 14 };
      const fy = getTerrainHeight(focus.x, focus.z);
      const orbitSway = Math.sin(this.elapsedSec * 0.35) * 1.8;
      _v1.set(
        focus.x + focus.camOffsetX + orbitSway,
        fy + focus.camOffsetY + (1 - this.introDescendProgress) * 8,
        focus.z + focus.camOffsetZ
      );
      _v2.set(focus.x, fy + 0.8, focus.z);
      this.tourHighlightRing.visible = true;
      this.tourHighlightRing.position.set(focus.x, fy + 0.14, focus.z);
      const pulse = 1 + Math.sin(this.elapsedSec * 3.2) * 0.14;
      this.tourHighlightRing.scale.setScalar(pulse);
      k = 2.0;
    } else if (sceneIdx === 3) {
      // Scene 3: Panoramic sweep over mission zone
      const pan = Math.sin(this.elapsedSec * 0.32) * 5;
      _v1.set(20 + pan, 14.5, 24);
      _v2.set(2, 1, 4);
      k = 1.4;
    } else if (sceneIdx === 4) {
      // Scene 4: Dedicated Rover Intro & 7-Part Interactive Breakdown
      const groundY = getTerrainHeight(ROVER_SPAWN.x, ROVER_SPAWN.z);
      this.rover.root.position.set(ROVER_SPAWN.x, groundY, ROVER_SPAWN.z);
      const part = ROVER_PARTS[roverPartIdx] ?? ROVER_PARTS[0];
      _v1.set(
        ROVER_SPAWN.x + part.focusOffset.x,
        groundY + part.focusOffset.y,
        ROVER_SPAWN.z + part.focusOffset.z
      );
      _v2.set(ROVER_SPAWN.x, groundY + 0.75, ROVER_SPAWN.z);

      // Animate highlighted rover subsystem smoothly
      this.rover.scanCone.visible = part.id === 'instruments';
      this.rover.setHeadlights(part.id === 'instruments');
      this.rover.drillArm.rotation.x = part.id === 'arm' || part.id === 'drill' ? 0.35 + Math.sin(this.elapsedSec * 3) * 0.2 : 0;
      this.rover.mastPivot.rotation.y = part.id === 'camera' || part.id === 'antenna' ? Math.sin(this.elapsedSec * 2.2) * 0.45 : 0;
      for (const w of this.rover.wheels) {
        w.rotation.x = part.id === 'wheels' ? this.elapsedSec * 2.5 : 0;
      }
      this.tourHighlightRing.visible = true;
      this.tourHighlightRing.position.set(ROVER_SPAWN.x, groundY + 0.12, ROVER_SPAWN.z);
      this.tourHighlightRing.scale.setScalar(0.85 + Math.sin(this.elapsedSec * 3) * 0.08);
      k = 2.4;
    } else {
      // Scene 5: Smooth approach to ASTRO landing & wave
      this.rover.scanCone.visible = false;
      this.rover.setHeadlights(false);
      this.introLandingProgress = Math.min(1, this.introLandingProgress + dt * 0.85);
      const t = 1 - Math.pow(1 - this.introLandingProgress, 3);
      const groundY = getTerrainHeight(ROVER_SPAWN.x, ROVER_SPAWN.z);
      this.rover.root.position.set(ROVER_SPAWN.x, groundY + (1 - t) * 3.2, ROVER_SPAWN.z);
      if (this.introLandingProgress > 0.85 && this.introLandingProgress < 0.95) {
        this.spawnDustBurst(ROVER_SPAWN.x, groundY, ROVER_SPAWN.z, 8, 1.0);
      }
      this.rover.mastPivot.rotation.y = Math.sin(this.elapsedSec * 1.4) * 0.22;
      this.rover.headPivot.rotation.y = Math.sin(this.elapsedSec * 2.1) * 0.35;
      for (const w of this.rover.wheels) {
        w.rotation.x = Math.sin(this.elapsedSec * 2.4) * 0.35;
      }
      if (this.jumpReactTimer > 0) {
        this.jumpReactTimer -= dt;
        this.rover.bodyGroup.position.y = 0.55 + Math.abs(Math.sin(this.elapsedSec * 10)) * 0.22;
      } else {
        this.rover.bodyGroup.position.y = 0.55;
      }

      _v1.set(ROVER_SPAWN.x - 4.0, groundY + 2.55, ROVER_SPAWN.z - 6.8);
      _v2.set(ROVER_SPAWN.x - 0.9, groundY + 1.35, ROVER_SPAWN.z);
      k = 2.0;
    }

    const alpha = 1 - Math.exp(-k * dt);
    this.camera.position.lerp(_v1, alpha);
    this.controls.target.lerp(_v2, alpha);
    this.camera.lookAt(this.controls.target);
  }

  private updateRoverMovementAndAnim(dt: number, state: GameState) {
    let moveSpeed = 0;
    let steerTurn = 0;
    let animState: RoverAnimState = 'idle';

    const rx = this.rover.root.position.x;
    const rz = this.rover.root.position.z;
    const prevY = this.rover.root.position.y;
    let heading = this.rover.root.rotation.y;

    if (
      state.routePlanning.isExecuting &&
      !state.routePlanning.isPaused &&
      state.routePlanning.validation?.valid &&
      state.routePlanning.validation.sampledPoints.length > 1
    ) {
      const pts = state.routePlanning.validation.sampledPoints;
      while (
        this.currentRouteIndex < pts.length - 1 &&
        Math.hypot(pts[this.currentRouteIndex].x - rx, pts[this.currentRouteIndex].z - rz) < 1.1
      ) {
        this.currentRouteIndex++;
        this.callbacks.onRouteProgress(this.currentRouteIndex, false);
      }

      const targetPt = pts[Math.min(this.currentRouteIndex, pts.length - 1)];
      const dx = targetPt.x - rx;
      const dz = targetPt.z - rz;
      const dist = Math.hypot(dx, dz);
      const isFinalWaypoint = this.currentRouteIndex >= pts.length - 1;

      if (dist < (isFinalWaypoint ? 0.75 : 1.1)) {
        if (!isFinalWaypoint) {
          this.currentRouteIndex++;
          this.callbacks.onRouteProgress(this.currentRouteIndex, false);
        } else {
          this.callbacks.onRouteProgress(this.currentRouteIndex, true);
        }
      } else {
        const desiredAngle = Math.atan2(dx, dz);
        let diff = desiredAngle - heading;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;

        const maxTurnRate = Math.abs(diff) > 0.4 ? 4.2 : 2.8;
        heading += THREE.MathUtils.clamp(diff * 5.2 * dt, -maxTurnRate * dt, maxTurnRate * dt);
        steerTurn = THREE.MathUtils.clamp(diff, -0.5, 0.5);
        const alignFactor =
          Math.abs(diff) > 1.1 ? 0.12 : Math.max(0.2, Math.cos(Math.abs(diff) * 0.85));
        moveSpeed = 3.6 * alignFactor;
        animState = Math.abs(diff) > 0.3 ? 'turning' : 'driving';

        const aheadBoulder = checkDynamicObstacleAhead({ x: rx, z: rz }, heading);
        if (aheadBoulder) {
          moveSpeed = 0;
          animState = 'obstacle';
          this.cameraShakeTrauma = 0.45;
          this.callbacks.onDynamicObstacle(aheadBoulder.id);
        }
      }
    } else if (!state.routePlanning.isExecuting && !state.activePopup) {
      const fwd =
        (this.keysHeld.has('KeyW') || this.keysHeld.has('ArrowUp') ? 1 : 0) -
        (this.keysHeld.has('KeyS') || this.keysHeld.has('ArrowDown') ? 1 : 0) +
        this.touchMoveVec.forward;
      const turn =
        (this.keysHeld.has('KeyA') || this.keysHeld.has('ArrowLeft') ? 1 : 0) -
        (this.keysHeld.has('KeyD') || this.keysHeld.has('ArrowRight') ? 1 : 0) +
        this.touchMoveVec.turn;

      if (Math.abs(turn) > 0.05) {
        heading += turn * 2.1 * dt;
        steerTurn = turn * 0.45;
        animState = 'turning';
      }
      if (Math.abs(fwd) > 0.05) {
        moveSpeed = fwd * 3.8;
        animState = 'driving';
      }
    }

    let nextX = rx + Math.sin(heading) * moveSpeed * dt;
    let nextZ = rz + Math.cos(heading) * moveSpeed * dt;

    for (const b of BOULDERS) {
      const distB = Math.hypot(nextX - b.x, nextZ - b.z);
      if (distB < b.radius + 0.95) {
        nextX = rx;
        nextZ = rz;
        if (Math.abs(moveSpeed) > 0.2) {
          moveSpeed = 0;
          animState = 'obstacle';
          this.cameraShakeTrauma = Math.max(this.cameraShakeTrauma, 0.35);
          this.callbacks.onDynamicObstacle(b.id);
        }
        break;
      }
    }

    const radial = Math.hypot(nextX, nextZ);
    if (radial > 45) {
      nextX = (nextX / radial) * 45;
      nextZ = (nextZ / radial) * 45;
    }

    const nextY = getTerrainHeight(nextX, nextZ);
    const deltaDist = Math.hypot(nextX - rx, nextZ - rz);
    this.rover.root.position.set(nextX, nextY, nextZ);
    this.rover.root.rotation.y = heading;

    // Terrain attitude + independent left/right rocker-bogie wheel pitch articulation
    const norm = getTerrainNormal(nextX, nextZ);
    _v1.set(norm.nx, norm.ny, norm.nz);
    _quat.setFromUnitVectors(_up, _v1);
    _euler.setFromQuaternion(_quat, 'YXZ');
    this.rover.bodyGroup.rotation.x = THREE.MathUtils.damp(
      this.rover.bodyGroup.rotation.x,
      _euler.x * 0.78,
      8,
      dt
    );
    this.rover.bodyGroup.rotation.z = THREE.MathUtils.damp(
      this.rover.bodyGroup.rotation.z,
      _euler.z * 0.78,
      8,
      dt
    );

    const cosH = Math.cos(heading);
    const sinH = Math.sin(heading);
    const lfY = getTerrainHeight(nextX - cosH * 0.75 + sinH * 0.65, nextZ + sinH * 0.75 + cosH * 0.65);
    const lrY = getTerrainHeight(nextX - cosH * 0.75 - sinH * 0.65, nextZ + sinH * 0.75 - cosH * 0.65);
    const rfY = getTerrainHeight(nextX + cosH * 0.75 + sinH * 0.65, nextZ - sinH * 0.75 + cosH * 0.65);
    const rrY = getTerrainHeight(nextX + cosH * 0.75 - sinH * 0.65, nextZ - sinH * 0.75 - cosH * 0.65);

    this.rover.bogieLeft.rotation.x = THREE.MathUtils.damp(
      this.rover.bogieLeft.rotation.x,
      THREE.MathUtils.clamp((lrY - lfY) * 0.35, -0.3, 0.3),
      10,
      dt
    );
    this.rover.bogieRight.rotation.x = THREE.MathUtils.damp(
      this.rover.bogieRight.rotation.x,
      THREE.MathUtils.clamp((rrY - rfY) * 0.35, -0.3, 0.3),
      10,
      dt
    );

    if (nextY - prevY > 0.01) animState = 'climbing';
    else if (nextY - prevY < -0.01) animState = 'descending';

    // Wheel rotation synchronized to actual travel distance
    const wheelSpin = (moveSpeed >= 0 ? 1 : -1) * (deltaDist / 0.24);
    for (const w of this.rover.wheels) {
      w.rotation.x += wheelSpin;
    }
    for (const sp of this.rover.frontSteerPivots) {
      sp.rotation.y = THREE.MathUtils.damp(sp.rotation.y, steerTurn * 0.45, 10, dt);
    }

    // Suspension ripple, electric wheel drive pulse SFX & natural dust burst
    const loose = isOnLooseRegolith(nextX, nextZ);
    if (deltaDist > 0.01) {
      this.rover.bodyGroup.position.y = 0.55 + Math.sin(this.elapsedSec * 14) * 0.025;
      audioEngine.playRoverDrivePulse(Math.min(1, Math.abs(moveSpeed) / 3.8), loose);
      if (loose || Math.random() < 0.25) {
        this.spawnDustBurst(nextX, nextY, nextZ, loose ? 3 : 1, loose ? 1.15 : 0.7);
      }
    } else {
      this.rover.bodyGroup.position.y = THREE.MathUtils.damp(this.rover.bodyGroup.position.y, 0.55, 8, dt);
    }

    // Scanning, drilling & scoop arm animations
    if (this.scanTimer > 0) {
      this.scanTimer -= dt;
      animState = 'scanning';
      this.rover.scanCone.visible = true;
      this.rover.headPivot.rotation.y = Math.sin(this.elapsedSec * 7) * 0.45;
    } else {
      this.rover.scanCone.visible = false;
      this.rover.headPivot.rotation.y = THREE.MathUtils.damp(
        this.rover.headPivot.rotation.y,
        steerTurn * 0.4,
        5,
        dt
      );
    }

    if (this.drillTimer > 0) {
      this.drillTimer -= dt;
      animState = 'drilling';
      this.rover.drillArm.rotation.x = 0.48 + Math.sin(this.elapsedSec * 20) * 0.1;
    } else if (this.scoopTimer > 0) {
      this.scoopTimer -= dt;
      animState = 'collecting';
      this.rover.drillArm.rotation.x = 0.55 * Math.sin((this.scoopTimer / 1.5) * Math.PI);
      this.rover.scoopPivot.rotation.x = -0.6 * Math.sin((this.scoopTimer / 1.5) * Math.PI);
    } else {
      this.rover.drillArm.rotation.x = THREE.MathUtils.damp(this.rover.drillArm.rotation.x, 0, 6, dt);
      this.rover.scoopPivot.rotation.x = THREE.MathUtils.damp(this.rover.scoopPivot.rotation.x, 0, 6, dt);
    }

    const blink = Math.floor(this.elapsedSec * 1.1) % 7 === 0 && (this.elapsedSec % 1) < 0.12;
    if (state.rover.battery < 22) {
      animState = 'lowPower';
      this.rover.setMood('alert', blink);
    } else if (this.scanTimer > 0) {
      this.rover.setMood('scanning', false);
    } else if (animState === 'obstacle') {
      this.rover.setMood('alert', false);
    } else if (this.jumpReactTimer > 0) {
      this.jumpReactTimer -= dt;
      this.rover.setMood('victory', false);
    } else {
      this.rover.setMood('happy', blink);
    }

    const now = performance.now();
    if (now - this.lastRoverReportTime > 95 || deltaDist > 0.15) {
      this.lastRoverReportTime = now;
      const dustDelta = deltaDist * (loose ? 1.15 : 0.28);
      const energyDelta = -deltaDist * 0.32;
      this.callbacks.onRoverStep({
        x: nextX,
        y: nextY,
        z: nextZ,
        headingRad: heading,
        speed: moveSpeed,
        animState,
        distanceDelta: deltaDist,
        inCrater: isInShadowedCrater(nextX, nextZ),
        onLooseRegolith: loose,
        dustDelta,
        energyDelta,
      });
    }
  }

  private updateActiveCamera(dt: number, state: GameState) {
    const rx = this.rover.root.position.x;
    const ry = this.rover.root.position.y;
    const rz = this.rover.root.position.z;
    const heading = this.rover.root.rotation.y;

    if (state.cameraMode === 'roverCam') {
      const eyeX = rx + Math.sin(heading) * 0.55;
      const eyeZ = rz + Math.cos(heading) * 0.55;
      this.camera.position.set(eyeX, ry + 1.55, eyeZ);
      this.camera.lookAt(
        rx + Math.sin(heading) * 9,
        ry + 1.05,
        rz + Math.cos(heading) * 9
      );
      return;
    }

    _v1.set(rx, ry + 0.85, rz);
    const deltaTarget = _v2.copy(_v1).sub(this.controls.target);
    const dampAlpha = 1 - Math.exp(-5.5 * dt);
    this.controls.target.addScaledVector(deltaTarget, dampAlpha);
    this.camera.position.addScaledVector(deltaTarget, dampAlpha);

    if (this.cameraShakeTrauma > 0) {
      this.cameraShakeTrauma = Math.max(0, this.cameraShakeTrauma - dt * 1.4);
      const shake = this.cameraShakeTrauma * this.cameraShakeTrauma * 0.35;
      this.camera.position.x += (Math.random() - 0.5) * shake;
      this.camera.position.y += (Math.random() - 0.5) * shake;
    }

    this.controls.update();
  }

  public dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    this.clearProposedSlots();
    this.clearBuildGhost();
    this.phase4BeaconRing.geometry.dispose();
    (this.phase4BeaconRing.material as THREE.Material).dispose();
    this.phase4BeaconBeam.geometry.dispose();
    (this.phase4BeaconBeam.material as THREE.Material).dispose();
    this.resizeObserver.disconnect();
    this.cleanupEvents();
    this.controls.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
