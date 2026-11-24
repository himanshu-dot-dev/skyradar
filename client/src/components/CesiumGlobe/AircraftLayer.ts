import * as Cesium from 'cesium';
import type { NormalizedAircraft } from '@shared/types';

interface AircraftBillboard extends Cesium.Billboard {
  _currentTextureKey?: string;
}

interface AircraftLabel extends Cesium.Label {
  _isCurrentlySelected?: boolean;
}

// Pre-render cached commercial airliner canvas data URLs for performance
const textureCache: Record<string, string> = {};

function getAirlinerTexture(altitudeColor: string, isSelected: boolean): string {
  const key = `${altitudeColor}_${isSelected ? '1' : '0'}`;
  if (textureCache[key]) return textureCache[key];

  const size = isSelected ? 160 : 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const cx = size / 2;
  const cy = size / 2;

  // 1. Tactical Targeting Reticle & Glowing Beacon Halo (when selected)
  if (isSelected) {
    ctx.save();
    // Soft outer surveillance halo
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.46, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(91, 140, 180, 0.15)';
    ctx.fill();

    // Sharp steel-blue reticle ring
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.44, 0, Math.PI * 2);
    ctx.strokeStyle = '#5b8cb4';
    ctx.lineWidth = 1.8;
    ctx.stroke();

    // Crosshairs with center gap
    const gap = 16;
    ctx.beginPath();
    // Top
    ctx.moveTo(cx, 8); ctx.lineTo(cx, cy - gap);
    // Bottom
    ctx.moveTo(cx, size - 8); ctx.lineTo(cx, cy + gap);
    // Left
    ctx.moveTo(8, cy); ctx.lineTo(cx - gap, cy);
    // Right
    ctx.moveTo(size - 8, cy); ctx.lineTo(cx + gap, cy);
    ctx.strokeStyle = '#5b8cb4';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // 4 Corner brackets
    const bLen = 10;
    const bDist = size * 0.42;
    // Top-Left
    ctx.beginPath();
    ctx.moveTo(cx - bDist, cy - bDist + bLen);
    ctx.lineTo(cx - bDist, cy - bDist);
    ctx.lineTo(cx - bDist + bLen, cy - bDist);
    // Top-Right
    ctx.moveTo(cx + bDist - bLen, cy - bDist);
    ctx.lineTo(cx + bDist, cy - bDist);
    ctx.lineTo(cx + bDist, cy - bDist + bLen);
    // Bottom-Left
    ctx.moveTo(cx - bDist, cy + bDist - bLen);
    ctx.lineTo(cx - bDist, cy + bDist);
    ctx.lineTo(cx - bDist + bLen, cy + bDist);
    // Bottom-Right
    ctx.moveTo(cx + bDist - bLen, cy + bDist);
    ctx.lineTo(cx + bDist, cy + bDist);
    ctx.lineTo(cx + bDist, cy + bDist - bLen);
    ctx.strokeStyle = 'rgba(91, 140, 180, 0.85)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }

  ctx.save();
  ctx.translate(cx, cy);

  // Design space is 120 coordinate units (-60 to +60 in X, -60 to +60 in Y)
  const s = size / 120;
  ctx.scale(s, s);

  const outlineColor = '#334155';
  const redAccent = isSelected ? '#5b8cb4' : '#dc2626';
  const redShadow = isSelected ? '#3b688c' : '#991b1b';

  // --- 2. HORIZONTAL STABILIZERS (Tail Wings) ---
  ctx.beginPath();
  ctx.moveTo(0, 36);
  ctx.lineTo(26, 47);
  ctx.lineTo(24, 51);
  ctx.lineTo(0, 48);
  ctx.lineTo(-24, 51);
  ctx.lineTo(-26, 47);
  ctx.closePath();

  const tailGrad = ctx.createLinearGradient(-26, 47, 26, 47);
  tailGrad.addColorStop(0, '#e2e8f0');
  tailGrad.addColorStop(0.5, '#ffffff');
  tailGrad.addColorStop(1, '#cbd5e1');
  ctx.fillStyle = tailGrad;
  ctx.fill();
  ctx.strokeStyle = outlineColor;
  ctx.lineWidth = 1.0;
  ctx.stroke();

  // Tail elevator trim line
  ctx.beginPath();
  ctx.moveTo(4, 46); ctx.lineTo(23, 49);
  ctx.moveTo(-4, 46); ctx.lineTo(-23, 49);
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 0.8;
  ctx.stroke();

  // --- 3. MAIN WINGS (Aerodynamic Swept Wings with Wing Root Fillets) ---
  ctx.beginPath();
  ctx.moveTo(0, -14); // forward wing root
  ctx.bezierCurveTo(4, -14, 8, -12, 10, -7); // right wing root fillet
  ctx.lineTo(52, 15); // right wingtip leading edge
  ctx.lineTo(50, 19); // right wingtip trailing edge
  ctx.lineTo(10, 8); // right wing trailing edge root
  ctx.bezierCurveTo(7, 10, 4, 12, 0, 12); // right aft blend
  ctx.bezierCurveTo(-4, 12, -7, 10, -10, 8); // left aft blend
  ctx.lineTo(-50, 19); // left wingtip trailing edge
  ctx.lineTo(-52, 15); // left wingtip leading edge
  ctx.bezierCurveTo(-8, -12, -4, -14, 0, -14); // left wing root fillet
  ctx.closePath();

  const wingGrad = ctx.createLinearGradient(-52, 0, 52, 0);
  wingGrad.addColorStop(0, '#e2e8f0');
  wingGrad.addColorStop(0.2, '#f8fafc');
  wingGrad.addColorStop(0.5, '#ffffff');
  wingGrad.addColorStop(0.8, '#f8fafc');
  wingGrad.addColorStop(1, '#cbd5e1');
  ctx.fillStyle = wingGrad;
  ctx.fill();
  ctx.strokeStyle = outlineColor;
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // --- 4. WING ACCENT STRIPES (Bold Dual Bands per Wing matching screenshot) ---
  const drawWingStripe = (xStart: number, xEnd: number, isRight: boolean) => {
    ctx.save();
    ctx.beginPath();
    if (isRight) {
      const yL1 = -7 + (xStart - 10) * (22 / 42);
      const yL2 = -7 + (xEnd - 10) * (22 / 42);
      const yT2 = 8 + (xEnd - 10) * (11 / 40);
      const yT1 = 8 + (xStart - 10) * (11 / 40);
      ctx.moveTo(xStart, yL1);
      ctx.lineTo(xEnd, yL2);
      ctx.lineTo(xEnd, yT2);
      ctx.lineTo(xStart, yT1);
    } else {
      const xs = -xStart;
      const xe = -xEnd;
      const yL1 = -7 + (xStart - 10) * (22 / 42);
      const yL2 = -7 + (xEnd - 10) * (22 / 42);
      const yT2 = 8 + (xEnd - 10) * (11 / 40);
      const yT1 = 8 + (xStart - 10) * (11 / 40);
      ctx.moveTo(xs, yL1);
      ctx.lineTo(xe, yL2);
      ctx.lineTo(xe, yT2);
      ctx.lineTo(xs, yT1);
    }
    ctx.closePath();
    ctx.fillStyle = redAccent;
    ctx.fill();
    ctx.strokeStyle = redShadow;
    ctx.lineWidth = 0.8;
    ctx.stroke();
    ctx.restore();
  };

  // Mid-wing stripes
  drawWingStripe(20, 27, true);
  drawWingStripe(20, 27, false);

  // Outer wingtip stripes
  drawWingStripe(36, 44, true);
  drawWingStripe(36, 44, false);

  // --- 5. FLAP TRACK CANOES (Fairing Pods under Trailing Edges) ---
  const canoes = [18, 28, -18, -28];
  for (const cxPos of canoes) {
    const isR = cxPos > 0;
    const xAbs = Math.abs(cxPos);
    const yBase = 8 + (xAbs - 10) * (11 / 40);
    ctx.beginPath();
    ctx.ellipse(cxPos, yBase + 1.5, 1.2, 3.2, isR ? 0.05 : -0.05, 0, Math.PI * 2);
    ctx.fillStyle = '#94a3b8';
    ctx.fill();
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = 0.6;
    ctx.stroke();
  }

  // --- 6. TURBOFAN JET ENGINES (Underwing Pods) ---
  const drawEngine = (engX: number) => {
    const engY = 2;
    // Engine Pylon
    ctx.beginPath();
    ctx.rect(engX - 1, engY - 7, 2, 8);
    ctx.fillStyle = '#64748b';
    ctx.fill();

    // Engine Nacelle Cowling
    ctx.beginPath();
    ctx.ellipse(engX, engY, 4.0, 8.5, 0, 0, Math.PI * 2);
    const engGrad = ctx.createLinearGradient(engX - 4, engY, engX + 4, engY);
    engGrad.addColorStop(0, '#cbd5e1');
    engGrad.addColorStop(0.4, '#ffffff');
    engGrad.addColorStop(1, '#94a3b8');
    ctx.fillStyle = engGrad;
    ctx.fill();
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // Intake Rim & Dark Fan Face
    ctx.beginPath();
    ctx.ellipse(engX, engY - 6.5, 3.2, 1.8, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#0f172a';
    ctx.fill();
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 0.6;
    ctx.stroke();

    // Titanium Spinner Cone
    ctx.beginPath();
    ctx.arc(engX, engY - 6.5, 0.9, 0, Math.PI * 2);
    ctx.fillStyle = '#f8fafc';
    ctx.fill();

    // Exhaust Nozzle
    ctx.beginPath();
    ctx.ellipse(engX, engY + 7.5, 2.5, 1.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#334155';
    ctx.fill();
  };

  drawEngine(17);
  drawEngine(-17);

  // --- 7. STREAMLINED 3D FUSELAGE ---
  ctx.beginPath();
  ctx.moveTo(0, -48); // Aerodynamic nose cone tip
  // Right side of fuselage
  ctx.bezierCurveTo(4.5, -48, 6.2, -36, 6.2, -15);
  ctx.lineTo(6.2, 24);
  ctx.bezierCurveTo(6.2, 38, 2.8, 48, 0, 52); // Tail cone
  // Left side of fuselage
  ctx.bezierCurveTo(-2.8, 48, -6.2, 38, -6.2, 24);
  ctx.lineTo(-6.2, -15);
  ctx.bezierCurveTo(-6.2, -36, -4.5, -48, 0, -48);
  ctx.closePath();

  // Cylindrical 3D Volumetric Fuselage Shading
  const fuseGrad = ctx.createLinearGradient(-6.2, 0, 6.2, 0);
  fuseGrad.addColorStop(0, '#cbd5e1');
  fuseGrad.addColorStop(0.2, '#f1f5f9');
  fuseGrad.addColorStop(0.45, '#ffffff');
  fuseGrad.addColorStop(0.7, '#f8fafc');
  fuseGrad.addColorStop(1, '#94a3b8');
  ctx.fillStyle = fuseGrad;
  ctx.fill();
  ctx.strokeStyle = outlineColor;
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Centerline Specular Ridge Highlight
  ctx.beginPath();
  ctx.moveTo(0, -45);
  ctx.lineTo(0, 32);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
  ctx.lineWidth = 1.0;
  ctx.stroke();

  // --- 8. COCKPIT WINDSHIELD ("Bandit Mask" Curved Visor) ---
  ctx.beginPath();
  ctx.moveTo(0, -43);
  ctx.bezierCurveTo(3.2, -43, 4.2, -37, 4.2, -34);
  ctx.lineTo(3.2, -33);
  ctx.bezierCurveTo(2.2, -35, 1.0, -36.5, 0, -36.5);
  ctx.bezierCurveTo(-1.0, -36.5, -2.2, -35, -3.2, -33);
  ctx.lineTo(-4.2, -34);
  ctx.bezierCurveTo(-4.2, -37, -3.2, -43, 0, -43);
  ctx.closePath();
  ctx.fillStyle = '#090d16';
  ctx.fill();
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 0.8;
  ctx.stroke();

  // Cockpit glass reflection arc
  ctx.beginPath();
  ctx.arc(0, -38, 2.5, Math.PI * 1.1, Math.PI * 1.9);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
  ctx.lineWidth = 0.8;
  ctx.stroke();

  // --- 9. PASSENGER CABIN WINDOWS (Dual Rows) ---
  const winYStart = -28;
  const winYEnd = 24;
  const winCount = 18;
  for (let i = 0; i < winCount; i++) {
    const wy = winYStart + (i / (winCount - 1)) * (winYEnd - winYStart);
    // Port window
    ctx.beginPath();
    ctx.arc(-4.6, wy, 0.45, 0, Math.PI * 2);
    ctx.fillStyle = '#334155';
    ctx.fill();

    // Starboard window
    ctx.beginPath();
    ctx.arc(4.6, wy, 0.45, 0, Math.PI * 2);
    ctx.fillStyle = '#334155';
    ctx.fill();
  }

  // --- 10. DORSAL TAIL FIN & RED ACCENT STRIPE ---
  ctx.beginPath();
  ctx.moveTo(0, 26);
  ctx.bezierCurveTo(1.4, 30, 1.8, 40, 0.8, 50);
  ctx.lineTo(-0.8, 50);
  ctx.bezierCurveTo(-1.8, 40, -1.4, 30, 0, 26);
  ctx.closePath();
  ctx.fillStyle = redAccent;
  ctx.fill();
  ctx.strokeStyle = redShadow;
  ctx.lineWidth = 0.6;
  ctx.stroke();

  // --- 11. NAVIGATION LIGHTS (ICAO Standard Port Red, Starboard Green, Tail Strobe) ---
  // Left Wingtip (Port Red)
  ctx.beginPath();
  ctx.arc(-51, 17, 1.8, 0, Math.PI * 2);
  ctx.fillStyle = '#ef4444';
  ctx.shadowColor = '#ef4444';
  ctx.shadowBlur = 6;
  ctx.fill();

  // Right Wingtip (Starboard Green)
  ctx.beginPath();
  ctx.arc(51, 17, 1.8, 0, Math.PI * 2);
  ctx.fillStyle = '#10b981';
  ctx.shadowColor = '#10b981';
  ctx.shadowBlur = 6;
  ctx.fill();

  // Tail Strobe (White Beacon)
  ctx.beginPath();
  ctx.arc(0, 51.5, 1.5, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = '#ffffff';
  ctx.shadowBlur = 6;
  ctx.fill();

  ctx.restore();

  const dataUrl = canvas.toDataURL();
  textureCache[key] = dataUrl;
  return dataUrl;
}

function getAltitudeColor(altitudeFeet: number): string {
  if (altitudeFeet >= 30000) return '#00f0ff'; // Cruising: High electric cyan
  if (altitudeFeet >= 18000) return '#38bdf8'; // Mid-high: Sky blue
  if (altitudeFeet >= 10000) return '#10b981'; // Mid: Emerald green
  if (altitudeFeet >= 3000) return '#f59e0b'; // Low climb/approach: Amber
  return '#f43f5e'; // Very low / ground: Rose / Coral
}

export class AircraftLayer {
  public viewer: Cesium.Viewer;
  public billboardCollection: Cesium.BillboardCollection;
  public labelCollection: Cesium.LabelCollection;
  private billboards: Map<string, AircraftBillboard> = new Map();
  private labels: Map<string, Cesium.Label> = new Map();
  private eventHandler: Cesium.ScreenSpaceEventHandler | null = null;
  private onSelectAircraft: (id: string | null) => void;
  public selectedId: string | null = null;
  private occluder: Cesium.EllipsoidalOccluder;

  constructor(viewer: Cesium.Viewer, onSelectAircraft: (id: string | null) => void) {
    this.viewer = viewer;
    this.onSelectAircraft = onSelectAircraft;
    this.occluder = new Cesium.EllipsoidalOccluder(
      viewer.scene.globe.ellipsoid,
      viewer.camera.positionWC
    );

    // Create hardware-instanced BillboardCollection
    this.billboardCollection = new Cesium.BillboardCollection({
      scene: viewer.scene,
    });
    viewer.scene.primitives.add(this.billboardCollection);

    // Create hardware-instanced LabelCollection for callsigns
    this.labelCollection = new Cesium.LabelCollection({
      scene: viewer.scene,
    });
    viewer.scene.primitives.add(this.labelCollection);

    this.setupPicking();
  }

  private setupPicking() {
    this.eventHandler = new Cesium.ScreenSpaceEventHandler(this.viewer.scene.canvas);

    // Left click to select aircraft
    this.eventHandler.setInputAction((movement: { position: Cesium.Cartesian2 }) => {
      const picked = this.viewer.scene.pick(movement.position);
      if (Cesium.defined(picked) && picked.id && typeof picked.id === 'string') {
        this.onSelectAircraft(picked.id);
      } else {
        this.onSelectAircraft(null);
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    // Hover cursor styling
    this.eventHandler.setInputAction((movement: { endPosition: Cesium.Cartesian2 }) => {
      const picked = this.viewer.scene.pick(movement.endPosition);
      if (Cesium.defined(picked) && picked.id) {
        this.viewer.canvas.style.cursor = 'pointer';
      } else {
        this.viewer.canvas.style.cursor = 'default';
      }
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
  }

  /**
   * Batch updates all aircraft billboards & callsign labels in a single frame
   */
  public update(aircraftList: NormalizedAircraft[], selectedId: string | null) {
    if (!this.viewer || this.viewer.isDestroyed()) return;
    this.selectedId = selectedId;
    this.occluder.cameraPosition = this.viewer.camera.positionWC;
    const activeIds = new Set<string>();

    for (const ac of aircraftList) {
      activeIds.add(ac.id);
      const isSelected = ac.id === selectedId;
      const color = getAltitudeColor(ac.position.altitudeFeet);
      const textureKey = `${color}_${isSelected ? '1' : '0'}`;
      const textureUrl = getAirlinerTexture(color, isSelected);

      // Convert WGS84 coordinates (lon, lat, altMeters) to Cesium Cartesian3
      const position = Cesium.Cartesian3.fromDegrees(
        ac.position.longitude,
        ac.position.latitude,
        ac.position.altitudeMeters
      );

      // Horizon Occlusion Culling: Check if aircraft is on visible side of the 3D globe
      const isVisible = this.occluder.isPointVisible(position);

      // Surface-locked heading: align aircraft rotation with True North on the screen
      let finalRotation = -Cesium.Math.toRadians(ac.movement.heading);
      if (isVisible) {
        const posNorth = Cesium.Cartesian3.fromDegrees(
          ac.position.longitude,
          ac.position.latitude + 0.05,
          ac.position.altitudeMeters
        );
        const screenPos = Cesium.SceneTransforms.worldToWindowCoordinates(this.viewer.scene, position);
        const screenPosNorth = Cesium.SceneTransforms.worldToWindowCoordinates(this.viewer.scene, posNorth);

        if (screenPos && screenPosNorth) {
          const dx = screenPosNorth.x - screenPos.x;
          const dy = screenPosNorth.y - screenPos.y;
          const northAngleRad = Math.atan2(dx, -dy);
          finalRotation = -(northAngleRad + Cesium.Math.toRadians(ac.movement.heading));
        }
      }

      // --- 1. Authentic Airliner Billboard Marker ---
      let billboard = this.billboards.get(ac.id);

      if (!billboard) {
        billboard = this.billboardCollection.add({
          position,
          image: textureUrl,
          rotation: finalRotation,
          alignedAxis: Cesium.Cartesian3.ZERO,
          scale: isSelected ? 0.52 : 0.42,
          id: ac.id,
          show: isVisible,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          heightReference: Cesium.HeightReference.NONE,
          scaleByDistance: new Cesium.NearFarScalar(1.0e3, 1.15, 2.0e7, 0.85),
        }) as AircraftBillboard;
        billboard._currentTextureKey = textureKey;
        this.billboards.set(ac.id, billboard);
      } else {
        billboard.show = isVisible;
        billboard.position = position;
        billboard.rotation = finalRotation;

        // ONLY update image and scale when selection/texture actually changes!
        if (billboard._currentTextureKey !== textureKey) {
          billboard.image = textureUrl;
          billboard.scale = isSelected ? 0.52 : 0.42;
          billboard._currentTextureKey = textureKey;
        }
      }

      // --- 2. High-Legibility Callsign Radar Label (2x Supersampled) ---
      let label = this.labels.get(ac.id) as AircraftLabel | undefined;
      const labelText = ac.callsign || ac.id.toUpperCase();

      const labelOffset = isSelected
        ? new Cesium.Cartesian2(0, 52) // Outside the tactical cyan targeting reticle
        : new Cesium.Cartesian2(0, 36); // Cleanly below the aircraft tail

      // Distance-based LOD: Only show labels for all flights when camera is within 2,200 km (prevents solid black wall over Europe)
      // Selected aircraft label is ALWAYS visible at any zoom distance
      const displayCondition = isSelected
        ? new Cesium.DistanceDisplayCondition(0, Number.MAX_VALUE)
        : new Cesium.DistanceDisplayCondition(0, 2200000);

      // Render at 24px/22px and downscale by 0.5 for razor-sharp 2x retina typography
      const labelFont = isSelected
        ? '700 24px "JetBrains Mono", monospace'
        : '600 22px "JetBrains Mono", monospace';

      const labelFillColor = isSelected
        ? Cesium.Color.fromCssColorString('#d8dfe8')
        : Cesium.Color.fromCssColorString('#8893a4');

      // Calibrated low-contrast slate glass background
      const labelBgColor = isSelected
        ? Cesium.Color.fromCssColorString('rgba(17, 21, 29, 0.95)')
        : Cesium.Color.fromCssColorString('rgba(12, 15, 20, 0.85)');

      const labelPadding = isSelected
        ? new Cesium.Cartesian2(14, 8)
        : new Cesium.Cartesian2(12, 6);

      if (!label) {
        label = this.labelCollection.add({
          position,
          text: labelText,
          font: labelFont,
          scale: 0.5,
          fillColor: labelFillColor,
          style: Cesium.LabelStyle.FILL, // Pure clean vector fill without choking outline stroke
          pixelOffset: labelOffset,
          eyeOffset: new Cesium.Cartesian3(0, 0, -10), // Always render in front of aircraft billboard
          show: isVisible,
          showBackground: true,
          backgroundColor: labelBgColor,
          backgroundPadding: labelPadding,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          distanceDisplayCondition: displayCondition,
          id: ac.id,
        }) as AircraftLabel;
        label._isCurrentlySelected = isSelected;
        this.labels.set(ac.id, label);
      } else {
        label.show = isVisible;
        label.position = position;
        if (label.text !== labelText) label.text = labelText;

        // ONLY update style, font, colors and offsets when selection state actually changes (prevents 60 FPS texture atlas thrashing)
        if (label._isCurrentlySelected !== isSelected) {
          label.font = labelFont;
          label.scale = 0.5;
          label.fillColor = labelFillColor;
          label.style = Cesium.LabelStyle.FILL;
          label.backgroundColor = labelBgColor;
          label.backgroundPadding = labelPadding;
          label.pixelOffset = labelOffset;
          label.distanceDisplayCondition = displayCondition;
          label._isCurrentlySelected = isSelected;
        }
      }
    }

    // Remove any stale aircraft
    for (const [id, bb] of this.billboards.entries()) {
      if (!activeIds.has(id)) {
        this.billboardCollection.remove(bb);
        this.billboards.delete(id);
      }
    }

    for (const [id, lbl] of this.labels.entries()) {
      if (!activeIds.has(id)) {
        this.labelCollection.remove(lbl);
        this.labels.delete(id);
      }
    }
  }

  public destroy() {
    if (this.eventHandler) {
      this.eventHandler.destroy();
      this.eventHandler = null;
    }
    if (!this.viewer.isDestroyed()) {
      this.viewer.scene.primitives.remove(this.billboardCollection);
      this.viewer.scene.primitives.remove(this.labelCollection);
    }
    this.billboards.clear();
    this.labels.clear();
  }
}
