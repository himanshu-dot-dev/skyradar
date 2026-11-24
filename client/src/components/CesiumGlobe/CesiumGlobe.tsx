import React, { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import { useGlobeStore, type ImageryLayerType } from '../../store/globeStore';
import { useAircraftStore } from '../../store/aircraftStore';
import { AircraftLayer } from './AircraftLayer';
import { FlightPathLayer } from './FlightPathLayer';
import { WeatherRadarLayer, type WeatherProviderType } from './WeatherRadarLayer';
import { SimulatedTrafficGenerator } from '../../services/simulatedTraffic';
import { LiveTrafficService } from '../../services/liveTraffic';
import type { NormalizedAircraft } from '@shared/types';

// Explicitly set Cesium base URL for static assets/workers and suppress Ion warnings
(Cesium.buildModuleUrl as any).setBaseUrl('/cesium/');
Cesium.Ion.defaultAccessToken = '';

export interface CesiumGlobeHandle {
  flyToHome: () => void;
  flyToHub: (lat: number, lon: number, height?: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetHeading: () => void;
  setWeatherVisible: (
    show: boolean,
    onStatusChange?: (provider: WeatherProviderType, label: string) => void
  ) => Promise<void>;
  getViewer: () => Cesium.Viewer | null;
}

interface CesiumGlobeProps {
  onViewerReady?: (handle: CesiumGlobeHandle) => void;
}

const loadImageryProvider = async (type: ImageryLayerType): Promise<Cesium.ImageryProvider> => {
  if (type === 'dark-radar') {
    return new Cesium.UrlTemplateImageryProvider({
      url: 'https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
      maximumLevel: 16,
      credit: new Cesium.Credit('Esri Dark Canvas', true),
    });
  }

  // NASA GIBS Blue Marble Next Generation WMTS
  return new Cesium.WebMapTileServiceImageryProvider({
    url: 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/BlueMarble_NextGeneration/default/GoogleMapsCompatible_Level8/{TileMatrix}/{TileRow}/{TileCol}.jpg',
    layer: 'BlueMarble_NextGeneration',
    style: 'default',
    format: 'image/jpeg',
    tileMatrixSetID: 'GoogleMapsCompatible_Level8',
    maximumLevel: 8,
    credit: new Cesium.Credit('NASA EOSDIS GIBS', true),
  });
};

export const CesiumGlobe: React.FC<CesiumGlobeProps> = ({ onViewerReady }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Cesium.Viewer | null>(null);
  const aircraftLayerRef = useRef<AircraftLayer | null>(null);
  const flightPathLayerRef = useRef<FlightPathLayer | null>(null);
  const weatherRadarLayerRef = useRef<WeatherRadarLayer | null>(null);
  const simTrafficRef = useRef<SimulatedTrafficGenerator | null>(null);
  const liveTrafficRef = useRef<LiveTrafficService | null>(null);
  const lastLivePollRef = useRef<number>(0);
  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());
  const wasFollowingRef = useRef<boolean>(false);

  const imageryLayer = useGlobeStore((s) => s.imageryLayer);
  const enableLighting = useGlobeStore((s) => s.enableLighting);
  const showAtmosphere = useGlobeStore((s) => s.showAtmosphere);

  // Initialize Cesium Viewer, Aircraft Layer & Flight Path Layer
  useEffect(() => {
    if (!containerRef.current) return;

    const viewer = new Cesium.Viewer(containerRef.current, {
      animation: false,
      baseLayerPicker: false,
      fullscreenButton: false,
      geocoder: false,
      homeButton: false,
      infoBox: false,
      sceneModePicker: false,
      selectionIndicator: false,
      timeline: false,
      navigationHelpButton: false,
      navigationInstructionsInitiallyVisible: false,
      scene3DOnly: true,
      shouldAnimate: true,
      baseLayer: false,
      skyAtmosphere: new Cesium.SkyAtmosphere(),
      contextOptions: {
        webgl: {
          alpha: false,
          antialias: true,
          powerPreference: 'high-performance',
        },
      },
    });

    viewerRef.current = viewer;
    (window as any).__viewer = viewer;

    // Support High-DPI / Retina displays for razor-sharp typography and textures
    viewer.useBrowserRecommendedResolution = false;
    viewer.resolutionScale = Math.min(2.0, window.devicePixelRatio || 1.0);

    // Load initial imagery
    loadImageryProvider(imageryLayer).then((provider) => {
      if (viewer && !viewer.isDestroyed()) {
        viewer.imageryLayers.removeAll();
        viewer.imageryLayers.addImageryProvider(provider);
      }
    });

    // Scene & Globe aesthetics
    const scene = viewer.scene;
    const globe = scene.globe;

    globe.enableLighting = enableLighting;
    globe.showGroundAtmosphere = showAtmosphere;
    globe.atmosphereLightIntensity = 10.0;
    globe.atmosphereRayleighCoefficient = new Cesium.Cartesian3(5.5e-6, 13.0e-6, 22.4e-6);
    globe.depthTestAgainstTerrain = false;
    scene.backgroundColor = Cesium.Color.fromCssColorString('#02040a');

    // Configure comprehensive mouse, scroll wheel & trackpad zoom controls
    viewer.camera.percentageChanged = 0.002;
    const controller = scene.screenSpaceCameraController;
    controller.enableCollisionDetection = false; // Disabling prevents zoom freeze near surface/angles
    controller.enableZoom = true;
    controller.minimumZoomDistance = 100;
    controller.maximumZoomDistance = 50000000;
    controller.inertiaZoom = 0.4;
    controller.zoomFactor = 10;

    // Enable gesture modes for drag & touch screen pinch
    controller.zoomEventTypes = [
      Cesium.CameraEventType.RIGHT_DRAG,
      Cesium.CameraEventType.PINCH,
      {
        eventType: Cesium.CameraEventType.RIGHT_DRAG,
        modifier: Cesium.KeyboardEventModifier.CTRL,
      },
    ];

    // High-performance adaptive wheel, Ctrl+wheel & trackpad pinch zoom accelerator
    // Anchors zoom directly towards mouse cursor with exponential altitude scaling
    const onCanvasWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const isCtrl = e.ctrlKey;
      const isPixelMode = e.deltaMode === 0;
      const isContinuous = Math.abs(e.deltaY) < 35 && isPixelMode;

      // Normalize delta across input devices and browsers
      let rawDelta = e.deltaY;
      if (e.deltaMode === 1) {
        rawDelta *= 35; // DOM_DELTA_LINE
      } else if (e.deltaMode === 2) {
        rawDelta *= 300; // DOM_DELTA_PAGE
      }

      if (rawDelta === 0) return;

      // Adaptive zoom factor:
      // Trackpad pinch (Ctrl+wheel) & continuous two-finger scrolling emit high-frequency (60Hz) small deltas
      // Discrete physical mouse wheels emit single ~100px notches
      let factor: number;
      if (isCtrl || isContinuous) {
        factor = Math.min(0.25, Math.max(0.02, Math.abs(rawDelta) * 0.016));
      } else {
        factor = Math.min(0.30, Math.max(0.12, Math.abs(rawDelta) * 0.0022));
      }

      const zoomingIn = rawDelta < 0;
      const height = viewer.camera.positionCartographic.height;

      // Altitude safety boundaries
      if (zoomingIn && height <= 100) return;
      if (!zoomingIn && height >= 45000000) return;

      const isTransformed = !Cesium.Matrix4.equals(viewer.camera.transform, Cesium.Matrix4.IDENTITY);

      if (isTransformed) {
        // Locked transform (e.g. camera follow mode on selected aircraft)
        const currentDist = Cesium.Cartesian3.magnitude(viewer.camera.position);
        const zoomDist = Math.max(50, currentDist * factor);
        if (zoomingIn) {
          viewer.camera.zoomIn(zoomDist);
        } else {
          viewer.camera.zoomOut(zoomDist);
        }
        return;
      }

      // Free globe view: Ray-cast to anchor zoom to the cursor position
      const rect = viewer.scene.canvas.getBoundingClientRect();
      const windowPos = new Cesium.Cartesian2(e.clientX - rect.left, e.clientY - rect.top);
      const ray = viewer.camera.getPickRay(windowPos);
      let target: Cesium.Cartesian3 | undefined = undefined;
      if (ray) {
        target = viewer.scene.globe.pick(ray, viewer.scene);
      }

      if (target) {
        const camPos = viewer.camera.positionWC;
        const dir = Cesium.Cartesian3.subtract(target, camPos, new Cesium.Cartesian3());
        const dist = Cesium.Cartesian3.magnitude(dir);
        Cesium.Cartesian3.normalize(dir, dir);

        const moveDist = dist * factor;
        if (zoomingIn) {
          const safeDist = Math.min(moveDist, dist - 100);
          if (safeDist > 0) {
            viewer.camera.move(dir, safeDist);
          }
        } else {
          viewer.camera.move(dir, -moveDist);
        }
      } else {
        // Space / Horizon fallback: zoom along camera view direction
        if (zoomingIn) {
          viewer.camera.zoomIn(height * factor);
        } else {
          viewer.camera.zoomOut(height * factor);
        }
      }
    };

    viewer.scene.canvas.addEventListener('wheel', onCanvasWheel, { capture: true, passive: false });

    // Double-click anywhere on Earth to smoothly zoom in towards the clicked location
    const doubleClickHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    doubleClickHandler.setInputAction((movement: { position: Cesium.Cartesian2 }) => {
      const ray = viewer.camera.getPickRay(movement.position);
      if (!ray) return;
      const cartesian = viewer.scene.globe.pick(ray, viewer.scene);
      if (cartesian) {
        const carto = Cesium.Cartographic.fromCartesian(cartesian);
        const targetHeight = Math.max(1500, viewer.camera.positionCartographic.height * 0.45);
        viewer.camera.flyTo({
          destination: Cesium.Cartesian3.fromRadians(
            carto.longitude,
            carto.latitude,
            targetHeight
          ),
          duration: 1.0,
        });
      }
    }, Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);

    // Initial Camera Position: Focused view of Atlantic & European flight tracks (9,000 km altitude)
    viewer.camera.setView({
      destination: Cesium.Cartesian3.fromDegrees(-15.0, 48.0, 9000000),
      orientation: {
        heading: Cesium.Math.toRadians(0),
        pitch: Cesium.Math.toRadians(-88),
        roll: 0,
      },
    });

    // Initialize Aircraft Layer
    const aircraftLayer = new AircraftLayer(viewer, (id) => {
      useAircraftStore.getState().selectAircraft(id);
    });
    aircraftLayerRef.current = aircraftLayer;
    (window as any).__aircraftLayer = aircraftLayer;

    // Initialize Dotted Flight Path Layer
    const flightPathLayer = new FlightPathLayer(viewer);
    flightPathLayerRef.current = flightPathLayer;
    (window as any).__flightPathLayer = flightPathLayer;

    const weatherLayer = new WeatherRadarLayer(viewer);
    weatherRadarLayerRef.current = weatherLayer;
    (window as any).__weatherRadarLayer = weatherLayer;

    // Initialize Simulation Engine & Live Traffic Service
    const simTraffic = new SimulatedTrafficGenerator();
    simTrafficRef.current = simTraffic;
    const liveTraffic = new LiveTrafficService();
    liveTrafficRef.current = liveTraffic;

    // Initial populate: Boot directly into live ADS-B by default!
    if (!useAircraftStore.getState().isSimulatedMode) {
      liveTraffic.fetchLive().then((list) => {
        if (!viewer || viewer.isDestroyed()) return;
        const validList = list && list.length > 0 ? list : simTraffic.update(0);
        useAircraftStore.getState().setAircraftList(validList);
        aircraftLayer.update(validList, null);
        flightPathLayer.update(validList, null, useGlobeStore.getState().showFlightPaths);
      });
    } else {
      const initialList = simTraffic.update(0);
      useAircraftStore.getState().setAircraftList(initialList);
      aircraftLayer.update(initialList, null);
      flightPathLayer.update(initialList, null, useGlobeStore.getState().showFlightPaths);
    }

    // Animation Loop: updates aircraft position, dotted paths & camera follow
    const loop = (currentTime: number) => {
      if (!viewerRef.current || viewerRef.current.isDestroyed()) return;

      const deltaSeconds = Math.min((currentTime - lastTimeRef.current) / 1000, 0.1);
      lastTimeRef.current = currentTime;

      const isSimMode = useAircraftStore.getState().isSimulatedMode;
      let updatedList: NormalizedAircraft[];

      if (isSimMode) {
        updatedList = simTraffic.update(deltaSeconds);
      } else {
        // Poll backend live feed every 6.5s
        if (currentTime - lastLivePollRef.current > 6500) {
          lastLivePollRef.current = currentTime;
          liveTraffic.fetchLive();
        }
        const liveList = liveTraffic.getAircraftList();
        if (liveList.length > 0) {
          updatedList = liveTraffic.updatePositions(deltaSeconds);
        } else {
          updatedList = simTraffic.update(deltaSeconds);
        }
      }

      const currentSelectedId = useAircraftStore.getState().selectedAircraftId;
      const followingActive = useAircraftStore.getState().isFollowing;
      const pathsEnabled = useGlobeStore.getState().showFlightPaths;

      useAircraftStore.getState().setAircraftList(updatedList);

      aircraftLayer.update(updatedList, currentSelectedId);
      flightPathLayer.update(updatedList, currentSelectedId, pathsEnabled);

      // Camera Follow tracking logic
      if (followingActive && currentSelectedId) {
        const targetAircraft = updatedList.find((ac) => ac.id === currentSelectedId);
        if (targetAircraft) {
          const targetPos = Cesium.Cartesian3.fromDegrees(
            targetAircraft.position.longitude,
            targetAircraft.position.latitude,
            targetAircraft.position.altitudeMeters
          );

          // Preserve distance if user zoomed, or default to 65km chase view
          const currentDist = Cesium.Cartesian3.distance(viewer.camera.positionWC, targetPos);
          const followRange = currentDist > 2000 && currentDist < 2000000 ? currentDist : 65000;

          viewer.camera.lookAt(
            targetPos,
            new Cesium.HeadingPitchRange(
              Cesium.Math.toRadians(targetAircraft.movement.heading - 180),
              Cesium.Math.toRadians(-35),
              followRange
            )
          );
          wasFollowingRef.current = true;
        }
      } else if (wasFollowingRef.current) {
        viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
        wasFollowingRef.current = false;
      }

      animationFrameRef.current = requestAnimationFrame(loop);
    };

    animationFrameRef.current = requestAnimationFrame(loop);

    const handle: CesiumGlobeHandle = {
      flyToHome: () => {
        if (wasFollowingRef.current) {
          viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
          wasFollowingRef.current = false;
        }
        viewer.camera.flyTo({
          destination: Cesium.Cartesian3.fromDegrees(-15.0, 48.0, 9000000),
          orientation: {
            heading: Cesium.Math.toRadians(0),
            pitch: Cesium.Math.toRadians(-88),
            roll: 0,
          },
          duration: 2.2,
        });
      },
      flyToHub: (lat: number, lon: number, height = 180000) => {
        if (wasFollowingRef.current) {
          viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
          wasFollowingRef.current = false;
        }
        viewer.camera.flyTo({
          destination: Cesium.Cartesian3.fromDegrees(lon, lat, height),
          orientation: {
            heading: Cesium.Math.toRadians(0),
            pitch: Cesium.Math.toRadians(-78),
            roll: 0,
          },
          duration: 2.5,
        });
      },
      zoomIn: () => {
        viewer.camera.zoomIn(viewer.camera.positionCartographic.height * 0.45);
      },
      zoomOut: () => {
        viewer.camera.zoomOut(viewer.camera.positionCartographic.height * 0.7);
      },
      resetHeading: () => {
        const currentPos = viewer.camera.positionWC;
        viewer.camera.flyTo({
          destination: currentPos,
          orientation: {
            heading: Cesium.Math.toRadians(0),
            pitch: viewer.camera.pitch,
            roll: 0,
          },
          duration: 1.0,
        });
      },
      setWeatherVisible: (show, onStatusChange) => {
        return weatherLayer.setVisible(show, onStatusChange);
      },
      getViewer: () => viewer,
    };

    if (onViewerReady) {
      onViewerReady(handle);
    }

    return () => {
      viewer.scene.canvas.removeEventListener('wheel', onCanvasWheel, { capture: true });
      if (doubleClickHandler && !doubleClickHandler.isDestroyed()) {
        doubleClickHandler.destroy();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (aircraftLayerRef.current) {
        aircraftLayerRef.current.destroy();
      }
      if (flightPathLayerRef.current) {
        flightPathLayerRef.current.destroy();
      }
      if (weatherRadarLayerRef.current) {
        weatherRadarLayerRef.current.destroy();
      }
      viewer.destroy();
      viewerRef.current = null;
    };
  }, []);

  // Update imagery layer when changed in store
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed()) return;

    loadImageryProvider(imageryLayer).then((provider) => {
      if (viewer && !viewer.isDestroyed()) {
        viewer.imageryLayers.removeAll();
        viewer.imageryLayers.addImageryProvider(provider);
      }
    });
  }, [imageryLayer]);

  // Update day/night sun lighting
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed()) return;
    viewer.scene.globe.enableLighting = enableLighting;
  }, [enableLighting]);

  // Update atmosphere
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed()) return;
    viewer.scene.globe.showGroundAtmosphere = showAtmosphere;
  }, [showAtmosphere]);

  // React to weather radar toggle with multi-provider failover
  const showWeatherRadar = useGlobeStore((s) => s.showWeatherRadar);
  const setActiveWeatherProvider = useGlobeStore((s) => s.setActiveWeatherProvider);

  useEffect(() => {
    if (weatherRadarLayerRef.current) {
      weatherRadarLayerRef.current.setVisible(showWeatherRadar, (provider) => {
        setActiveWeatherProvider(provider);
      });
    }
  }, [showWeatherRadar, setActiveWeatherProvider]);

  return <div ref={containerRef} className="cesium-viewer-container" />;
};
