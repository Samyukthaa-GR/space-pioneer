import * as THREE from 'three';
import { BoulderObstacle, ConnectionStatus, RockTarget, StructureType } from '../game/types';
import {
  RoverMood,
  createSolarPanelTexture,
  drawRoverFaceTexture,
} from './proceduralTextures';

export interface RoverModelHandles {
  root: THREE.Group;
  bodyGroup: THREE.Group;
  wheels: THREE.Group[];
  frontSteerPivots: THREE.Group[];
  bogieLeft: THREE.Group;
  bogieRight: THREE.Group;
  mastPivot: THREE.Group;
  headPivot: THREE.Group;
  drillArm: THREE.Group;
  scoopPivot: THREE.Group;
  scanCone: THREE.Mesh;
  headlightGroup: THREE.Group;
  headlightSpot: THREE.SpotLight | null;
  headlightLensMat: THREE.MeshStandardMaterial;
  beaconMat: THREE.MeshStandardMaterial;
  dustOverlayMat: THREE.MeshStandardMaterial;
  lensMat: THREE.MeshPhysicalMaterial;
  faceCanvas: HTMLCanvasElement;
  faceTexture: THREE.CanvasTexture;
  setMood: (mood: RoverMood, blink?: boolean) => void;
  setHeadlights: (on: boolean) => void;
}

