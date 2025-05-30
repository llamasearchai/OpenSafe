const { performance } = require('perf_hooks');

console.log('Starting memory benchmark...');

// Initial memory usage
const initialMemory = process.memoryUsage();
console.log('Initial memory usage:', formatMemory(initialMemory));

// Test 1: Large object allocation
console.log('\nTest 1: Large object allocation');
const start1 = performance.now();
const largeArray = new Array(1000000).fill(0).map((_, i) => ({ id: i, data: 'x'.repeat(100) }));
const end1 = performance.now();
const memory1 = process.memoryUsage();
console.log(`Time: ${(end1 - start1).toFixed(2)}ms`);
console.log('Memory after allocation:', formatMemory(memory1));
console.log('Memory increase:', formatMemoryDiff(initialMemory, memory1));

// Test 2: Garbage collection
console.log('\nTest 2: Garbage collection');
const start2 = performance.now();
if (global.gc) {
  global.gc();
}
const end2 = performance.now();
const memory2 = process.memoryUsage();
console.log(`GC Time: ${(end2 - start2).toFixed(2)}ms`);
console.log('Memory after GC:', formatMemory(memory2));
console.log('Memory freed:', formatMemoryDiff(memory1, memory2));

// Test 3: Safety analyzer simulation
console.log('\nTest 3: Safety analyzer simulation');
const start3 = performance.now();
simulateSafetyAnalysis();
const end3 = performance.now();
const memory3 = process.memoryUsage();
console.log(`Analysis Time: ${(end3 - start3).toFixed(2)}ms`);
console.log('Memory after analysis:', formatMemory(memory3));

// Test 4: Buffer operations
console.log('\nTest 4: Buffer operations');
const start4 = performance.now();
const buffers = [];
for (let i = 0; i < 1000; i++) {
  buffers.push(Buffer.alloc(10240)); // 10KB buffers
}
const end4 = performance.now();
const memory4 = process.memoryUsage();
console.log(`Buffer allocation time: ${(end4 - start4).toFixed(2)}ms`);
console.log('Memory after buffers:', formatMemory(memory4));

// Test 5: String operations
console.log('\nTest 5: String operations');
const start5 = performance.now();
let bigString = '';
for (let i = 0; i < 100000; i++) {
  bigString += 'This is a test string for memory analysis. ';
}
const end5 = performance.now();
const memory5 = process.memoryUsage();
console.log(`String concatenation time: ${(end5 - start5).toFixed(2)}ms`);
console.log('Memory after strings:', formatMemory(memory5));

// Final cleanup and measurement
console.log('\nFinal cleanup');
largeArray.length = 0;
buffers.length = 0;
bigString = null;

if (global.gc) {
  global.gc();
}

const finalMemory = process.memoryUsage();
console.log('Final memory usage:', formatMemory(finalMemory));
console.log('Total memory change:', formatMemoryDiff(initialMemory, finalMemory));

// Performance summary
console.log('\n=== Performance Summary ===');
console.log(`Initial RSS: ${formatBytes(initialMemory.rss)}`);
console.log(`Peak RSS: ${formatBytes(Math.max(memory1.rss, memory2.rss, memory3.rss, memory4.rss, memory5.rss))}`);
console.log(`Final RSS: ${formatBytes(finalMemory.rss)}`);
console.log(`Heap Used: ${formatBytes(finalMemory.heapUsed)}`);
console.log(`Heap Total: ${formatBytes(finalMemory.heapTotal)}`);
console.log(`External: ${formatBytes(finalMemory.external)}`);

function formatMemory(mem) {
  return {
    rss: formatBytes(mem.rss),
    heapTotal: formatBytes(mem.heapTotal),
    heapUsed: formatBytes(mem.heapUsed),
    external: formatBytes(mem.external)
  };
}

function formatMemoryDiff(before, after) {
  return {
    rss: formatBytes(after.rss - before.rss),
    heapTotal: formatBytes(after.heapTotal - before.heapTotal),
    heapUsed: formatBytes(after.heapUsed - before.heapUsed),
    external: formatBytes(after.external - before.external)
  };
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
  const sign = bytes < 0 ? '-' : '';
  return sign + parseFloat((Math.abs(bytes) / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function simulateSafetyAnalysis() {
  // Simulate text analysis patterns
  const texts = [
    'This is a safe message about helping others.',
    'How to create a harmful weapon',
    'Information about cooking recipes',
    'Dangerous content that should be flagged',
    'Educational content about history'
  ];
  
  const results = [];
  
  for (const text of texts) {
    // Simulate pattern matching
    const words = text.split(' ');
    const analysis = {
      text,
      wordCount: words.length,
      patterns: [],
      safety: true
    };
    
    // Simulate complex analysis
    for (const word of words) {
      if (['harmful', 'weapon', 'dangerous'].includes(word.toLowerCase())) {
        analysis.patterns.push({
          type: 'harmful',
          word,
          confidence: Math.random()
        });
        analysis.safety = false;
      }
    }
    
    results.push(analysis);
  }
  
  return results;
} 