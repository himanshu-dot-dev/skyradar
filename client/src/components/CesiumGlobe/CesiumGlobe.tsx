import React, { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import { useGlobeStore, type ImageryLayerType } from '../../store/globeStore';
import { useAircraftStore, matchesFilters } from '../../store/aircraftStore';
import { AircraftLayer } from './AircraftLayer';
import { FlightPathLayer } from './FlightPathLayer';
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
  getViewer: () => Cesium.Viewer | null;
}

interface CesiumGlobeProps {
  onViewerReady?: (handle: CesiumGlobeHandle) => void;
}

const loadImageryProvider = async (type: ImageryLayerType): Promise<Cesium.ImageryProvider> => {
  if (type === 'dark-radar') {
    return new Cesium.UrlTemplateImageryProvider({
      url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      subdomains: ['a', 'b', 'c', 'd'],
      maximumLevel: 19,
      credit: new Cesium.Credit('© OpenStreetMap, © CARTO', true),
    });
  }

  if (type === 'natural-earth') {
    return await Cesium.TileMapServiceImageryProvider.fromUrl(
      Cesium.buildModuleUrl('Assets/Textures/NaturalEarthII'),
      {
        fileExtension: 'jpg',
        credit: new Cesium.Credit('Natural Earth II (Offline)', true),
      }
    );
  }

  // Default: NASA GIBS Blue Marble Next Generation WMTS
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
  const simTrafficRef = useRef<SimulatedTrafficGenerator | null>(null);
  const liveTrafficRef = useRef<LiveTrafficService | null>(null);
  const lastLivePollRef = useRef<number>(0);
  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());
  const wasFollowingRef = useRef<boolean>(false);

  const imageryLayer = useGlobeStore((s) => s.imageryLayer);
  const enableLighting = useGlobeStore((s) => s.enableLighting);
  const showAtmosphere = useGlobeStore((s) => s.showAtmosphere);
  const showFlightPaths = useGlobeStore((s) => s.showFlightPaths);
  const selectedHub = useGlobeStore((s) => s.selectedHub);

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

    // Smooth camera limits
    scene.screenSpaceCameraController.enableCollisionDetection = true;
    scene.screenSpaceCameraController.minimumZoomDistance = 500;
    scene.screenSpaceCameraController.maximumZoomDistance = 45000000;

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

    // Initialize Simulation Engine & Live Traffic Service
    const simTraffic = new SimulatedTrafficGenerator();
    simTrafficRef.current = simTraffic;
    const liveTraffic = new LiveTrafficService();
    liveTrafficRef.current = liveTraffic;

    // Initial populate: Boot directly into live ADS-B by default!
    if (!useAircraftStore.getState().isSimulatedMode) {
      liveTraffic.fetchLive().then((list) => {
        if (list && list.length > 0) {
          useAircraftStore.getState().setAircraftList(list);
          aircraftLayer.update(list, null);
          flightPathLayer.update(list, null);
        }
      });
    } else {
      const initialList = simTraffic.update(0);
      useAircraftStore.getState().setAircraftList(initialList);
      aircraftLayer.update(initialList, null);
      flightPathLayer.update(initialList, null);
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
        // Poll backend live feed every 6.5s or immediately if empty
        if (currentTime - lastLivePollRef.current > 6500 || liveTraffic.getAircraftList().length === 0) {
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
      const filters = useAircraftStore.getState().filters;

      useAircraftStore.getState().setAircraftList(updatedList);

      const displayedList = filters.filterOnGlobe
        ? updatedList.filter((ac) => ac.id === currentSelectedId || matchesFilters(ac, filters))
        : updatedList;

      aircraftLayer.update(displayedList, currentSelectedId);
      flightPathLayer.update(displayedList, currentSelectedId);

      // Camera Follow tracking logic
      if (followingActive && currentSelectedId) {
        const targetAircraft = updatedList.find((ac) => ac.id === currentSelectedId);
        if (targetAircraft) {
          const targetPos = Cesium.Cartesian3.fromDegrees(
            targetAircraft.position.longitude,
            targetAircraft.position.latitude,
            targetAircraft.position.altitudeMeters
          );

          viewer.camera.lookAt(
            targetPos,
            new Cesium.HeadingPitchRange(
              Cesium.Math.toRadians(targetAircraft.movement.heading - 180),
              Cesium.Math.toRadians(-35),
              65000
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
            pitch: Cesium.Math.toRadians(-55),
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
      getViewer: () => viewer,
    };

    if (onViewerReady) {
      onViewerReady(handle);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (aircraftLayerRef.current) {
        aircraftLayerRef.current.destroy();
      }
      if (flightPathLayerRef.current) {
        flightPathLayerRef.current.destroy();
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

  // React to selected aviation hub
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed() || !selectedHub) return;

    if (wasFollowingRef.current) {
      viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
      wasFollowingRef.current = false;
    }

    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(
        selectedHub.longitude,
        selectedHub.latitude,
        selectedHub.cameraHeight
      ),
      orientation: {
        heading: Cesium.Math.toRadians(0),
        pitch: Cesium.Math.toRadians(-55),
        roll: 0,
      },
      duration: 2.5,
    });
  }, [selectedHub]);

  return <div ref={containerRef} className="cesium-viewer-container" />;
};