export function createRoverModel(
  shadowTex: THREE.Texture,
  maxAnisotropy: number,
  isSoftwareGl: boolean
): RoverModelHandles {
  const root = new THREE.Group();
  root.name = 'RoverCompanion';

  // Soft radial contact shadow flush on ground
  const shadowPlane = new THREE.Mesh(
    new THREE.CircleGeometry(1.55, 24),
    new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      opacity: 0.58,
      depthWrite: false,
    })
  );
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.position.y = 0.025;
  root.add(shadowPlane);

  const bodyGroup = new THREE.Group();
  bodyGroup.position.y = 0.55;
  root.add(bodyGroup);

  const whiteThermalMat = new THREE.MeshStandardMaterial({
    color: 0xeaf0f6,
    roughness: 0.42,
    metalness: 0.15,
  });
  const goldFoilMat = new THREE.MeshStandardMaterial({
    color: 0xe3a82b,
    roughness: 0.24,
    metalness: 0.88,
  });
  const titaniumMat = new THREE.MeshStandardMaterial({
    color: 0x626b78,
    roughness: 0.35,
    metalness: 0.78,
  });
  const wheelRubberMat = new THREE.MeshStandardMaterial({
    color: 0x262930,
    roughness: 0.88,
    metalness: 0.12,
  });
  const solarTex = createSolarPanelTexture(maxAnisotropy);
  const solarMat = new THREE.MeshStandardMaterial({
    map: solarTex,
    roughness: 0.18,
    metalness: 0.65,
  });
  const dustOverlayMat = new THREE.MeshStandardMaterial({
    color: 0x8c8f94,
    roughness: 0.95,
    metalness: 0.0,
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
  });
  const beaconMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x38bdf8,
    emissiveIntensity: 1.4,
    roughness: 0.2,
  });
  const headlightLensMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    emissive: 0xfef08a,
    emissiveIntensity: 0.15,
    roughness: 0.15,
    metalness: 0.2,
  });
  const lensMat = new THREE.MeshPhysicalMaterial({
    color: 0x7dd3fc,
    roughness: 0.08,
    metalness: 0.1,
    transmission: isSoftwareGl ? 0 : 0.75,
    transparent: true,
    opacity: isSoftwareGl ? 0.55 : 1.0,
    clearcoat: 1.0,
  });

  // 1. Beveled main chassis (ExtrudeGeometry)
  const hullShape = new THREE.Shape();
  hullShape.moveTo(-0.55, -0.78);
  hullShape.lineTo(0.55, -0.78);
  hullShape.lineTo(0.66, -0.35);
  hullShape.lineTo(0.66, 0.52);
  hullShape.lineTo(0.45, 0.82);
  hullShape.lineTo(-0.45, 0.82);
  hullShape.lineTo(-0.66, 0.52);
  hullShape.lineTo(-0.66, -0.35);
  hullShape.closePath();

  const hullGeo = new THREE.ExtrudeGeometry(hullShape, {
    depth: 0.34,
    bevelEnabled: true,
    bevelThickness: 0.06,
    bevelSize: 0.05,
    bevelSegments: 2,
  });
  hullGeo.rotateX(Math.PI / 2);
  const hullMesh = new THREE.Mesh(hullGeo, whiteThermalMat);
  hullMesh.position.y = 0.28;
  hullMesh.castShadow = true;
  hullMesh.receiveShadow = true;
  bodyGroup.add(hullMesh);

  // 2. Gold MLI thermal core band
  const mliCore = new THREE.Mesh(new THREE.BoxGeometry(1.06, 0.24, 1.02), goldFoilMat);
  mliCore.position.set(0, 0.14, 0.02);
  mliCore.castShadow = true;
  bodyGroup.add(mliCore);

  // 3. Rear Solar Wing Deck + Sample Storage Bin + Dust Layer
  const solarDeck = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.05, 0.88), solarMat);
  solarDeck.position.set(0, 0.37, -0.38);
  solarDeck.rotation.x = 0.12;
  solarDeck.castShadow = true;
  bodyGroup.add(solarDeck);

  const storageBin = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.22, 0.36), titaniumMat);
  storageBin.position.set(-0.32, 0.42, -0.05);
  bodyGroup.add(storageBin);

  const solarDust = new THREE.Mesh(new THREE.BoxGeometry(1.37, 0.055, 0.89), dustOverlayMat);
  solarDust.position.copy(solarDeck.position);
  solarDust.rotation.copy(solarDeck.rotation);
  bodyGroup.add(solarDust);

  // 4. Expressive LED Face Display on front hull
  const faceCanvas = document.createElement('canvas');
  faceCanvas.width = 256;
  faceCanvas.height = 128;
  drawRoverFaceTexture(faceCanvas, 'happy');
  const faceTexture = new THREE.CanvasTexture(faceCanvas);
  faceTexture.colorSpace = THREE.SRGBColorSpace;
  faceTexture.anisotropy = maxAnisotropy;

  const faceBezel = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.28, 0.08), titaniumMat);
  faceBezel.position.set(0, 0.18, 0.83);
  bodyGroup.add(faceBezel);

  const faceScreen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.6, 0.22),
    new THREE.MeshBasicMaterial({ map: faceTexture })
  );
  faceScreen.position.set(0, 0.18, 0.875);
  bodyGroup.add(faceScreen);

  // Twin LED Headlights + Volumetric Cone Beams (toggled when entering shadowed craters)
  const headlightGroup = new THREE.Group();
  headlightGroup.position.set(0, 0.04, 0.84);
  bodyGroup.add(headlightGroup);

  const beamGeo = new THREE.ConeGeometry(1.65, 7.2, 20, 1, true);
  beamGeo.translate(0, -3.6, 0);
  beamGeo.rotateX(-Math.PI / 2);
  const beamMat = new THREE.MeshBasicMaterial({
    color: 0xfef9c3,
    transparent: true,
    opacity: 0.18,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  const beams: THREE.Mesh[] = [];
  for (const lx of [-0.46, 0.46]) {
    const housing = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.095, 0.12, 12), titaniumMat);
    housing.rotation.x = Math.PI / 2;
    housing.position.set(lx, 0, 0);
    headlightGroup.add(housing);

    const bulb = new THREE.Mesh(new THREE.CircleGeometry(0.075, 12), headlightLensMat);
    bulb.position.set(lx, 0, 0.065);
    headlightGroup.add(bulb);

    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.set(lx, -0.02, 0.08);
    beam.rotation.x = 0.16;
    beam.visible = false;
    headlightGroup.add(beam);
    beams.push(beam);
  }

  let headlightSpot: THREE.SpotLight | null = null;
  if (!isSoftwareGl) {
    headlightSpot = new THREE.SpotLight(0xfffbe0, 0, 22, Math.PI / 4.2, 0.48, 1.3);
    headlightSpot.position.set(0, 0.22, 0.88);
    const spotTarget = new THREE.Object3D();
    spotTarget.position.set(0, -0.5, 8.5);
    bodyGroup.add(spotTarget);
    headlightSpot.target = spotTarget;
    bodyGroup.add(headlightSpot);
  }

  // 5. Rocker-bogie suspension struts & 6 treaded wheels
  const wheels: THREE.Group[] = [];
  const frontSteerPivots: THREE.Group[] = [];

  const createSideBogie = (side: -1 | 1) => {
    const bogie = new THREE.Group();
    bogie.position.set(side * 0.68, -0.05, 0);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 1.35), titaniumMat);
    bar.position.y = -0.08;
    bogie.add(bar);
    const crossFront = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.38, 8), titaniumMat);
    crossFront.position.set(0, -0.18, 0.65);
    bogie.add(crossFront);
    const crossRear = crossFront.clone();
    crossRear.position.z = -0.65;
    bogie.add(crossRear);
    bodyGroup.add(bogie);
    return bogie;
  };
  const bogieLeft = createSideBogie(-1);
  const bogieRight = createSideBogie(1);

  const wheelGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.18, 16);
  wheelGeo.rotateZ(Math.PI / 2);
  const hubGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.2, 12);
  hubGeo.rotateZ(Math.PI / 2);
  const cleatGeo = new THREE.BoxGeometry(0.19, 0.03, 0.04);

  const wheelPositions: Array<[number, number, boolean]> = [
    [-0.78, 0.65, true],
    [0.78, 0.65, true],
    [-0.82, 0.0, false],
    [0.82, 0.0, false],
    [-0.78, -0.65, false],
    [0.78, -0.65, false],
  ];

  for (const [wx, wz, isFront] of wheelPositions) {
    const steerPivot = new THREE.Group();
    steerPivot.position.set(wx < 0 ? -0.1 : 0.1, -0.26, wz);

    const wheelGrp = new THREE.Group();
    const tire = new THREE.Mesh(wheelGeo, wheelRubberMat);
    tire.castShadow = true;
    wheelGrp.add(tire);
    const hub = new THREE.Mesh(hubGeo, goldFoilMat);
    wheelGrp.add(hub);

    for (let c = 0; c < 6; c++) {
      const ang = (c / 6) * Math.PI * 2;
      const cleat = new THREE.Mesh(cleatGeo, titaniumMat);
      cleat.position.set(0, Math.cos(ang) * 0.24, Math.sin(ang) * 0.24);
      cleat.rotation.x = ang;
      wheelGrp.add(cleat);
    }

    steerPivot.add(wheelGrp);
    if (wx < 0) bogieLeft.add(steerPivot);
    else bogieRight.add(steerPivot);

    wheels.push(wheelGrp);
    if (isFront) frontSteerPivots.push(steerPivot);
  }

  // 6. Articulated Camera Mast & Sensor Head
  const mastPivot = new THREE.Group();
  mastPivot.position.set(0.28, 0.36, 0.45);
  bodyGroup.add(mastPivot);

  const mastPost = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.07, 0.68, 12), whiteThermalMat);
  mastPost.position.y = 0.34;
  mastPost.castShadow = true;
  mastPivot.add(mastPost);

  const headPivot = new THREE.Group();
  headPivot.position.y = 0.7;
  mastPivot.add(headPivot);

  const headBox = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.22, 0.26), whiteThermalMat);
  headBox.castShadow = true;
  headPivot.add(headBox);

  const lensRimL = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.08, 16), titaniumMat);
  lensRimL.rotation.x = Math.PI / 2;
  lensRimL.position.set(-0.1, 0, 0.15);
  headPivot.add(lensRimL);

  const lensRimR = lensRimL.clone();
  lensRimR.position.x = 0.1;
  headPivot.add(lensRimR);

  const lensL = new THREE.Mesh(new THREE.SphereGeometry(0.055, 14, 14), lensMat);
  lensL.position.set(-0.1, 0, 0.18);
  headPivot.add(lensL);

  const lensR = lensL.clone();
  lensR.position.x = 0.1;
  headPivot.add(lensR);

  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 12), beaconMat);
  beacon.position.set(0, 0.15, 0);
  headPivot.add(beacon);

  // 7. Scanner laser cone (hidden unless scanning)
  const scanConeGeo = new THREE.ConeGeometry(1.15, 2.5, 24, 1, true);
  scanConeGeo.translate(0, -1.25, 0);
  scanConeGeo.rotateX(-Math.PI / 2);
  const scanConeMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.28,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const scanCone = new THREE.Mesh(scanConeGeo, scanConeMat);
  scanCone.position.set(0, -0.02, 0.2);
  scanCone.visible = false;
  headPivot.add(scanCone);

  // 8. Articulated Robotic Scoop & Core Drill Arm on left front
  const drillArm = new THREE.Group();
  drillArm.position.set(-0.36, 0.18, 0.72);
  bodyGroup.add(drillArm);

  const armSeg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.45), titaniumMat);
  armSeg.position.z = 0.22;
  drillArm.add(armSeg);

  const drillBit = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.22, 10), goldFoilMat);
  drillBit.rotation.x = Math.PI / 2;
  drillBit.position.z = 0.52;
  drillArm.add(drillBit);

  const scoopPivot = new THREE.Group();
  scoopPivot.position.set(0, -0.04, 0.46);
  const scoopCup = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.1, 0.18), whiteThermalMat);
  scoopCup.position.set(0, -0.04, 0.07);
  scoopPivot.add(scoopCup);
  drillArm.add(scoopPivot);

  let currentMood: RoverMood = 'happy';
  let currentBlink = false;
  let currentHeadlights = false;

  const setMood = (mood: RoverMood, blink = false) => {
    if (mood === currentMood && blink === currentBlink) return;
    currentMood = mood;
    currentBlink = blink;
    drawRoverFaceTexture(faceCanvas, mood, blink);
    faceTexture.needsUpdate = true;
    if (mood === 'alert') beaconMat.emissive.setHex(0xf59e0b);
    else if (mood === 'victory') beaconMat.emissive.setHex(0x34d399);
    else if (mood === 'scanning') beaconMat.emissive.setHex(0x38bdf8);
    else beaconMat.emissive.setHex(0x60a5fa);
  };

  const setHeadlights = (on: boolean) => {
    if (on === currentHeadlights) return;
    currentHeadlights = on;
    headlightLensMat.emissiveIntensity = on ? 2.4 : 0.15;
    for (const b of beams) b.visible = on;
    if (headlightSpot) {
      headlightSpot.intensity = on ? 16 : 0;
    }
  };

  return {
    root,
    bodyGroup,
    wheels,
    frontSteerPivots,
    bogieLeft,
    bogieRight,
    mastPivot,
    headPivot,
    drillArm,
    scoopPivot,
    scanCone,
    headlightGroup,
    headlightSpot,
    headlightLensMat,
    beaconMat,
    dustOverlayMat,
    lensMat,
    faceCanvas,
    faceTexture,
    setMood,
    setHeadlights,
  };
}

