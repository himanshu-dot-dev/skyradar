import * as Cesium from 'cesium';

export type WeatherProviderType = 'rainviewer' | 'openweathermap' | 'nasa' | 'none';

export class WeatherRadarLayer {
  private viewer: Cesium.Viewer;
  private weatherImageryLayer: Cesium.ImageryLayer | null = null;
  private isVisible = false;
  private currentProvider: WeatherProviderType = 'none';
  private rainViewerPath: string | null = null;
  private rainViewerHost = 'https://tilecache.rainviewer.com';

  constructor(viewer: Cesium.Viewer) {
    this.viewer = viewer;
  }

  /**
   * Fetches the latest live Doppler radar tile path from RainViewer
   */
  private async fetchLatestRainViewerTimestamp(): Promise<string | null> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);
      const res = await fetch('https://api.rainviewer.com/public/weather-maps.json', {
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) return null;
      const data = await res.json();
      if (data.host) this.rainViewerHost = data.host;
      if (data.radar?.past && data.radar.past.length > 0) {
        const latest = data.radar.past[data.radar.past.length - 1];
        return latest.path;
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Toggles the weather overlay with automatic multi-provider failover:
   * 1. RainViewer (Primary: Global live Doppler precipitation radar)
   * 2. OpenWeatherMap (Secondary: Uses VITE_OPENWEATHER_API_KEY if activated)
   * 3. NASA GIBS (Tertiary: Global satellite clouds & precipitation fallback)
   */
  public async setVisible(
    show: boolean,
    onStatusChange?: (provider: WeatherProviderType, label: string) => void
  ) {
    if (this.isVisible === show && this.weatherImageryLayer) return;
    this.isVisible = show;

    if (!show) {
      if (this.weatherImageryLayer && !this.viewer.isDestroyed()) {
        this.viewer.imageryLayers.remove(this.weatherImageryLayer, true);
        this.weatherImageryLayer = null;
      }
      this.currentProvider = 'none';
      onStatusChange?.('none', 'Weather Radar Off');
      return;
    }

    // --- Provider 1: RainViewer Global Doppler Radar ---
    try {
      const path = await this.fetchLatestRainViewerTimestamp();
      if (path && !this.viewer.isDestroyed()) {
        this.rainViewerPath = path;
        const provider = new Cesium.UrlTemplateImageryProvider({
          url: `${this.rainViewerHost}${path}/256/{z}/{x}/{y}/2/1_1.png`,
          maximumLevel: 7, // RainViewer public feed provides up to level 7; Cesium automatically upsamples for close-ups
        });

        this.applyLayer(provider, 0.72);
        this.currentProvider = 'rainviewer';
        onStatusChange?.('rainviewer', '🌧️ Doppler Weather Radar (RainViewer live)');
        return;
      }
    } catch (e) {
      console.warn('[WeatherRadarLayer] RainViewer unavailable, trying secondary failover...', e);
    }

    // --- Provider 2: OpenWeatherMap (if API key active) ---
    const owmKey = import.meta.env.VITE_OPENWEATHER_API_KEY;
    if (owmKey && owmKey !== 'your_actual_api_key_here') {
      try {
        const testRes = await fetch(
          `https://tile.openweathermap.org/map/precipitation_new/1/0/0.png?appid=${owmKey}`
        );
        if (testRes.ok && !this.viewer.isDestroyed()) {
          const provider = new Cesium.UrlTemplateImageryProvider({
            url: `https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=${owmKey}`,
            maximumLevel: 10,
          });

          this.applyLayer(provider, 0.68);
          this.currentProvider = 'openweathermap';
          onStatusChange?.('openweathermap', '🌧️ Weather Precipitation (OpenWeatherMap)');
          return;
        }
      } catch (e) {
        console.warn('[WeatherRadarLayer] OpenWeatherMap failover check failed, switching to NASA GIBS...', e);
      }
    }

    // --- Provider 3: NASA GIBS Global Satellite Clouds & Rain Fallback ---
    try {
      if (!this.viewer.isDestroyed()) {
        const provider = new Cesium.UrlTemplateImageryProvider({
          url: 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_CorrectedReflectance_TrueColor/default/default/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg',
          maximumLevel: 8,
        });

        this.applyLayer(provider, 0.55);
        this.currentProvider = 'nasa';
        onStatusChange?.('nasa', '🛰️ Global Satellite Cloud Cover (NASA GIBS)');
      }
    } catch (e) {
      console.error('[WeatherRadarLayer] All weather providers failed:', e);
      onStatusChange?.('none', 'Weather Radar Unavailable');
    }
  }

  private applyLayer(provider: Cesium.ImageryProvider, alpha: number) {
    if (this.weatherImageryLayer && !this.viewer.isDestroyed()) {
      this.viewer.imageryLayers.remove(this.weatherImageryLayer, true);
    }
    this.weatherImageryLayer = this.viewer.imageryLayers.addImageryProvider(provider);
    this.weatherImageryLayer.alpha = alpha;
  }

  public getCurrentProvider(): WeatherProviderType {
    return this.currentProvider;
  }

  public destroy() {
    if (this.weatherImageryLayer && !this.viewer.isDestroyed()) {
      this.viewer.imageryLayers.remove(this.weatherImageryLayer, true);
      this.weatherImageryLayer = null;
    }
  }
}
