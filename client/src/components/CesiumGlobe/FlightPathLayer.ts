import * as Cesium from 'cesium';
import type { NormalizedAircraft } from '@shared/types';
import { interpolateGreatCircle } from '../../utils/geoMath';

export class FlightPathLayer {
  private viewer: Cesium.Viewer;
  private polylineCollection: Cesium.PolylineCollection;
  private labelCollection: Cesium.LabelCollection;
  private billboardCollection: Cesium.BillboardCollection;

  // Selected aircraft flight path lines
  private selectedPastPolyline: Cesium.Polyline | null = null;
  private selectedFuturePolyline: Cesium.Polyline | null = null;

  // All flights subtle route paths
  private routePolylines: Map<string, Cesium.Polyline> = new Map();

  // Waypoint labels for origin and destination
  private originLabel: Cesium.Label | null = null;
  private destLabel: Cesium.Label | null = null;
  private originBillboard: Cesium.Billboard | null = null;
  private destBillboard: Cesium.Billboard | null = null;

  private currentSelectedId: string | null = null;
  private airportPinTexture: string | null = null;
  private occluder: Cesium.EllipsoidalOccluder;

  constructor(viewer: Cesium.Viewer) {
    this.viewer = viewer;
    this.occluder = new Cesium.EllipsoidalOccluder(
      viewer.scene.globe.ellipsoid,
      viewer.camera.positionWC
    );

    this.polylineCollection = new Cesium.PolylineCollection();
    viewer.scene.primitives.add(this.polylineCollection);

    this.labelCollection = new Cesium.LabelCollection({
      scene: viewer.scene,
    });
    viewer.scene.primitives.add(this.labelCollection);

    this.billboardCollection = new Cesium.BillboardCollection({
      scene: viewer.scene,
    });
    viewer.scene.primitives.add(this.billboardCollection);

    this.airportPinTexture = this.createAirportPinTexture();
  }

