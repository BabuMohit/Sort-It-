import { PerformanceMonitorService } from '../PerformanceMonitorService';

// Mock performance API
const mockPerformance = {
  now: jest.fn(() => Date.now()),
  memory: {
    usedJSHeapSize: 50 * 1024 * 1024, // 50MB
  },
};

// Mock PerformanceObserver
const mockPerformanceObserver = {
  observe: jest.fn(),
  disconnect: jest.fn(),
};

// Mock requestAnimationFrame
const mockRequestAnimationFrame = jest.fn((callback) => {
  setTimeout(callback, 16); // ~60fps
  return 1;
});

// Setup global mocks
global.performance = mockPerformance as any;
global.PerformanceObserver = jest.fn(() => mockPerformanceObserver) as any;
global.requestAnimationFrame = mockRequestAnimationFrame;

describe('PerformanceMonitorService', () => {
  let performanceService: PerformanceMonitorService;

  beforeEach(() => {
    jest.clearAllMocks();
    performanceService = new PerformanceMonitorService();
  });

  describe('Monitoring Control', () => {
    it('starts monitoring correctly', () => {
      performanceService.startMonitoring();

      expect(global.PerformanceObserver).toHaveBeenCalled();
      expect(mockPerformanceObserver.observe).toHaveBeenCalledWith({
        entryTypes: ['measure'],
      });
      expect(mockRequestAnimationFrame).toHaveBeenCalled();
    });

    it('stops monitoring correctly', () => {
      performanceService.startMonitoring();
      performanceService.stopMonitoring();

      expect(mockPerformanceObserver.disconnect).toHaveBeenCalled();
    });

    it('prevents multiple monitoring sessions', () => {
      performanceService.startMonitoring();
      performanceService.startMonitoring(); // Second call should be ignored

      expect(global.PerformanceObserver).toHaveBeenCalledTimes(1);
    });
  });

  describe('Thumbnail Load Time Recording', () => {
    it('records thumbnail load time correctly', () => {
      const startTime = 1000;
      const endTime = 1500;

      performanceService.recordThumbnailLoadTime(startTime, endTime);

      const metrics = performanceService.getMetrics();
      expect(metrics.thumbnailLoadTime).toBe(500);
      expect(metrics.totalPhotosLoaded).toBe(1);
    });

    it('calculates average thumbnail load time', () => {
      performanceService.recordThumbnailLoadTime(1000, 1500); // 500ms
      performanceService.recordThumbnailLoadTime(2000, 2300); // 300ms

      const metrics = performanceService.getMetrics();
      expect(metrics.thumbnailLoadTime).toBe(400); // Average of 500 and 300
      expect(metrics.totalPhotosLoaded).toBe(2);
    });

    it('detects slow thumbnail loading', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      performanceService.recordThumbnailLoadTime(1000, 2000); // 1000ms (slow)

      expect(consoleSpy).toHaveBeenCalledWith(
        'Performance Issue - slow_thumbnail_load:',
        { loadTime: 1000 }
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Grid Render Time Recording', () => {
    it('records grid render time', () => {
      const renderTime = 150;

      performanceService.recordGridRenderTime(renderTime);

      const metrics = performanceService.getMetrics();
      expect(metrics.gridRenderTime).toBe(150);
    });
  });

  describe('Scroll Performance Recording', () => {
    it('records scroll performance metrics', () => {
      performanceService.recordScrollPerformance(60, 0, 1000, 500, 20);

      const metrics = performanceService.getMetrics();
      expect(metrics.scrollPerformance).toHaveLength(1);
      expect(metrics.scrollPerformance[0]).toMatchObject({
        averageFrameRate: 60,
        droppedFrames: 0,
        scrollDuration: 1000,
        scrollDistance: 500,
        itemsRendered: 20,
      });
    });

    it('detects frame drops', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      performanceService.recordScrollPerformance(45, 10, 1000, 500, 20);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Performance Issue - frame_drops:',
        { droppedFrames: 10, frameRate: 45 }
      );

      consoleSpy.mockRestore();
    });

    it('detects low frame rate', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      performanceService.recordScrollPerformance(30, 0, 1000, 500, 20);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Performance Issue - low_frame_rate:',
        { frameRate: 30 }
      );

      consoleSpy.mockRestore();
    });

    it('limits scroll performance history', () => {
      // Record more than 100 entries
      for (let i = 0; i < 150; i++) {
        performanceService.recordScrollPerformance(60, 0, 100, 50, 10);
      }

      const metrics = performanceService.getMetrics();
      expect(metrics.scrollPerformance).toHaveLength(100); // Should be limited to 100
    });
  });

  describe('Cache Performance Recording', () => {
    it('records cache hit rate', () => {
      performanceService.recordCachePerformance(0.85);

      const metrics = performanceService.getMetrics();
      expect(metrics.cacheHitRate).toBe(0.85);
    });

    it('detects low cache hit rate', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      performanceService.recordCachePerformance(0.5); // Below 0.8 threshold

      expect(consoleSpy).toHaveBeenCalledWith(
        'Performance Issue - low_cache_hit_rate:',
        { hitRate: 0.5 }
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Memory Pressure Recording', () => {
    it('records memory pressure events', () => {
      performanceService.recordMemoryPressure();

      const metrics = performanceService.getMetrics();
      expect(metrics.memoryPressureEvents).toBe(1);
    });

    it('logs memory pressure warnings', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      performanceService.recordMemoryPressure();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Performance Issue - memory_pressure:',
        expect.objectContaining({ memoryUsage: expect.any(Number) })
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Error Recording', () => {
    it('records errors', () => {
      const error = new Error('Test error');
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      performanceService.recordError(error, { context: 'test' });

      const metrics = performanceService.getMetrics();
      expect(metrics.errorCount).toBe(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Performance Monitor - Error recorded:',
        error,
        { context: 'test' }
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Performance Summary', () => {
    it('generates performance summary with good performance', () => {
      // Set up good performance metrics
      performanceService.recordThumbnailLoadTime(1000, 1200); // 200ms - good
      performanceService.recordCachePerformance(0.9); // 90% - good
      performanceService.recordScrollPerformance(60, 0, 1000, 500, 20); // 60fps - good

      const summary = performanceService.getPerformanceSummary();

      expect(summary.overallScore).toBeGreaterThan(80);
      expect(summary.issues).toHaveLength(0);
      expect(summary.recommendations).toHaveLength(0);
    });

    it('identifies performance issues', () => {
      // Set up poor performance metrics
      performanceService.recordThumbnailLoadTime(1000, 2000); // 1000ms - slow
      performanceService.recordCachePerformance(0.3); // 30% - low
      performanceService.recordScrollPerformance(25, 10, 1000, 500, 20); // 25fps - poor

      const summary = performanceService.getPerformanceSummary();

      expect(summary.overallScore).toBeLessThan(50);
      expect(summary.issues.length).toBeGreaterThan(0);
      expect(summary.recommendations.length).toBeGreaterThan(0);
    });

    it('provides specific recommendations', () => {
      performanceService.recordThumbnailLoadTime(1000, 2000); // Slow loading

      const summary = performanceService.getPerformanceSummary();

      expect(summary.issues).toContain('Slow thumbnail loading');
      expect(summary.recommendations).toContain(
        'Optimize thumbnail cache or reduce thumbnail quality'
      );
    });
  });

  describe('Performance Report', () => {
    it('generates comprehensive performance report', () => {
      performanceService.recordThumbnailLoadTime(1000, 1300);
      performanceService.recordGridRenderTime(150);
      performanceService.recordCachePerformance(0.85);
      performanceService.recordScrollPerformance(58, 2, 1000, 500, 20);

      const report = performanceService.generateReport();

      expect(report).toContain('Performance Report');
      expect(report).toContain('Overall Score:');
      expect(report).toContain('Average Thumbnail Load Time:');
      expect(report).toContain('Cache Hit Rate:');
      expect(report).toContain('Recent Scroll Performance:');
    });
  });

  describe('Metrics Reset', () => {
    it('resets all metrics', () => {
      // Set up some metrics
      performanceService.recordThumbnailLoadTime(1000, 1300);
      performanceService.recordError(new Error('Test'));
      performanceService.recordMemoryPressure();

      performanceService.resetMetricsForTesting();

      const metrics = performanceService.getMetrics();
      expect(metrics.thumbnailLoadTime).toBe(0);
      expect(metrics.errorCount).toBe(0);
      expect(metrics.memoryPressureEvents).toBe(0);
      expect(metrics.totalPhotosLoaded).toBe(0);
    });
  });

  describe('Threshold Updates', () => {
    it('updates performance thresholds', () => {
      const newThresholds = {
        maxThumbnailLoadTimeMs: 1000,
        minCacheHitRate: 0.9,
      };

      performanceService.updateThresholds(newThresholds);

      // Test that new thresholds are applied
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      performanceService.recordThumbnailLoadTime(1000, 2500); // 1500ms - now exceeds new threshold
      performanceService.recordCachePerformance(0.85); // Now below new threshold

      expect(consoleSpy).toHaveBeenCalledTimes(2);

      consoleSpy.mockRestore();
    });
  });

  describe('Frame Rate Monitoring', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('monitors frame rate continuously', () => {
      performanceService.startMonitoring();

      // Advance time to trigger frame rate calculation
      jest.advanceTimersByTime(1000);

      expect(mockRequestAnimationFrame).toHaveBeenCalled();
    });
  });

  describe('Memory Monitoring', () => {
    it('records memory pressure when threshold exceeded', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      // Mock high memory usage
      mockPerformance.memory.usedJSHeapSize = 250 * 1024 * 1024; // 250MB

      performanceService.recordMemoryPressure();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Performance Issue - memory_pressure:',
        expect.objectContaining({ memoryUsage: expect.any(Number) })
      );

      consoleSpy.mockRestore();
    });
  });
});