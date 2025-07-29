export interface ScrollPerformanceMetrics {
  averageFrameRate: number;
  droppedFrames: number;
  scrollDuration: number;
  scrollDistance: number;
  itemsRendered: number;
  memoryUsage: number;
  timestamp: number;
}

export interface GalleryPerformanceMetrics {
  thumbnailLoadTime: number;
  gridRenderTime: number;
  scrollPerformance: ScrollPerformanceMetrics[];
  memoryPressureEvents: number;
  cacheHitRate: number;
  averageImageLoadTime: number;
  totalPhotosLoaded: number;
  errorCount: number;
}

export interface PerformanceThresholds {
  maxFrameDrops: number;
  maxMemoryUsageMB: number;
  maxThumbnailLoadTimeMs: number;
  minCacheHitRate: number;
  maxScrollLatencyMs: number;
}

export class PerformanceMonitorService {
  private metrics: GalleryPerformanceMetrics;
  private scrollMetrics: ScrollPerformanceMetrics[];
  private frameRateBuffer: number[];
  private memoryUsageBuffer: number[];
  private isMonitoring: boolean = false;
  private performanceObserver?: PerformanceObserver;
  private thresholds: PerformanceThresholds;

  constructor() {
    this.metrics = {
      thumbnailLoadTime: 0,
      gridRenderTime: 0,
      scrollPerformance: [],
      memoryPressureEvents: 0,
      cacheHitRate: 0,
      averageImageLoadTime: 0,
      totalPhotosLoaded: 0,
      errorCount: 0,
    };
    
    this.scrollMetrics = [];
    this.frameRateBuffer = [];
    this.memoryUsageBuffer = [];
    
    this.thresholds = {
      maxFrameDrops: 5,
      maxMemoryUsageMB: 200,
      maxThumbnailLoadTimeMs: 1000,
      minCacheHitRate: 0.8,
      maxScrollLatencyMs: 16,
    };
  }

  startMonitoring(): void {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.resetMetrics();
  }

  stopMonitoring(): void {
    this.isMonitoring = false;
    this.performanceObserver?.disconnect();
    this.performanceObserver = undefined;
  }

  recordScrollPerformance(
    frameRate: number,
    droppedFrames: number,
    duration: number,
    distance: number,
    itemsRendered: number
  ): void {
    if (!this.isMonitoring) return;

    const scrollMetric: ScrollPerformanceMetrics = {
      averageFrameRate: frameRate,
      droppedFrames,
      scrollDuration: duration,
      scrollDistance: distance,
      itemsRendered,
      memoryUsage: this.getCurrentMemoryUsage(),
      timestamp: Date.now(),
    };

    this.scrollMetrics.push(scrollMetric);
    this.metrics.scrollPerformance.push(scrollMetric);

    // Keep only recent metrics
    if (this.scrollMetrics.length > 100) {
      this.scrollMetrics = this.scrollMetrics.slice(-50);
    }

    this.checkPerformanceThresholds(scrollMetric);
  }

  recordThumbnailLoadTime(startTime: number, endTime?: number): void {
    if (!this.isMonitoring) return;

    const loadTime = endTime ? endTime - startTime : startTime;
    this.metrics.thumbnailLoadTime = 
      (this.metrics.thumbnailLoadTime + loadTime) / 2;
    this.metrics.totalPhotosLoaded++;

    if (loadTime > this.thresholds.maxThumbnailLoadTimeMs) {
      console.warn(`Slow thumbnail load: ${loadTime}ms`);
    }
  }

  recordGridRenderTime(renderTime: number): void {
    if (!this.isMonitoring) return;

    this.metrics.gridRenderTime = 
      (this.metrics.gridRenderTime + renderTime) / 2;
  }

  recordCachePerformance(hitRate: number): void {
    if (!this.isMonitoring) return;

    this.metrics.cacheHitRate = hitRate;
    
    if (hitRate < this.thresholds.minCacheHitRate) {
      console.warn(`Low cache hit rate: ${hitRate}`);
    }
  }

  recordMemoryPressure(): void {
    if (!this.isMonitoring) return;

    this.metrics.memoryPressureEvents++;
    console.warn('Memory pressure event recorded');
  }

  recordCacheHitRate(hitRate: number): void {
    if (!this.isMonitoring) return;

    this.metrics.cacheHitRate = hitRate;
    
    if (hitRate < this.thresholds.minCacheHitRate) {
      console.warn(`Low cache hit rate: ${hitRate}`);
    }
  }

  recordError(error: Error, context?: any): void {
    this.metrics.errorCount++;
    console.error('Performance Monitor - Error recorded:', error, context);
  }

  getMetrics(): GalleryPerformanceMetrics {
    return { ...this.metrics };
  }