export function createBoulderMesh(boulder: BoulderObstacle): THREE.Group {
  const grp = new THREE.Group();
  grp.position.set(boulder.x, 0, boulder.z);

  const baseMat = new THREE.MeshStandardMaterial({
    color: boulder.kind === 'cluster' ? 0x5c6068 : boulder.kind === 'ridge_rock' ? 0x737780 : 0x676b73,
    roughness: 0.92,
    metalness: 0.04,
    flatShading: true,
  });

  const createDeformedRock = (rad: number, hScale: number, seed: number) => {
    const geo = new THREE.DodecahedronGeometry(rad, 1);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i);
      const vy = pos.getY(i);
      const vz = pos.getZ(i);
      const n = 0.8 + 0.35 * Math.sin(vx * 2.1 + seed) * Math.cos(vz * 1.9 - seed);
      pos.setXYZ(i, vx * n, vy * hScale * n, vz * n);
    }
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, baseMat);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  };

  const mainRock = createDeformedRock(boulder.radius * 0.86, boulder.height / boulder.radius, boulder.x);
  mainRock.position.y = boulder.height * 0.42;
  grp.add(mainRock);

  const sub1 = createDeformedRock(boulder.radius * 0.48, 0.8, boulder.z + 3);
  sub1.position.set(boulder.radius * 0.48, boulder.height * 0.25, boulder.radius * 0.25);
  grp.add(sub1);

  const sub2 = createDeformedRock(boulder.radius * 0.38, 0.72, boulder.x + boulder.z);
  sub2.position.set(-boulder.radius * 0.42, boulder.height * 0.2, -boulder.radius * 0.32);
  grp.add(sub2);

  return grp;
}

