import * as Cesium from 'cesium';
import type { NormalizedAircraft } from '@shared/types';

interface AircraftBillboard extends Cesium.Billboard {
  _currentTextureKey?: string;
}

// Pre-render cached commercial airliner canvas data URLs for performance
const textureCache: Record<string, string> = {};

function getAirlinerTexture(color: string, isSelected: boolean): string {
  const key = `${color}_${isSelected ? '1' : '0'}`;
  if (textureCache[key]) return textureCache[key];

  const size = isSelected ? 72 : 56;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const cx = size / 2;
  const cy = size / 2;

  // 1. Tactical Targeting Reticle (when selected)
  if (isSelected) {
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.45, 0, Math.PI * 2);
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 12;
    ctx.stroke();

    // Crosshairs
    ctx.beginPath();
    ctx.moveTo(cx, 0); ctx.lineTo(cx, 8);
    ctx.moveTo(cx, size); ctx.lineTo(cx, size - 8);
    ctx.moveTo(0, cy); ctx.lineTo(8, cy);
    ctx.moveTo(size, cy); ctx.lineTo(size - 8, cy);
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // 2. Soft Beacon Halo (for high visibility against dark oceans and continents)
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.35, 0, Math.PI * 2);
  ctx.fillStyle = isSelected ? 'rgba(0, 240, 255, 0.45)' : `${color}40`;
  ctx.shadowColor = color;
  ctx.shadowBlur = 12;
  ctx.fill();

  ctx.save();
  ctx.translate(cx, cy);

  // Normalize coordinates: design space is [-32, 32]
  const s = size / 64;
  ctx.scale(s, s);

  const bodyColor = isSelected ? '#ffffff' : color;
  ctx.fillStyle = bodyColor;
  ctx.strokeStyle = '#020617';
  ctx.lineWidth = 1.8;
  ctx.shadowColor = isSelected ? '#00f0ff' : color;
  ctx.shadowBlur = isSelected ? 10 : 4;

  // 3. MAIN WINGS (Authentic swept-back commercial jet airliner wings)
  ctx.beginPath();
  ctx.moveTo(0, -6); // Forward wing root
  ctx.lineTo(26, 9); // Right wingtip leading edge
  ctx.lineTo(25, 13); // Right wingtip trailing edge (winglet)
  ctx.lineTo(4, 6); // Right wing root trailing edge
  ctx.lineTo(-4, 6); // Left wing root trailing edge
  ctx.lineTo(-25, 13); // Left wingtip trailing edge (winglet)
  ctx.lineTo(-26, 9); // Left wingtip leading edge
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 4. JET ENGINES (Twin turbofan engine pods mounted under wings)
  // Left Engine
  ctx.beginPath();
  ctx.ellipse(-11, 4, 3.2, 6.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Right Engine
  ctx.beginPath();
  ctx.ellipse(11, 4, 3.2, 6.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // 5. HORIZONTAL STABILIZERS (Tail wings)
  ctx.beginPath();
  ctx.moveTo(0, 18);
  ctx.lineTo(13, 25);
  ctx.lineTo(12, 28);
  ctx.lineTo(0, 24);
  ctx.lineTo(-12, 28);
  ctx.lineTo(-13, 25);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 6. STREAMLINED FUSELAGE
  ctx.beginPath();
  ctx.moveTo(0, -26); // Nose tip
  ctx.bezierCurveTo(4, -26, 4.5, -15, 4.5, 12); // Right cabin side
  ctx.bezierCurveTo(4.5, 20, 2, 26, 0, 29); // Right tail cone
  ctx.bezierCurveTo(-2, 26, -4.5, 20, -4.5, 12); // Left tail cone
  ctx.bezierCurveTo(-4.5, -15, -4, -26, 0, -26); // Left cabin side
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 7. COCKPIT WINDSHIELD (Aviation glass visor)
  ctx.beginPath();
  ctx.moveTo(-2.5, -19);
  ctx.bezierCurveTo(-1.5, -21.5, 1.5, -21.5, 2.5, -19);
  ctx.lineTo(2, -16.5);
  ctx.lineTo(-2, -16.5);
  ctx.closePath();
  ctx.fillStyle = '#090d16';
  ctx.shadowBlur = 0;
  ctx.fill();

  // 8. NAVIGATION LIGHTS (Aviation standard: Port Red, Starboard Green, Tail Strobe)
  // Left Wingtip (Port Red)
  ctx.beginPath();
  ctx.arc(-25.5, 11, 2, 0, Math.PI * 2);
  ctx.fillStyle = '#ef4444';
  ctx.fill();

  // Right Wingtip (Starboard Green)
  ctx.beginPath();
  ctx.arc(25.5, 11, 2, 0, Math.PI * 2);
  ctx.fillStyle = '#10b981';
  ctx.fill();

  // Tail Strobe (White)
  ctx.beginPath();
  ctx.arc(0, 28.5, 1.8, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
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
          scale: isSelected ? 1.25 : 1.0,
          id: ac.id,
          show: isVisible,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          heightReference: Cesium.HeightReference.NONE,
          scaleByDistance: new Cesium.NearFarScalar(1.0e3, 1.25, 2.5e7, 0.95),
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
          billboard.scale = isSelected ? 1.25 : 1.0;
          billboard._currentTextureKey = textureKey;
        }
      }

      // --- 2. Callsign Label ---
      let label = this.labels.get(ac.id);
      const labelText = ac.callsign || ac.id.toUpperCase();

      if (!label) {
        label = this.labelCollection.add({
          position,
          text: labelText,
          font: 'bold 11px "JetBrains Mono", ui-monospace, monospace',
          fillColor: isSelected ? Cesium.Color.fromCssColorString('#00f0ff') : Cesium.Color.WHITE,
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 3,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          pixelOffset: new Cesium.Cartesian2(0, isSelected ? 30 : 25),
          show: isVisible,
          showBackground: true,
          backgroundColor: isSelected
            ? Cesium.Color.fromCssColorString('rgba(0, 240, 255, 0.4)')
            : Cesium.Color.fromCssColorString('rgba(3, 7, 18, 0.85)'),
          backgroundPadding: new Cesium.Cartesian2(5, 2),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          scaleByDistance: new Cesium.NearFarScalar(1.0e3, 1.1, 1.6e7, 0.75),
          id: ac.id,
        });
        this.labels.set(ac.id, label);
      } else {
        label.show = isVisible;
        label.position = position;
        if (label.text !== labelText) label.text = labelText;
        label.fillColor = isSelected ? Cesium.Color.fromCssColorString('#00f0ff') : Cesium.Color.WHITE;
        label.backgroundColor = isSelected
          ? Cesium.Color.fromCssColorString('rgba(0, 240, 255, 0.4)')
          : Cesium.Color.fromCssColorString('rgba(3, 7, 18, 0.85)');
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
