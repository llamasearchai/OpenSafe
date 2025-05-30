const { performance } = require('perf_hooks');

console.log('Starting memory leak detection test...');

let memorySnapshots = [];
let iterations = 0;
const MAX_ITERATIONS = 1000;
const SNAPSHOT_INTERVAL = 50;

// Potential leak sources to test
let globalCache = new Map();
let eventListeners = [];
let timers = [];

function takeMemorySnapshot() {
  const memory = process.memoryUsage();
  const timestamp = Date.now();
  
  memorySnapshots.push({
    iteration: iterations,
    timestamp,
    rss: memory.rss,
    heapUsed: memory.heapUsed,
    heapTotal: memory.heapTotal,
    external: memory.external
  });
  
  // Keep only last 20 snapshots for analysis
  if (memorySnapshots.length > 20) {
    memorySnapshots.shift();
  }
}

function analyzeMemoryTrend() {
  if (memorySnapshots.length < 5) return null;
  
  const recent = memorySnapshots.slice(-5);
  const oldest = recent[0];
  const newest = recent[recent.length - 1];
  
  const rssGrowth = newest.rss - oldest.rss;
  const heapGrowth = newest.heapUsed - oldest.heapUsed;
  const timeSpan = newest.timestamp - oldest.timestamp;
  
  return {
    rssGrowthRate: rssGrowth / timeSpan * 1000, // bytes per second
    heapGrowthRate: heapGrowth / timeSpan * 1000,
    iterations: newest.iteration - oldest.iteration,
    timeSpan
  };
}

function simulateLeakyOperations() {
  // Simulate potential memory leaks
  
  // 1. Growing cache without cleanup
  globalCache.set(`key_${iterations}`, {
    data: 'x'.repeat(1000),
    timestamp: Date.now(),
    metadata: {
      iteration: iterations,
      random: Math.random()
    }
  });
  
  // Occasionally clean cache to simulate real usage
  if (iterations % 100 === 0) {
    const keysToDelete = Array.from(globalCache.keys()).slice(0, 50);
    keysToDelete.forEach(key => globalCache.delete(key));
  }
  
  // 2. Event listener simulation
  const mockEventEmitter = {
    listeners: new Set(),
    addListener: function(callback) {
      this.listeners.add(callback);
    },
    removeListener: function(callback) {
      this.listeners.delete(callback);
    }
  };
  
  eventListeners.push(mockEventEmitter);
  mockEventEmitter.addListener(() => {});
  
  // 3. Timer leak simulation
  const timer = setTimeout(() => {
    // This timer keeps references
  }, 1000000); // Very long timeout
  
  timers.push(timer);
  
  // Occasional cleanup
  if (iterations % 200 === 0) {
    const oldTimers = timers.splice(0, 100);
    oldTimers.forEach(timer => clearTimeout(timer));
    
    const oldListeners = eventListeners.splice(0, 50);
    oldListeners.forEach(emitter => emitter.listeners.clear());
  }
  
  // 4. Closure leak simulation
  function createClosure() {
    const largeData = new Array(1000).fill(0).map(() => Math.random());
    return function() {
      return largeData.length; // Keeps reference to largeData
    };
  }
  
  const closure = createClosure();
  if (iterations % 10 === 0) {
    closure(); // Use closure occasionally
  }
}

function runLeakDetection() {
  return new Promise((resolve) => {
    const interval = setInterval(() => {
      iterations++;
      
      // Simulate operations that might leak memory
      simulateLeakyOperations();
      
      // Take memory snapshot
      if (iterations % SNAPSHOT_INTERVAL === 0) {
        takeMemorySnapshot();
        
        const trend = analyzeMemoryTrend();
        if (trend) {
          console.log(`Iteration ${iterations}: RSS growth rate: ${formatBytes(trend.rssGrowthRate)}/s, Heap growth rate: ${formatBytes(trend.heapGrowthRate)}/s`);
          
          // Alert on suspicious growth
          const RSS_THRESHOLD = 1024 * 1024; // 1MB/s
          const HEAP_THRESHOLD = 512 * 1024; // 512KB/s
          
          if (trend.rssGrowthRate > RSS_THRESHOLD) {
            console.log(`WARNING: High RSS growth rate detected: ${formatBytes(trend.rssGrowthRate)}/s`);
          }
          
          if (trend.heapGrowthRate > HEAP_THRESHOLD) {
            console.log(`WARNING: High heap growth rate detected: ${formatBytes(trend.heapGrowthRate)}/s`);
          }
        }
      }
      
      // Force garbage collection occasionally
      if (iterations % 500 === 0 && global.gc) {
        const beforeGC = process.memoryUsage();
        global.gc();
        const afterGC = process.memoryUsage();
        console.log(`GC: Freed ${formatBytes(beforeGC.heapUsed - afterGC.heapUsed)} heap memory`);
      }
      
      if (iterations >= MAX_ITERATIONS) {
        clearInterval(interval);
        resolve();
      }
    }, 10); // Run every 10ms
  });
}