export function createTargetMarkerModel(target: RockTarget): THREE.Group {
  const grp = new THREE.Group();
  grp.userData.targetId = target.id;

  const ringColor =
    target.kind === 'hydrogen_clue'
      ? 0x38bdf8
      : target.kind === 'dry_crater_probe'
      ? 0x94a3b8
      : target.kind === 'sunlight_beacon'
      ? 0xfbbf24
      : target.kind === 'regolith_loose'
      ? 0xf97316
      : 0x34d399;

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(1.15, 1.4, 32),
    new THREE.MeshBasicMaterial({
      color: ringColor,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.75,
    })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.06;
  grp.add(ring);

  if (target.kind === 'basalt' || target.kind === 'anorthosite') {
    const rockGeo = new THREE.DodecahedronGeometry(0.68, 1);
    const rockMat = new THREE.MeshStandardMaterial({
      color: target.kind === 'basalt' ? 0x353942 : 0xd0d4dc,
      roughness: 0.85,
      metalness: 0.08,
      flatShading: true,
    });
    const rock = new THREE.Mesh(rockGeo, rockMat);
    rock.position.y = 0.52;
    rock.scale.set(1.15, 0.82, 1.0);
    rock.castShadow = true;
    grp.add(rock);

    const crystal = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.22, 0),
      new THREE.MeshStandardMaterial({
        color: ringColor,
        emissive: ringColor,
        emissiveIntensity: 0.85,
        roughness: 0.2,
      })
    );
    crystal.position.set(0.22, 0.92, 0.1);
    grp.add(crystal);
  } else if (target.kind === 'regolith_loose') {
    const moundMat = new THREE.MeshStandardMaterial({
      color: 0x9aa0a8,
      roughness: 0.96,
      metalness: 0.02,
    });
    const mound = new THREE.Mesh(new THREE.ConeGeometry(1.05, 0.65, 16), moundMat);
    mound.position.y = 0.32;
    grp.add(mound);
    const flagPole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 1.4, 8),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.8, roughness: 0.3 })
    );
    flagPole.position.set(0.5, 0.7, 0);
    grp.add(flagPole);
    const flag = new THREE.Mesh(
      new THREE.BoxGeometry(0.45, 0.24, 0.03),
      new THREE.MeshStandardMaterial({ color: 0xf97316, emissive: 0xf97316, emissiveIntensity: 0.5 })
    );
    flag.position.set(0.72, 1.24, 0);
    grp.add(flag);
  } else if (target.kind === 'hydrogen_clue' || target.kind === 'dry_crater_probe') {
    const isClue = target.kind === 'hydrogen_clue';
    const icePatch = new THREE.Mesh(
      new THREE.CylinderGeometry(0.9, 1.05, 0.12, 20),
      new THREE.MeshStandardMaterial({
        color: isClue ? 0x7dd3fc : 0x64748b,
        emissive: isClue ? 0x0ea5e9 : 0x334155,
        emissiveIntensity: isClue ? 0.45 : 0.2,
        roughness: 0.3,
        metalness: 0.1,
      })
    );
    icePatch.position.y = 0.07;
    grp.add(icePatch);
    const sensorPost = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.07, 1.35, 10),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.7, roughness: 0.3 })
    );
    sensorPost.position.y = 0.68;
    grp.add(sensorPost);
    const beacon = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 12, 12),
      new THREE.MeshStandardMaterial({
        color: isClue ? 0x38bdf8 : 0x94a3b8,
        emissive: isClue ? 0x38bdf8 : 0x64748b,
        emissiveIntensity: 1.1,
      })
    );
    beacon.position.y = 1.42;
    grp.add(beacon);
  } else {
    const mast = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.12, 1.65, 10),
      new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.75, roughness: 0.25 })
    );
    mast.position.y = 0.82;
    grp.add(mast);
    const panel = new THREE.Mesh(
      new THREE.BoxGeometry(0.95, 0.06, 0.55),
      new THREE.MeshStandardMaterial({ color: 0x1d4ed8, metalness: 0.6, roughness: 0.2 })
    );
    panel.position.y = 1.68;
    panel.rotation.x = 0.45;
    grp.add(panel);
  }

  return grp;
}

