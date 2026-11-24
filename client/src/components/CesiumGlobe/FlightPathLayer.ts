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
    ctx.strokeStyle = '#5b8cb4';
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
    const alt = Math.max(100, altitudeMeters);
    for (let i = 0; i <= segments; i++) {
      const f = startF + (endF - startF) * (i / segments);
      const pt = interpolateGreatCircle(origin, dest, f);
      coords.push(Cesium.Cartesian3.fromDegrees(pt.longitude, pt.latitude, alt));
    }
    return coords;
  }

  /**
   * Generates a smooth great-circle flight trajectory segment between two points with realistic elevation:
   * isClimb = true: climbs from 300m runway elevation at start to cruiseAlt at end
   * isClimb = false: cruises at cruiseAlt, then descends to 300m runway elevation at destination
   */
  private generateSegmentArc(
    start: { latitude: number; longitude: number },
    end: { latitude: number; longitude: number },
    cruiseAlt: number,
    isClimb: boolean,
    segments = 25
  ): Cesium.Cartesian3[] {
    const coords: Cesium.Cartesian3[] = [];
    const minAlt = Math.max(300, cruiseAlt);

    for (let i = 0; i <= segments; i++) {
      const f = i / segments;
      const pt = interpolateGreatCircle(start, end, f);

      let pointAlt = minAlt;
      if (isClimb) {
        // Climb out from runway (300m) to cruising altitude over the first 25% of the segment
        const climbWindow = 0.25;
        if (f < climbWindow) {
          pointAlt = 300 + (minAlt - 300) * Math.sin((f / climbWindow) * (Math.PI / 2));
        }
      } else {
        // Cruise, then descend from cruising altitude to runway (300m) over the final 25% of the segment
        const descentWindow = 0.25;
        if (f > 1.0 - descentWindow) {
          pointAlt = 300 + (minAlt - 300) * Math.sin(((1.0 - f) / descentWindow) * (Math.PI / 2));
        }
      }

      coords.push(Cesium.Cartesian3.fromDegrees(pt.longitude, pt.latitude, pointAlt));
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

      const hasAirportRoute = Boolean(selectedAircraft.route);

      if (hasAirportRoute && selectedAircraft.route) {
        const route = selectedAircraft.route;
        pastPositions = this.generateSegmentArc(
          route.originPosition,
          selectedAircraft.position,
          alt,
          true,
          25
        );
        futurePositions = this.generateSegmentArc(
          selectedAircraft.position,
          route.destinationPosition,
          alt,
          false,
          25
        );
        originPos = Cesium.Cartesian3.fromDegrees(route.originPosition.longitude, route.originPosition.latitude, 300);
        destPos = Cesium.Cartesian3.fromDegrees(route.destinationPosition.longitude, route.destinationPosition.latitude, 300);
        depBadgeText = `DEP: ${route.originCode} (${route.originCity})`;
        arrBadgeText = `ARR: ${route.destinationCode} (${route.destinationCity})`;
      } else {
        // En-route ADS-B flight: Navigation flight vector at CRUISING ALTITUDE (never plunge into the ocean!)
        const heading = selectedAircraft.movement.heading;
        const speed = Math.max(150, selectedAircraft.movement.speedKnots);
        const trailKm = Math.min(250, speed * 0.45);
        const projKm = Math.min(400, speed * 0.7);

        const pastPt = calculateDestinationPoint(selectedAircraft.position, (heading + 180) % 360, trailKm);
        const futurePt = calculateDestinationPoint(selectedAircraft.position, heading, projKm);

        pastPositions = this.generateArc(pastPt, selectedAircraft.position, 0.0, 1.0, alt, 20);
        futurePositions = this.generateArc(selectedAircraft.position, futurePt, 0.0, 1.0, alt, 20);

        // Keep positions at flight cruising altitude (never drop to 300m in the sea)
        originPos = Cesium.Cartesian3.fromDegrees(pastPt.longitude, pastPt.latitude, alt);
        destPos = Cesium.Cartesian3.fromDegrees(futurePt.longitude, futurePt.latitude, alt);

        depBadgeText = '';
        arrBadgeText = `VECTOR: HDG ${heading}° (${speed} kts)`;
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
            color: Cesium.Color.fromCssColorString('#5b8cb4'),
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

      // Origin Pin & Label (ONLY shown for authentic airport routes on land!)
      if (hasAirportRoute) {
        if (!this.originLabel) {
          this.originLabel = this.labelCollection.add({
            position: originPos,
            text: depBadgeText,
            font: '600 24px "JetBrains Mono", monospace',
            scale: 0.5,
            fillColor: Cesium.Color.WHITE,
            style: Cesium.LabelStyle.FILL,
            show: isOriginVisible,
            showBackground: true,
            backgroundColor: Cesium.Color.fromCssColorString('rgba(16, 185, 129, 0.95)'),
            backgroundPadding: new Cesium.Cartesian2(16, 8),
            pixelOffset: new Cesium.Cartesian2(0, -22),
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          });
        } else {
          this.originLabel.show = isOriginVisible;
          this.originLabel.position = originPos;
          if (this.originLabel.text !== depBadgeText) {
            this.originLabel.text = depBadgeText;
          }
        }
      } else if (this.originLabel) {
        this.originLabel.show = false;
      }

      // Destination / Forward Vector Pin & Label (2x Supersampled)
      if (!this.destLabel) {
        this.destLabel = this.labelCollection.add({
          position: destPos,
          text: arrBadgeText,
          font: '600 24px "JetBrains Mono", monospace',
          scale: 0.5,
          fillColor: hasAirportRoute ? Cesium.Color.WHITE : Cesium.Color.fromCssColorString('#38bdf8'),
          style: Cesium.LabelStyle.FILL,
          show: isDestVisible,
          showBackground: true,
          backgroundColor: hasAirportRoute
            ? Cesium.Color.fromCssColorString('rgba(217, 119, 6, 0.95)')
            : Cesium.Color.fromCssColorString('rgba(8, 15, 30, 0.92)'),
          backgroundPadding: new Cesium.Cartesian2(16, 8),
          pixelOffset: new Cesium.Cartesian2(0, -22),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        });
      } else {
        this.destLabel.show = isDestVisible;
        this.destLabel.position = destPos;
        if (this.destLabel.text !== arrBadgeText) {
          this.destLabel.text = arrBadgeText;
        }
        this.destLabel.fillColor = hasAirportRoute ? Cesium.Color.WHITE : Cesium.Color.fromCssColorString('#38bdf8');
        this.destLabel.backgroundColor = hasAirportRoute
          ? Cesium.Color.fromCssColorString('rgba(217, 119, 6, 0.95)')
          : Cesium.Color.fromCssColorString('rgba(8, 15, 30, 0.92)');
      }

      // Ground radar beacons at airport endpoints (ONLY for real airport routes on land!)
      if (hasAirportRoute) {
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
        if (this.originBillboard) this.originBillboard.show = false;
        if (this.destBillboard) this.destBillboard.show = false;
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
