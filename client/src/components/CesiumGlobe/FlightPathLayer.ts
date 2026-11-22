import * as Cesium from 'cesium';
import type { NormalizedAircraft } from '@shared/types';
import { interpolateGreatCircle, calculateDestinationPoint } from '../../utils/geoMath';

export class FlightPathLayer {
  private viewer: Cesium.Viewer;
  private polylineCollection: Cesium.PolylineCollection;
  private labelCollection: Cesium.LabelCollection;
  private billboardCollection: Cesium.BillboardCollection;

  // Selected aircraft flight path lines
  private selectedPastPolyline: Cesium.Polyline | null = null;
  private selectedFuturePolyline: Cesium.Polyline | null = null;

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
   * Updates flight paths and waypoint badges for the selected aircraft
   */
  public update(
    aircraftList: NormalizedAircraft[],
    selectedId: string | null,
    showFlightPaths = true
  ) {
    if (!this.viewer || this.viewer.isDestroyed()) return;
    this.currentSelectedId = selectedId;
    this.occluder.cameraPosition = this.viewer.camera.positionWC;

    const selectedAircraft = selectedId ? aircraftList.find((ac) => ac.id === selectedId) : null;

    if (showFlightPaths && selectedAircraft && !selectedAircraft.position.isGround) {
      const alt = selectedAircraft.position.altitudeMeters;
      let pastPositions: Cesium.Cartesian3[];
      let futurePositions: Cesium.Cartesian3[];
      let originPos: Cesium.Cartesian3;
      let destPos: Cesium.Cartesian3;
      let depBadgeText: string;
      let arrBadgeText: string;

      if (selectedAircraft.route) {
        const route = selectedAircraft.route;
        const progress = Math.max(0.01, Math.min(0.99, route.progress));
        pastPositions = this.generateArc(route.originPosition, route.destinationPosition, 0.0, progress, alt, 25);
        futurePositions = this.generateArc(route.originPosition, route.destinationPosition, progress, 1.0, alt, 25);
        originPos = Cesium.Cartesian3.fromDegrees(route.originPosition.longitude, route.originPosition.latitude, 300);
        destPos = Cesium.Cartesian3.fromDegrees(route.destinationPosition.longitude, route.destinationPosition.latitude, 300);
        depBadgeText = `🛫 DEP: ${route.originCode} (${route.originCity})`;
        arrBadgeText = `🛬 ARR: ${route.destinationCode} (${route.destinationCity})`;
      } else {
        // Live ADS-B flight: calculate dynamic historical track & projected flight trajectory
        const heading = selectedAircraft.movement.heading;
        const speed = Math.max(150, selectedAircraft.movement.speedKnots);
        const trailKm = Math.min(250, speed * 0.45);
        const projKm = Math.min(400, speed * 0.7);

        const pastPt = calculateDestinationPoint(selectedAircraft.position, (heading + 180) % 360, trailKm);
        const futurePt = calculateDestinationPoint(selectedAircraft.position, heading, projKm);

        pastPositions = this.generateArc(pastPt, selectedAircraft.position, 0.0, 1.0, alt, 20);
        futurePositions = this.generateArc(selectedAircraft.position, futurePt, 0.0, 1.0, alt, 20);

        originPos = Cesium.Cartesian3.fromDegrees(pastPt.longitude, pastPt.latitude, 300);
        destPos = Cesium.Cartesian3.fromDegrees(futurePt.longitude, futurePt.latitude, 300);

        depBadgeText = `🛫 PAST TRAIL (${Math.round(trailKm)} km)`;
        arrBadgeText = `🛬 HDG: ${heading}° (${Math.round(projKm)} km)`;
      }

      // Past path visibility (origin to current aircraft)
      const isOriginVisible = this.occluder.isPointVisible(originPos);
      const isDestVisible = this.occluder.isPointVisible(destPos);
      const pastVisible = isOriginVisible || this.occluder.isPointVisible(pastPositions[pastPositions.length - 1]);
      const futureVisible = isDestVisible || this.occluder.isPointVisible(futurePositions[0]);

      if (!this.selectedPastPolyline) {
        this.selectedPastPolyline = this.polylineCollection.add({
          positions: pastPositions,
          width: 3.5,
          show: pastVisible,
          material: Cesium.Material.fromType('PolylineDash', {
            color: Cesium.Color.fromCssColorString('#00f0ff'),
            gapColor: Cesium.Color.TRANSPARENT,
            dashLength: 16.0,
            dashPattern: 255,
          }),
        });
      } else {
        this.selectedPastPolyline.show = pastVisible;
        this.selectedPastPolyline.positions = pastPositions;
      }

      // Future path visibility (current aircraft to destination)
      if (!this.selectedFuturePolyline) {
        this.selectedFuturePolyline = this.polylineCollection.add({
          positions: futurePositions,
          width: 2.8,
          show: futureVisible,
          material: Cesium.Material.fromType('PolylineDash', {
            color: Cesium.Color.fromCssColorString('rgba(148, 163, 184, 0.85)'),
            gapColor: Cesium.Color.TRANSPARENT,
            dashLength: 16.0,
            dashPattern: 255,
          }),
        });
      } else {
        this.selectedFuturePolyline.show = futureVisible;
        this.selectedFuturePolyline.positions = futurePositions;
      }

      // Origin Pin & Label
      if (!this.originLabel) {
        this.originLabel = this.labelCollection.add({
          position: originPos,
          text: depBadgeText,
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
        this.originLabel.text = depBadgeText;
      }

      // Destination Pin & Label
      if (!this.destLabel) {
        this.destLabel = this.labelCollection.add({
          position: destPos,
          text: arrBadgeText,
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
        this.destLabel.text = arrBadgeText;
      }

      // Ground radar beacons at endpoints
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
    this.selectedPastPolyline = null;
    this.selectedFuturePolyline = null;
    this.originLabel = null;
    this.destLabel = null;
    this.originBillboard = null;
    this.destBillboard = null;
  }
}