export function setStructureVisualStatus(
  grp: THREE.Group,
  status: ConnectionStatus | undefined,
  damaged = false
) {
  const mat = grp.userData.statusBeaconMat as THREE.MeshStandardMaterial | undefined;
  if (!mat) return;
  const hex = damaged || status === 'offline'
    ? 0xef4444
    : status === 'needs_attention'
    ? 0xfbbf24
    : 0x22c55e;
  mat.color.setHex(hex);
  mat.emissive.setHex(hex);
}

export function createStructureModel(
  type: StructureType,
  shadowTex: THREE.Texture,
  maxAnisotropy: number,
  damaged = false,
  status: ConnectionStatus = 'connected'
): THREE.Group {
  const grp = new THREE.Group();
  grp.userData.structureType = type;

  const shadowDisc = new THREE.Mesh(
    new THREE.CircleGeometry(type === 'habitat' ? 2.8 : 1.7, 24),
    new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
    })
  );
  shadowDisc.rotation.x = -Math.PI / 2;
  shadowDisc.position.y = 0.03;
  grp.add(shadowDisc);

  const whiteHull = new THREE.MeshStandardMaterial({ color: 0xeef2f7, roughness: 0.45, metalness: 0.15 });
  const titanium = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.32, metalness: 0.82 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.22, metalness: 0.9 });
  const alertColor =
    damaged || status === 'offline' ? 0xef4444 : status === 'needs_attention' ? 0xfbbf24 : 0x22c55e;
  const statusBeaconMat = new THREE.MeshStandardMaterial({
    color: alertColor,
    emissive: alertColor,
    emissiveIntensity: 1.25,
    roughness: 0.2,
  });
  grp.userData.statusBeaconMat = statusBeaconMat;

  // Container for vertical deploy animation
  const body = new THREE.Group();
  grp.userData.deployGroup = body;
  grp.add(body);

  if (type === 'habitat') {
    const baseRing = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.25, 0.35, 24), titanium);
    baseRing.position.y = 0.18;
    body.add(baseRing);

    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(1.95, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.52),
      whiteHull
    );
    dome.position.y = 0.32;
    dome.castShadow = true;
    body.add(dome);

    const airlock = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.05, 1.3), whiteHull);
    airlock.position.set(0, 0.58, 1.95);
    airlock.castShadow = true;
    body.add(airlock);

    const hatch = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.12, 16), gold);
    hatch.rotation.x = Math.PI / 2;
    hatch.position.set(0, 0.62, 2.61);
    body.add(hatch);

    const windowStrip = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.26, 0.15), statusBeaconMat);
    windowStrip.position.set(0, 1.25, 1.65);
    body.add(windowStrip);

    const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 1.2, 8), titanium);
    antenna.position.set(0.6, 2.5, -0.3);
    body.add(antenna);
  } else if (type === 'solar') {
    const solarTex = createSolarPanelTexture(maxAnisotropy);
    const panelMat = new THREE.MeshStandardMaterial({ map: solarTex, roughness: 0.18, metalness: 0.65 });
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.6, 0.25, 12), titanium);
    base.position.y = 0.12;
    body.add(base);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 1.65, 10), whiteHull);
    mast.position.y = 0.95;
    body.add(mast);
    const solarWings: THREE.Mesh[] = [];
    for (const sx of [-1.05, 1.05]) {
      const wing = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.06, 1.05), panelMat);
      wing.position.set(sx, 1.72, 0);
      wing.rotation.x = 0.42;
      wing.castShadow = true;
      body.add(wing);
      solarWings.push(wing);
    }
    grp.userData.solarWings = solarWings;
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 10), statusBeaconMat);
    beacon.position.y = 1.98;
    body.add(beacon);
  } else if (type === 'battery') {
    const pad = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.18, 1.4), titanium);
    pad.position.y = 0.09;
    body.add(pad);
    for (const bx of [-0.48, 0, 0.48]) {
      const cell = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 1.15, 14), gold);
      cell.position.set(bx, 0.75, 0);
      cell.castShadow = true;
      body.add(cell);
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.14, 14), titanium);
      cap.position.set(bx, 1.35, 0);
      body.add(cap);
    }
    const led = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.14, 0.1), statusBeaconMat);
    led.position.set(0, 0.78, 0.34);
    body.add(led);
  } else if (type === 'water') {
    const skid = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.18, 1.5), titanium);
    skid.position.y = 0.09;
    body.add(skid);
    for (const tx of [-0.45, 0.45]) {
      const tank = new THREE.Mesh(new THREE.SphereGeometry(0.45, 16, 16), whiteHull);
      tank.scale.y = 1.35;
      tank.position.set(tx, 0.78, 0);
      tank.castShadow = true;
      body.add(tank);
    }
    const pipe = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.06, 8, 18, Math.PI), statusBeaconMat);
    pipe.position.set(0, 1.22, 0);
    body.add(pipe);
  } else if (type === 'air') {
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.2, 1.45), titanium);
    base.position.y = 0.1;
    body.add(base);
    const scrubber = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.15, 0.95), whiteHull);
    scrubber.position.y = 0.76;
    scrubber.castShadow = true;
    body.add(scrubber);
    const vent = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.22, 16), statusBeaconMat);
    vent.rotation.x = Math.PI / 2;
    vent.position.set(0, 0.88, 0.52);
    body.add(vent);
    const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.55, 12), titanium);
    stack.position.set(0.35, 1.55, -0.15);
    body.add(stack);
  } else if (type === 'oxygen') {
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.16, 1.3), titanium);
    base.position.y = 0.08;
    body.add(base);
    for (const ox of [-0.42, 0, 0.42]) {
      const bottle = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.9, 6, 12), whiteHull);
      bottle.position.set(ox, 0.78, 0);
      bottle.castShadow = true;
      body.add(bottle);
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.14, 12), statusBeaconMat);
      band.position.set(ox, 0.98, 0);
      body.add(band);
    }
  } else if (type === 'shielding') {
    const regMat = new THREE.MeshStandardMaterial({ color: 0x7a7f88, roughness: 0.95, metalness: 0.02, flatShading: true });
    for (let i = -2; i <= 2; i++) {
      const block = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.85 + (2 - Math.abs(i)) * 0.22, 0.75), regMat);
      block.position.set(i * 0.56, 0.45 + (2 - Math.abs(i)) * 0.1, Math.abs(i) * 0.12);
      block.castShadow = true;
      body.add(block);
    }
  } else if (type === 'food') {
    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.25, 0.28, 18), titanium);
    base.position.y = 0.14;
    body.add(base);
    const tray = new THREE.Mesh(
      new THREE.CylinderGeometry(0.85, 0.85, 0.14, 16),
      new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x15803d, emissiveIntensity: 0.45, roughness: 0.6 })
    );
    tray.position.y = 0.35;
    body.add(tray);
    const glassDome = new THREE.Mesh(
      new THREE.SphereGeometry(1.05, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.55),
      new THREE.MeshPhysicalMaterial({
        color: 0xdbeafe,
        roughness: 0.1,
        transparent: true,
        opacity: 0.38,
        depthWrite: false,
      })
    );
    glassDome.position.y = 0.26;
    body.add(glassDome);
  } else {
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.35, 0.7), titanium);
    box.position.y = 0.18;
    body.add(box);
    const conduit = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 2.2, 10), gold);
    conduit.rotation.z = Math.PI / 2;
    conduit.position.y = 0.14;
    body.add(conduit);
    const nodeLight = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 10), statusBeaconMat);
    nodeLight.position.y = 0.42;
    body.add(nodeLight);
  }

  return grp;
}