  getAverageScrollPerformance(): ScrollPerformanceMetrics | null {
    if (this.scrollMetrics.length === 0) return null;

    const totals = this.scrollMetrics.reduce(
      (acc, metric) => ({
        averageFrameRate: acc.averageFrameRate + metric.averageFrameRate,
        droppedFrames: acc.droppedFrames + metric.droppedFrames,
        scrollDuration: acc.scrollDuration + metric.scrollDuration,
        scrollDistance: acc.scrollDistance + metric.scrollDistance,
        itemsRendered: acc.itemsRendered + metric.itemsRendered,
        memoryUsage: acc.memoryUsage + metric.memoryUsage,
        timestamp: Math.max(acc.timestamp, metric.timestamp),
      }),
      {
        averageFrameRate: 0,
        droppedFrames: 0,
        scrollDuration: 0,
        scrollDistance: 0,
        itemsRendered: 0,
        memoryUsage: 0,
        timestamp: 0,
      }
    );

    const count = this.scrollMetrics.length;
    return {
      averageFrameRate: totals.averageFrameRate / count,
      droppedFrames: totals.droppedFrames / count,
      scrollDuration: totals.scrollDuration / count,
      scrollDistance: totals.scrollDistance / count,
      itemsRendered: totals.itemsRendered / count,
      memoryUsage: totals.memoryUsage / count,
      timestamp: totals.timestamp,
    };
  }

  private resetMetrics(): void {
    this.metrics = {
      thumbnailLoadTime: 0,
      gridRenderTime: 0,
      scrollPerformance: [],
      memoryPressureEvents: 0,
      cacheHitRate: 0,
      averageImageLoadTime: 0,
      totalPhotosLoaded: 0,
      errorCount: 0,
    };
    this.scrollMetrics = [];
    this.frameRateBuffer = [];
    this.memoryUsageBuffer = [];
  }

  private getCurrentMemoryUsage(): number {
    // In a real implementation, you would use a native module to get actual memory usage
    return 0;
  }

  private checkPerformanceThresholds(metric: ScrollPerformanceMetrics): void {
    if (metric.droppedFrames > this.thresholds.maxFrameDrops) {
      console.warn(`High frame drops: ${metric.droppedFrames}`);
    }

    if (metric.memoryUsage > this.thresholds.maxMemoryUsageMB * 1024 * 1024) {
      console.warn(`High memory usage: ${metric.memoryUsage / 1024 / 1024}MB`);
      this.metrics.memoryPressureEvents++;
    }
  }

  getPerformanceSummary(): {
    averageThumbnailLoadTime: number;
    cacheHitRate: number;
    memoryPressureEvents: number;
    totalPhotosLoaded: number;
    errorCount: number;
    overallScore: number;
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];
    let score = 100;

    // Check thumbnail load time
    if (this.metrics.thumbnailLoadTime > this.thresholds.maxThumbnailLoadTimeMs) {
      issues.push('Slow thumbnail loading');
      recommendations.push('Consider reducing thumbnail quality or implementing progressive loading');
      score -= 20;
    }

    // Check cache hit rate
    if (this.metrics.cacheHitRate < this.thresholds.minCacheHitRate) {
      issues.push('Low cache hit rate');
      recommendations.push('Increase cache size or improve cache strategy');
      score -= 15;
    }

    // Check memory pressure
    if (this.metrics.memoryPressureEvents > 0) {
      issues.push('Memory pressure detected');
      recommendations.push('Optimize memory usage and implement better garbage collection');
      score -= 10;
    }

    // Check error count
    if (this.metrics.errorCount > 0) {
      issues.push('Errors detected');
      recommendations.push('Review and fix error sources');
      score -= this.metrics.errorCount * 5;
    }

    return {
      averageThumbnailLoadTime: this.metrics.thumbnailLoadTime,
      cacheHitRate: this.metrics.cacheHitRate,
      memoryPressureEvents: this.metrics.memoryPressureEvents,
      totalPhotosLoaded: this.metrics.totalPhotosLoaded,
      errorCount: this.metrics.errorCount,
      overallScore: Math.max(0, score),
      issues,
      recommendations,
    };
  }

  generateReport(): string {
    const summary = this.getPerformanceSummary();
    const avgScroll = this.getAverageScrollPerformance();
    
    return `Performance Report:
- Average Thumbnail Load Time: ${summary.averageThumbnailLoadTime.toFixed(2)}ms
- Cache Hit Rate: ${(summary.cacheHitRate * 100).toFixed(1)}%
- Memory Pressure Events: ${summary.memoryPressureEvents}
- Total Photos Loaded: ${summary.totalPhotosLoaded}
- Error Count: ${summary.errorCount}
- Average Frame Rate: ${avgScroll?.averageFrameRate.toFixed(1) || 'N/A'} fps
- Average Dropped Frames: ${avgScroll?.droppedFrames.toFixed(1) || 'N/A'}`;
  }

  updateThresholds(newThresholds: Partial<PerformanceThresholds>): void {
    this.thresholds = { ...this.thresholds, ...newThresholds };
  }

  // Make resetMetrics public for testing
  public resetMetricsForTesting(): void {
    this.resetMetrics();
  }
}

// Export singleton instance
export const performanceMonitorService = new PerformanceMonitorService();