function generateReport() {
  console.log('\n=== Memory Leak Detection Report ===');
  
  if (memorySnapshots.length === 0) {
    console.log('No memory snapshots collected');
    return;
  }
  
  const first = memorySnapshots[0];
  const last = memorySnapshots[memorySnapshots.length - 1];
  
  const totalRSSGrowth = last.rss - first.rss;
  const totalHeapGrowth = last.heapUsed - first.heapUsed;
  const totalTime = last.timestamp - first.timestamp;
  const totalIterations = last.iteration - first.iteration;
  
  console.log(`Test Duration: ${totalTime}ms (${totalIterations} iterations)`);
  console.log(`Total RSS Growth: ${formatBytes(totalRSSGrowth)}`);
  console.log(`Total Heap Growth: ${formatBytes(totalHeapGrowth)}`);
  console.log(`Average RSS Growth Rate: ${formatBytes(totalRSSGrowth / totalTime * 1000)}/s`);
  console.log(`Average Heap Growth Rate: ${formatBytes(totalHeapGrowth / totalTime * 1000)}/s`);
  
  // Analyze trend
  const growthRates = [];
  for (let i = 1; i < memorySnapshots.length; i++) {
    const prev = memorySnapshots[i - 1];
    const curr = memorySnapshots[i];
    const timeDiff = curr.timestamp - prev.timestamp;
    
    if (timeDiff > 0) {
      growthRates.push({
        rss: (curr.rss - prev.rss) / timeDiff * 1000,
        heap: (curr.heapUsed - prev.heapUsed) / timeDiff * 1000
      });
    }
  }
  
  if (growthRates.length > 0) {
    const avgRSSRate = growthRates.reduce((sum, rate) => sum + rate.rss, 0) / growthRates.length;
    const avgHeapRate = growthRates.reduce((sum, rate) => sum + rate.heap, 0) / growthRates.length;
    
    console.log(`\nDetailed Analysis:`);
    console.log(`Average RSS Growth Rate: ${formatBytes(avgRSSRate)}/s`);
    console.log(`Average Heap Growth Rate: ${formatBytes(avgHeapRate)}/s`);
    
    // Determine if leak is suspected
    const RSS_LEAK_THRESHOLD = 100 * 1024; // 100KB/s
    const HEAP_LEAK_THRESHOLD = 50 * 1024; // 50KB/s
    
    if (avgRSSRate > RSS_LEAK_THRESHOLD || avgHeapRate > HEAP_LEAK_THRESHOLD) {
      console.log(`\nPOTENTIAL MEMORY LEAK DETECTED!`);
      console.log(`- RSS growth rate (${formatBytes(avgRSSRate)}/s) ${avgRSSRate > RSS_LEAK_THRESHOLD ? 'EXCEEDS' : 'within'} threshold`);
      console.log(`- Heap growth rate (${formatBytes(avgHeapRate)}/s) ${avgHeapRate > HEAP_LEAK_THRESHOLD ? 'EXCEEDS' : 'within'} threshold`);
    } else {
      console.log(`\nMemory usage appears normal.`);
    }
  }
  
  console.log(`\nFinal State:`);
  console.log(`- Global cache size: ${globalCache.size} entries`);
  console.log(`- Event listeners: ${eventListeners.length}`);
  console.log(`- Active timers: ${timers.length}`);
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
  const sign = bytes < 0 ? '-' : '';
  return sign + parseFloat((Math.abs(bytes) / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Cleanup function
function cleanup() {
  console.log('\nCleaning up resources...');
  
  // Clear timers
  timers.forEach(timer => clearTimeout(timer));
  timers.length = 0;
  
  // Clear cache
  globalCache.clear();
  
  // Clear event listeners
  eventListeners.forEach(emitter => emitter.listeners.clear());
  eventListeners.length = 0;
  
  console.log('Cleanup completed.');
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\nReceived SIGINT, generating report...');
  generateReport();
  cleanup();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nReceived SIGTERM, generating report...');
  generateReport();
  cleanup();
  process.exit(0);
});

// Run the test
async function main() {
  try {
    console.log(`Running memory leak detection for ${MAX_ITERATIONS} iterations...`);
    await runLeakDetection();
    generateReport();
    cleanup();
  } catch (error) {
    console.error('Memory leak detection failed:', error);
    cleanup();
    process.exit(1);
  }
}

main(); 