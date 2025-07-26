import { PerformanceMetrics } from '../types';

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
      maxThumbnailLoadTimeMs: 500,
      minCacheHitRate: 0.8,
      maxScrollLatencyMs: 16, // 60fps = 16.67ms per frame
    };
  }

  /**
   * Start performance monitoring
   */
  startMonitoring(): void {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.initializePerformanceObserver();
    this.startFrameRateMonitoring();
    this.startMemoryMonitoring();
  }

  /**
   * Stop performance monitoring
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    this.performanceObserver?.disconnect();
    this.clearBuffers();
  }

  /**
   * Record thumbnail load time
   */
  recordThumbnailLoadTime(startTime: number, endTime: number): void {
    const loadTime = endTime - startTime;
    this.metrics.thumbnailLoadTime = this.updateAverage(
      this.metrics.thumbnailLoadTime,
      loadTime,
      this.metrics.totalPhotosLoaded
    );
    this.metrics.totalPhotosLoaded++;
    
    // Check threshold
    if (loadTime > this.thresholds.maxThumbnailLoadTimeMs) {
      this.recordPerformanceIssue('slow_thumbnail_load', { loadTime });
    }
  }

  /**
   * Record grid render time
   */
  recordGridRenderTime(renderTime: number): void {
    this.metrics.gridRenderTime = renderTime;
  }

  /**
   * Record scroll performance
   */
  recordScrollPerformance(
    frameRate: number,
    droppedFrames: number,
    duration: number,
    distance: number,
    itemsRendered: number
  ): void {
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
    this.metrics.scrollPerformance = this.scrollMetrics.slice(-100); // Keep last 100 entries
    
    // Check thresholds
    if (droppedFrames > this.thresholds.maxFrameDrops) {
      this.recordPerformanceIssue('frame_drops', { droppedFrames, frameRate });
    }
    
    if (frameRate < 50) { // Below 50fps
      this.recordPerformanceIssue('low_frame_rate', { frameRate });
    }
  }

  /**
   * Record cache performance
   */
  recordCachePerformance(hitRate: number): void {
    this.metrics.cacheHitRate = hitRate;
    
    if (hitRate < this.thresholds.minCacheHitRate) {
      this.recordPerformanceIssue('low_cache_hit_rate', { hitRate });
    }
  }

  /**
   * Record memory pressure event
   */
  recordMemoryPressure(): void {
    this.metrics.memoryPressureEvents++;
    this.recordPerformanceIssue('memory_pressure', {
      memoryUsage: this.getCurrentMemoryUsage(),
    });
  }

  /**
   * Record error
   */
  recordError(error: Error, context?: any): void {
    this.metrics.errorCount++;
    console.error('Performance Monitor - Error recorded:', error, context);
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): GalleryPerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(): {
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
      recommendations.push('Optimize thumbnail cache or reduce thumbnail quality');
      score -= 20;
    }

    // Check cache hit rate
    if (this.metrics.cacheHitRate < this.thresholds.minCacheHitRate) {
      issues.push('Low cache hit rate');
      recommendations.push('Increase cache size or improve preloading strategy');
      score -= 15;
    }

    // Check scroll performance
    const recentScrollMetrics = this.scrollMetrics.slice(-10);
    const avgFrameRate = recentScrollMetrics.reduce((sum, m) => sum + m.averageFrameRate, 0) / recentScrollMetrics.length;
    if (avgFrameRate < 50) {
      issues.push('Poor scroll performance');
      recommendations.push('Reduce grid complexity or optimize image rendering');
      score -= 25;
    }

    // Check memory usage
    const avgMemoryUsage = this.getAverageMemoryUsage();
    if (avgMemoryUsage > this.thresholds.maxMemoryUsageMB) {
      issues.push('High memory usage');
      recommendations.push('Implement more aggressive memory management');
      score -= 20;
    }

    // Check error rate
    const errorRate = this.metrics.errorCount / Math.max(this.metrics.totalPhotosLoaded, 1);
    if (errorRate > 0.05) { // More than 5% error rate
      issues.push('High error rate');
      recommendations.push('Improve error handling and fallback mechanisms');
      score -= 10;
    }

    return {
      overallScore: Math.max(0, score),
      issues,
      recommendations,
    };
  }

  /**
   * Generate performance report
   */
  generateReport(): string {
    const summary = this.getPerformanceSummary();
    const metrics = this.getMetrics();
    
    return `
Performance Report
==================

Overall Score: ${summary.overallScore}/100

Metrics:
- Average Thumbnail Load Time: ${metrics.thumbnailLoadTime.toFixed(2)}ms
- Grid Render Time: ${metrics.gridRenderTime.toFixed(2)}ms
- Cache Hit Rate: ${(metrics.cacheHitRate * 100).toFixed(1)}%
- Total Photos Loaded: ${metrics.totalPhotosLoaded}
- Memory Pressure Events: ${metrics.memoryPressureEvents}
- Error Count: ${metrics.errorCount}

Recent Scroll Performance:
${this.scrollMetrics.slice(-5).map(m => 
  `- ${m.averageFrameRate.toFixed(1)}fps, ${m.droppedFrames} drops, ${m.memoryUsage.toFixed(1)}MB`
).join('\n')}

Issues:
${summary.issues.map(issue => `- ${issue}`).join('\n')}

Recommendations:
${summary.recommendations.map(rec => `- ${rec}`).join('\n')}
    `.trim();
  }

  /**
   * Reset all metrics
   */
  resetMetrics(): void {
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
    this.clearBuffers();
  }

  /**
   * Update performance thresholds
   */
  updateThresholds(newThresholds: Partial<PerformanceThresholds>): void {
    this.thresholds = { ...this.thresholds, ...newThresholds };
  }

  // Private methods

  private initializePerformanceObserver(): void {
    if (typeof PerformanceObserver !== 'undefined') {
      this.performanceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          if (entry.entryType === 'measure') {
            this.processPerfEntry(entry);
          }
        });
      });
      
      this.performanceObserver.observe({ entryTypes: ['measure'] });
    }
  }

  private processPerfEntry(entry: PerformanceEntry): void {
    if (entry.name.includes('thumbnail')) {
      this.recordThumbnailLoadTime(entry.startTime, entry.startTime + entry.duration);
    } else if (entry.name.includes('render')) {
      this.recordGridRenderTime(entry.duration);
    }
  }

  private startFrameRateMonitoring(): void {
    let lastFrameTime = performance.now();
    let frameCount = 0;
    
    const measureFrameRate = () => {
      if (!this.isMonitoring) return;
      
      const currentTime = performance.now();
      const deltaTime = currentTime - lastFrameTime;
      
      if (deltaTime >= 1000) { // Every second
        const fps = (frameCount * 1000) / deltaTime;
        this.frameRateBuffer.push(fps);
        
        if (this.frameRateBuffer.length > 60) { // Keep last 60 seconds
          this.frameRateBuffer.shift();
        }
        
        frameCount = 0;
        lastFrameTime = currentTime;
      }
      
      frameCount++;
      requestAnimationFrame(measureFrameRate);
    };
    
    requestAnimationFrame(measureFrameRate);
  }

  private startMemoryMonitoring(): void {
    const measureMemory = () => {
      if (!this.isMonitoring) return;
      
      const memoryUsage = this.getCurrentMemoryUsage();
      this.memoryUsageBuffer.push(memoryUsage);
      
      if (this.memoryUsageBuffer.length > 60) { // Keep last 60 measurements
        this.memoryUsageBuffer.shift();
      }
      
      if (memoryUsage > this.thresholds.maxMemoryUsageMB) {
        this.recordMemoryPressure();
      }
      
      setTimeout(measureMemory, 1000); // Every second
    };
    
    setTimeout(measureMemory, 1000);
  }

  private getCurrentMemoryUsage(): number {
    // Simplified memory usage calculation
    // In a real implementation, you might use performance.memory or native modules
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      return (performance as any).memory.usedJSHeapSize / (1024 * 1024); // Convert to MB
    }
    return 0;
  }

  private getAverageMemoryUsage(): number {
    if (this.memoryUsageBuffer.length === 0) return 0;
    return this.memoryUsageBuffer.reduce((sum, usage) => sum + usage, 0) / this.memoryUsageBuffer.length;
  }

  private updateAverage(currentAvg: number, newValue: number, count: number): number {
    return (currentAvg * count + newValue) / (count + 1);
  }

  private recordPerformanceIssue(type: string, data: any): void {
    console.warn(`Performance Issue - ${type}:`, data);
  }

  private clearBuffers(): void {
    this.frameRateBuffer = [];
    this.memoryUsageBuffer = [];
  }
}

// Export singleton instance
export const performanceMonitorService = new PerformanceMonitorService();