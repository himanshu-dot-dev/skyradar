import React, { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import { useGlobeStore, type ImageryLayerType } from '../../store/globeStore';

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

  const imageryLayer = useGlobeStore((s) => s.imageryLayer);
  const enableLighting = useGlobeStore((s) => s.enableLighting);
  const showAtmosphere = useGlobeStore((s) => s.showAtmosphere);
  const selectedHub = useGlobeStore((s) => s.selectedHub);

  // Initialize Cesium Viewer
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

    // Smooth camera inertia & limits
    scene.screenSpaceCameraController.enableCollisionDetection = true;
    scene.screenSpaceCameraController.minimumZoomDistance = 500; // 500m
    scene.screenSpaceCameraController.maximumZoomDistance = 45000000; // 45,000km

    // Initial Camera Position: High orbit over Europe / Atlantic / Africa
    viewer.camera.setView({
      destination: Cesium.Cartesian3.fromDegrees(10.0, 25.0, 22000000),
      orientation: {
        heading: Cesium.Math.toRadians(0),
        pitch: Cesium.Math.toRadians(-90),
        roll: 0,
      },
    });

    const handle: CesiumGlobeHandle = {
      flyToHome: () => {
        viewer.camera.flyTo({
          destination: Cesium.Cartesian3.fromDegrees(10.0, 25.0, 22000000),
          orientation: {
            heading: Cesium.Math.toRadians(0),
            pitch: Cesium.Math.toRadians(-90),
            roll: 0,
          },
          duration: 2.2,
        });
      },
      flyToHub: (lat: number, lon: number, height = 180000) => {
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