  private createAirportPinTexture(): string {
    const canvas = document.createElement('canvas');
    canvas.width = 24;
    canvas.height = 24;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    // Concentric radar ring
    ctx.beginPath();
    ctx.arc(12, 12, 9, 0, Math.PI * 2);
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(12, 12, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    return canvas.toDataURL();
  }

  /**
   * Generates great-circle Cartesian3 positions between two fractions of a route
   */
  private generateArc(
    origin: { latitude: number; longitude: number },
    dest: { latitude: number; longitude: number },
    startF: number,
    endF: number,
    altitudeMeters: number,
    segments = 25
  ): Cesium.Cartesian3[] {
    const coords: Cesium.Cartesian3[] = [];
    for (let i = 0; i <= segments; i++) {
      const f = startF + (endF - startF) * (i / segments);
      const pt = interpolateGreatCircle(origin, dest, f);
      coords.push(Cesium.Cartesian3.fromDegrees(pt.longitude, pt.latitude, Math.max(8000, altitudeMeters)));
    }
    return coords;
  }

  /**
   * Updates flight paths and waypoint badges
   */
  public update(
    aircraftList: NormalizedAircraft[],
    selectedId: string | null,
    showAllPaths: boolean
  ) {
    this.currentSelectedId = selectedId;
    this.occluder.cameraPosition = this.viewer.camera.positionWC;
    const activeRouteIds = new Set<string>();

    // --- 1. Global Dotted Paths for Visible Fleet ---
    if (showAllPaths) {
      for (const ac of aircraftList) {
        if (!ac.route) continue;

        let polyline = this.routePolylines.get(ac.id);
        const arcPositions = this.generateArc(
          ac.route.originPosition,
          ac.route.destinationPosition,
          0.0,
          1.0,
          ac.position.altitudeMeters,
          20
        );

        // Horizon occlusion: check if any part of the route is facing camera
        const originVis = this.occluder.isPointVisible(arcPositions[0]);
        const destVis = this.occluder.isPointVisible(arcPositions[arcPositions.length - 1]);
        const midVis = this.occluder.isPointVisible(arcPositions[Math.floor(arcPositions.length / 2)]);
        const isRouteVisible = originVis || destVis || midVis;

        activeRouteIds.add(ac.id);

        if (!polyline) {
          polyline = this.polylineCollection.add({
            positions: arcPositions,
            width: 1.6,
            show: isRouteVisible,
            material: Cesium.Material.fromType('PolylineDash', {
              color: Cesium.Color.fromCssColorString('rgba(0, 240, 255, 0.28)'),
              gapColor: Cesium.Color.TRANSPARENT,
              dashLength: 14.0,
              dashPattern: 255,
            }),
          });
          this.routePolylines.set(ac.id, polyline);
        } else {
          polyline.show = isRouteVisible;
          polyline.positions = arcPositions;
        }
      }
    }

    // Clean up stale or disabled route polylines
    for (const [id, poly] of this.routePolylines.entries()) {
      if (!showAllPaths || !activeRouteIds.has(id)) {
        this.polylineCollection.remove(poly);
        this.routePolylines.delete(id);
      }
    }

    // --- 2. Detailed Dotted Path for Selected Aircraft ---
    const selectedAircraft = selectedId ? aircraftList.find((ac) => ac.id === selectedId) : null;

    if (selectedAircraft && selectedAircraft.route) {
      const route = selectedAircraft.route;
      const progress = Math.max(0.01, Math.min(0.99, route.progress));
      const alt = selectedAircraft.position.altitudeMeters;

      // A) Where it came from (Past route: Origin -> Current Position)
      const pastPositions = this.generateArc(
        route.originPosition,
        route.destinationPosition,
        0.0,
        progress,
        alt,
        25
      );

      if (!this.selectedPastPolyline) {
        this.selectedPastPolyline = this.polylineCollection.add({
          positions: pastPositions,
          width: 2.8,
          material: Cesium.Material.fromType('PolylineDash', {
            color: Cesium.Color.fromCssColorString('#00f0ff'),
            gapColor: Cesium.Color.TRANSPARENT,
            dashLength: 16.0,
            dashPattern: 255,
          }),
        });
      } else {
        this.selectedPastPolyline.show = true;
        this.selectedPastPolyline.positions = pastPositions;
      }

      // B) Where it is going (Future route: Current Position -> Destination)
      const futurePositions = this.generateArc(
        route.originPosition,
        route.destinationPosition,
        progress,
        1.0,
        alt,
        25
      );

      if (!this.selectedFuturePolyline) {
        this.selectedFuturePolyline = this.polylineCollection.add({
          positions: futurePositions,
          width: 2.2,
          material: Cesium.Material.fromType('PolylineDash', {
            color: Cesium.Color.fromCssColorString('rgba(148, 163, 184, 0.75)'),
            gapColor: Cesium.Color.TRANSPARENT,
            dashLength: 16.0,
            dashPattern: 255,
          }),
        });
      } else {
        this.selectedFuturePolyline.show = true;
        this.selectedFuturePolyline.positions = futurePositions;
      }

      // C) Origin & Destination Waypoint Badges on the Globe
      const originPos = Cesium.Cartesian3.fromDegrees(
        route.originPosition.longitude,
        route.originPosition.latitude,
        300
      );
      const destPos = Cesium.Cartesian3.fromDegrees(
        route.destinationPosition.longitude,
        route.destinationPosition.latitude,
        300
      );

      const isOriginVisible = this.occluder.isPointVisible(originPos);
      const isDestVisible = this.occluder.isPointVisible(destPos);

      // Past path visibility (origin to current aircraft)
      const pastVisible = isOriginVisible || this.occluder.isPointVisible(pastPositions[pastPositions.length - 1]);
      if (this.selectedPastPolyline) {
        this.selectedPastPolyline.show = pastVisible;
      }

      // Future path visibility (current aircraft to destination)
      const futureVisible = isDestVisible || this.occluder.isPointVisible(futurePositions[0]);
      if (this.selectedFuturePolyline) {
        this.selectedFuturePolyline.show = futureVisible;
      }

      // Origin Pin & Label
      if (!this.originLabel) {
        this.originLabel = this.labelCollection.add({
          position: originPos,
          text: `🛫 DEP: ${route.originCode} (${route.originCity})`,
          font: 'bold 12px "JetBrains Mono", monospace',
          fillColor: Cesium.Color.WHITE,
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 3,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          show: isOriginVisible,
          showBackground: true,
          backgroundColor: Cesium.Color.fromCssColorString('rgba(16, 185, 129, 0.85)'),
          backgroundPadding: new Cesium.Cartesian2(6, 4),
          pixelOffset: new Cesium.Cartesian2(0, -22),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        });
      } else {
        this.originLabel.show = isOriginVisible;
        this.originLabel.position = originPos;
        this.originLabel.text = `🛫 DEP: ${route.originCode} (${route.originCity})`;
      }

      // Destination Pin & Label
      if (!this.destLabel) {
        this.destLabel = this.labelCollection.add({
          position: destPos,
          text: `🛬 ARR: ${route.destinationCode} (${route.destinationCity})`,
          font: 'bold 12px "JetBrains Mono", monospace',
          fillColor: Cesium.Color.WHITE,
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 3,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          show: isDestVisible,
          showBackground: true,
          backgroundColor: Cesium.Color.fromCssColorString('rgba(245, 158, 11, 0.85)'),
          backgroundPadding: new Cesium.Cartesian2(6, 4),
          pixelOffset: new Cesium.Cartesian2(0, -22),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        });
      } else {
        this.destLabel.show = isDestVisible;
        this.destLabel.position = destPos;
        this.destLabel.text = `🛬 ARR: ${route.destinationCode} (${route.destinationCity})`;
      }

      // Ground radar beacons at airports
      if (!this.originBillboard && this.airportPinTexture) {
        this.originBillboard = this.billboardCollection.add({
          position: originPos,
          image: this.airportPinTexture,
          show: isOriginVisible,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          scale: 0.9,
        });
      } else if (this.originBillboard) {
        this.originBillboard.show = isOriginVisible;
        this.originBillboard.position = originPos;
      }

      if (!this.destBillboard && this.airportPinTexture) {
        this.destBillboard = this.billboardCollection.add({
          position: destPos,
          image: this.airportPinTexture,
          show: isDestVisible,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          scale: 0.9,
        });
      } else if (this.destBillboard) {
        this.destBillboard.show = isDestVisible;
        this.destBillboard.position = destPos;
      }
    } else {
      // Hide selected route elements if none selected
      if (this.selectedPastPolyline) this.selectedPastPolyline.show = false;
      if (this.selectedFuturePolyline) this.selectedFuturePolyline.show = false;
      if (this.originLabel) this.originLabel.show = false;
      if (this.destLabel) this.destLabel.show = false;
      if (this.originBillboard) this.originBillboard.show = false;
      if (this.destBillboard) this.destBillboard.show = false;
    }
  }

  public destroy() {
    if (!this.viewer.isDestroyed()) {
      this.viewer.scene.primitives.remove(this.polylineCollection);
      this.viewer.scene.primitives.remove(this.labelCollection);
      this.viewer.scene.primitives.remove(this.billboardCollection);
    }
    this.routePolylines.clear();
    this.selectedPastPolyline = null;
    this.selectedFuturePolyline = null;
    this.originLabel = null;
    this.destLabel = null;
    this.originBillboard = null;
    this.destBillboard = null;
  }
}
