'use client';

import { useState, useEffect } from 'react';
import { TrashIcon, ArrowDownTrayIcon, EyeIcon } from '@heroicons/react/24/outline';
import { useScreenshotCapture } from '@/contexts/ScreenshotContext';

interface Screenshot {
  filename: string;
  data: string;
  timestamp: string;
}

export default function LocalStorageScreenshots() {
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [selectedScreenshot, setSelectedScreenshot] = useState<Screenshot | null>(null);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  
  const addDebugInfo = (message: string) => {
    console.log(message);
    setDebugInfo(prev => [...prev.slice(-20), `${new Date().toLocaleTimeString()}: ${message}`]);
  };
  const [loading, setLoading] = useState(true);
  const { exportStoredScreenshots, isCapturing } = useScreenshotCapture();

  // Load screenshots from localStorage
  useEffect(() => {
    loadScreenshots();
  }, []);

  // Refresh screenshots when capturing is completed
  useEffect(() => {
    if (!isCapturing) {
      // Small delay to ensure localStorage is updated
      const timeoutId = setTimeout(() => {
        loadScreenshots();
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [isCapturing]);

  const loadScreenshots = () => {
    try {
      const stored = localStorage.getItem('screenshots');
      if (stored) {
        const parsed = JSON.parse(stored);
        setScreenshots(parsed.reverse()); // Show newest first
      }
    } catch (error) {
      console.error('Failed to load screenshots:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteScreenshot = (index: number) => {
    if (confirm('Are you sure you want to delete this screenshot?')) {
      try {
        const updated = [...screenshots];
        updated.splice(index, 1);
        setScreenshots(updated);
        
        // Update localStorage
        localStorage.setItem('screenshots', JSON.stringify(updated.reverse()));
        
        // Close modal if deleted screenshot was selected
        if (selectedScreenshot === screenshots[index]) {
          setSelectedScreenshot(null);
        }
      } catch (error) {
        console.error('Failed to delete screenshot:', error);
      }
    }
  };

  const downloadScreenshot = (screenshot: Screenshot) => {
    try {
      // Convert base64 back to blob and download
      fetch(screenshot.data)
        .then(res => res.blob())
        .then(blob => {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = screenshot.filename;
          link.click();
          URL.revokeObjectURL(url);
        });
    } catch (error) {
      console.error('Failed to download screenshot:', error);
    }
  };

  const clearAllScreenshots = () => {
    if (confirm('Are you sure you want to delete all screenshots? This action cannot be undone.')) {
      localStorage.removeItem('screenshots');
      setScreenshots([]);
      setSelectedScreenshot(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Loading indicator when taking screenshot */}
      {isCapturing && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-center space-x-3">
            <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
            <span className="text-blue-800 font-medium">Taking screenshot...</span>
          </div>
        </div>
      )}
      
      {/* Debug Info Panel */}
      {debugInfo.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-semibold text-yellow-800 mb-2">🐛 Debug Information:</h3>
          <div className="max-h-40 overflow-y-auto text-sm font-mono text-yellow-700 space-y-1">
            {debugInfo.slice(-10).map((info, index) => (
              <div key={index}>{info}</div>
            ))}
          </div>
          <button
            onClick={() => setDebugInfo([])}
            className="mt-2 px-2 py-1 bg-yellow-200 text-yellow-800 rounded text-xs hover:bg-yellow-300"
          >
            Clear Debug Info
          </button>
        </div>
      )}
      
      {/* Header with actions */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold theme-text-primary">
            Captured Screenshots ({screenshots.length})
          </h2>
          <p className="text-sm theme-text-secondary">
            Screenshots are stored locally in your browser
          </p>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={async () => {
              console.log('=== DEBUG REAL SCREEN CAPTURE ===');
              try {
                // Request screen capture permission
                console.log('Requesting screen capture permission...');
                const stream = await navigator.mediaDevices.getDisplayMedia({
                  video: {
                    mediaSource: 'screen',
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                    frameRate: { ideal: 10, max: 15 }
                  },
                  audio: false
                });
                
                console.log('Screen capture permission granted, stream:', stream);
                
                // Create video element
                const video = document.createElement('video');
                video.srcObject = stream;
                video.muted = true;
                video.autoplay = true;
                
                console.log('Video element created, waiting for ready state...');
                
                // Wait for video to be ready
                await new Promise((resolve, reject) => {
                  const timeout = setTimeout(() => {
                    reject(new Error('Video load timeout'));
                  }, 10000);
                  
                  let attempts = 0;
                  const checkVideo = () => {
                    attempts++;
                    console.log(`Debug: Checking video readiness, attempt ${attempts}`);
                    console.log('Debug: Video dimensions:', video.videoWidth, 'x', video.videoHeight);
                    console.log('Debug: Video ready state:', video.readyState);
                    console.log('Debug: Video current time:', video.currentTime);
                    
                    if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
                      clearTimeout(timeout);
                      console.log('Debug: Video is ready for capture');
                      resolve(true);
                    } else if (attempts < 20) {
                      setTimeout(checkVideo, 500);
                    } else {
                      clearTimeout(timeout);
                      reject(new Error('Video failed to become ready'));
                    }
                  };
                  
                  video.onloadedmetadata = () => {
                    console.log('Debug: Video metadata loaded');
                    checkVideo();
                  };
                  
                  video.onloadeddata = () => {
                    console.log('Debug: Video data loaded');
                    checkVideo();
                  };
                  
                  video.play().then(() => {
                    console.log('Debug: Video play started');
                    setTimeout(checkVideo, 100);
                  }).catch(reject);
                });
                
                // Wait for video to stabilize
                console.log('Debug: Waiting for video to stabilize...');
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                // Create canvas and capture
                const canvas = document.createElement('canvas');
                canvas.width = Math.max(video.videoWidth || 1920, 800);
                canvas.height = Math.max(video.videoHeight || 1080, 600);
                
                console.log('Debug: Final capture dimensions:', canvas.width, 'x', canvas.height);
                
                const ctx = canvas.getContext('2d');
                if (!ctx) throw new Error('Could not get canvas context');
                
                // Clear with white background
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                
                // Draw video frame
                console.log('Debug: Drawing video frame to canvas...');
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                
                // Analyze captured content
                const imageData = ctx.getImageData(0, 0, Math.min(canvas.width, 100), Math.min(canvas.height, 100));
                const data = imageData.data;
                let hasContent = false;
                let colorVariation = 0;
                let totalBrightness = 0;
                
                for (let i = 0; i < data.length; i += 16) {
                  const r = data[i];
                  const g = data[i + 1];
                  const b = data[i + 2];
                  const brightness = (r + g + b) / 3;
                  totalBrightness += brightness;
                  if (r !== 255 || g !== 255 || b !== 255) {
                    hasContent = true;
                    colorVariation++;
                  }
                }
                
                const avgBrightness = totalBrightness / (data.length / 4);
                console.log('Debug: Content analysis - Has content:', hasContent, 'Color variation:', colorVariation, 'Avg brightness:', avgBrightness);
                
                // Stop stream
                stream.getTracks().forEach(track => track.stop());
                video.srcObject = null;
                
                // Convert to blob and save
                canvas.toBlob((blob) => {
                  if (blob) {
                    console.log('Debug: Real capture blob created, size:', blob.size);
                    const reader = new FileReader();
                    reader.onload = () => {
                      const base64data = reader.result as string;
                      console.log('Debug: Base64 data length:', base64data.length);
                      console.log('Debug: Base64 preview:', base64data.substring(0, 100));
                      
                      const screenshots = JSON.parse(localStorage.getItem('screenshots') || '[]');
                      screenshots.push({
                        filename: `debug-real-capture-${Date.now()}.png`,
                        data: base64data,
                        timestamp: new Date().toISOString()
                      });
                      localStorage.setItem('screenshots', JSON.stringify(screenshots));
                      console.log('Debug: Real capture saved successfully');
                      loadScreenshots();
                    };
                    reader.readAsDataURL(blob);
                  } else {
                    console.error('Debug: Failed to create blob');
                  }
                }, 'image/png');
                
              } catch (error) {
                console.error('Debug: Real capture failed:', error);
                alert('Debug capture failed: ' + error.message);
              }
            }}
            className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm"
          >
            📺 Real Capture
          </button>
          <button
            onClick={() => {
              console.log('=== SIMPLE IMAGE TEST ===');
              
              // Create a tiny 1x1 pixel red image directly
              const canvas = document.createElement('canvas');
              canvas.width = 1;
              canvas.height = 1;
              
              const ctx = canvas.getContext('2d');
              if (ctx) {
                ctx.fillStyle = '#FF0000';
                ctx.fillRect(0, 0, 1, 1);
                
                const dataURL = canvas.toDataURL('image/png');
                console.log('Simple image dataURL:', dataURL);
                console.log('DataURL length:', dataURL.length);
                console.log('Starts correctly:', dataURL.startsWith('data:image/png;base64,'));
                
                // Test immediate image loading
                const testImg = new Image();
                testImg.onload = () => {
                  console.log('✅ Simple image loaded successfully!');
                  console.log('Image dimensions:', testImg.naturalWidth, 'x', testImg.naturalHeight);
                };
                testImg.onerror = (e) => {
                  console.error('❌ Simple image failed to load:', e);
                };
                testImg.src = dataURL;
                
                // Save this simple image to localStorage
                const screenshots = JSON.parse(localStorage.getItem('screenshots') || '[]');
                screenshots.push({
                  filename: `simple-test-${Date.now()}.png`,
                  data: dataURL,
                  timestamp: new Date().toISOString()
                });
                localStorage.setItem('screenshots', JSON.stringify(screenshots));
                console.log('Simple image saved to localStorage');
                
                loadScreenshots();
              }
            }}
            className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
          >
            🔴 Simple Test
          </button>
          <button
            onClick={() => {
              console.log('=== BROWSER IMAGE TEST ===');
              
              // Test with a minimal known-good base64 image (1x1 transparent PNG)
              const knownGoodImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAI9jU77nAAAAABJRU5ErkJggg==';
              
              console.log('Testing known good image:', knownGoodImage);
              
              const testImg = new Image();
              testImg.onload = () => {
                console.log('✅ Known good image loaded successfully!');
                
                // Save it to localStorage
                const screenshots = JSON.parse(localStorage.getItem('screenshots') || '[]');
                screenshots.push({
                  filename: `browser-test-${Date.now()}.png`,
                  data: knownGoodImage,
                  timestamp: new Date().toISOString()
                });
                localStorage.setItem('screenshots', JSON.stringify(screenshots));
                console.log('Browser test image saved to localStorage');
                
                loadScreenshots();
              };
              testImg.onerror = (e) => {
                console.error('❌ Even known good image failed to load:', e);
                console.error('This indicates a browser issue with data URLs');
              };
              testImg.src = knownGoodImage;
            }}
            className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
          >
            ✅ Browser Test
          </button>
          <button
            onClick={() => {
              console.log('=== VISIBLE TEST IMAGE ===');
              
              // Create a small but visible image (50x50 with bright colors)
              const canvas = document.createElement('canvas');
              canvas.width = 50;
              canvas.height = 50;
              
              const ctx = canvas.getContext('2d');
              if (ctx) {
                // Fill with bright red background
                ctx.fillStyle = '#FF0000';
                ctx.fillRect(0, 0, 50, 50);
                
                // Add a green square in the center
                ctx.fillStyle = '#00FF00';
                ctx.fillRect(15, 15, 20, 20);
                
                // Add a blue circle
                ctx.fillStyle = '#0000FF';
                ctx.beginPath();
                ctx.arc(25, 25, 8, 0, 2 * Math.PI);
                ctx.fill();
                
                const dataURL = canvas.toDataURL('image/png');
                console.log('Visible test image created:', dataURL.length, 'bytes');
                addDebugInfo(`📸 Created visible test (50x50, ${dataURL.length} bytes)`);
                
                // Test immediate loading
                const testImg = new Image();
                testImg.onload = () => {
                  console.log('✅ Visible test image loaded:', testImg.naturalWidth, 'x', testImg.naturalHeight);
                  addDebugInfo(`✅ Test image loaded: ${testImg.naturalWidth}x${testImg.naturalHeight}`);
                };
                testImg.onerror = (e) => {
                  console.error('❌ Visible test image failed:', e);
                  addDebugInfo('❌ Visible test image failed');
                };
                testImg.src = dataURL;
                
                // Save to localStorage
                const screenshots = JSON.parse(localStorage.getItem('screenshots') || '[]');
                screenshots.push({
                  filename: `visible-test-${Date.now()}.png`,
                  data: dataURL,
                  timestamp: new Date().toISOString()
                });
                localStorage.setItem('screenshots', JSON.stringify(screenshots));
                
                loadScreenshots();
              }
            }}
            className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm"
          >
            🎨 Visible Test
          </button>
          <button
            onClick={() => {
              console.log('=== REMOVING OPACITY ANIMATIONS ===');
              addDebugInfo('🔧 Removing opacity animations from all images');
              
              // Find all thumbnail images and remove opacity animations
              const thumbnailImages = document.querySelectorAll('img[alt*=".png"]');
              console.log('Found', thumbnailImages.length, 'thumbnail images');
              
              thumbnailImages.forEach((img, index) => {
                const element = img as HTMLImageElement;
                console.log(`Fixing image ${index + 1}:`, element.alt);
                
                // Remove any inline opacity styles
                element.style.opacity = '';
                element.style.removeProperty('opacity');
                
                // Force visibility
                element.style.display = 'block';
                element.style.visibility = 'visible';
                
                console.log('Fixed styles for:', element.alt, {
                  opacity: element.style.opacity,
                  display: element.style.display,
                  visibility: element.style.visibility
                });
              });
              
              addDebugInfo(`🔧 Fixed ${thumbnailImages.length} images`);
            }}
            className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
          >
            🔧 Fix Opacity
          </button>
          <button
            onClick={() => {
              console.log('=== IMAGE CONTENT VALIDATION ===');
              addDebugInfo('� Analyzing image content');
              
              const screenshots = JSON.parse(localStorage.getItem('screenshots') || '[]');
              
              screenshots.forEach((screenshot, index) => {
                console.log(`\n--- Analyzing ${screenshot.filename} ---`);
                addDebugInfo(`🔬 Analyzing: ${screenshot.filename}`);
                
                // Create a canvas to analyze the actual image content
                const img = new Image();
                img.onload = () => {
                  const canvas = document.createElement('canvas');
                  canvas.width = img.naturalWidth;
                  canvas.height = img.naturalHeight;
                  
                  const ctx = canvas.getContext('2d');
                  if (ctx) {
                    // Draw the image to canvas
                    ctx.drawImage(img, 0, 0);
                    
                    // Get image data to analyze pixel values
                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    const pixels = imageData.data;
                    
                    // Analyze pixel content
                    let totalPixels = pixels.length / 4;
                    let blackPixels = 0;
                    let transparentPixels = 0;
                    let coloredPixels = 0;
                    
                    for (let i = 0; i < pixels.length; i += 4) {
                      const r = pixels[i];
                      const g = pixels[i + 1];
                      const b = pixels[i + 2];
                      const a = pixels[i + 3];
                      
                      if (a === 0) {
                        transparentPixels++;
                      } else if (r === 0 && g === 0 && b === 0) {
                        blackPixels++;
                      } else {
                        coloredPixels++;
                      }
                    }
                    
                    const analysis = {
                      dimensions: `${img.naturalWidth}x${img.naturalHeight}`,
                      totalPixels,
                      blackPixels,
                      transparentPixels,
                      coloredPixels,
                      percentBlack: ((blackPixels / totalPixels) * 100).toFixed(1),
                      percentTransparent: ((transparentPixels / totalPixels) * 100).toFixed(1),
                      percentColored: ((coloredPixels / totalPixels) * 100).toFixed(1)
                    };
                    
                    console.log('Image content analysis:', analysis);
                    addDebugInfo(`📊 ${screenshot.filename}: ${analysis.percentBlack}% black, ${analysis.percentColored}% colored, ${analysis.percentTransparent}% transparent`);
                    
                    // Sample some pixels for detailed analysis
                    const samplePixels = [];
                    for (let i = 0; i < Math.min(20, pixels.length); i += 4) {
                      samplePixels.push({
                        r: pixels[i],
                        g: pixels[i + 1],
                        b: pixels[i + 2],
                        a: pixels[i + 3]
                      });
                    }
                    console.log('Sample pixels:', samplePixels);
                  }
                };
                
                img.onerror = (e) => {
                  console.error('Failed to analyze image:', screenshot.filename, e);
                  addDebugInfo(`❌ Analysis failed: ${screenshot.filename}`);
                };
                
                img.src = screenshot.data;
              });
            }}
            className="px-3 py-1 bg-cyan-600 text-white rounded hover:bg-cyan-700 text-sm"
          >
            🔬 Analyze Content
          </button>
          <button
            onClick={() => {
              console.log('Clearing all screenshots and localStorage data');
              localStorage.removeItem('screenshots');
              setScreenshots([]);
              console.log('All data cleared');
            }}
            className="px-3 py-1 bg-orange-600 text-white rounded hover:bg-orange-700 text-sm"
          >
            🗑️ Clear Data
          </button>
          <button
            onClick={() => {
              console.log('=== THUMBNAIL DEBUG ===');
              const stored = localStorage.getItem('screenshots');
              if (stored) {
                const screenshots = JSON.parse(stored);
                console.log('Total screenshots:', screenshots.length);
                screenshots.forEach((shot: Screenshot, idx: number) => {
                  console.log(`Screenshot ${idx}:`, {
                    filename: shot.filename,
                    dataType: typeof shot.data,
                    dataLength: shot.data?.length || 0,
                    startsWithDataURL: shot.data?.startsWith('data:image/'),
                    preview: shot.data?.substring(0, 100)
                  });
                });
                
                // Force reload all thumbnails
                const images = document.querySelectorAll('img[src^="data:image/"]');
                console.log('Found', images.length, 'thumbnail images, forcing reload...');
                images.forEach((img, idx) => {
                  const imgEl = img as HTMLImageElement;
                  const originalSrc = imgEl.src;
                  imgEl.src = '';
                  setTimeout(() => {
                    imgEl.src = originalSrc;
                    console.log(`Reloaded thumbnail ${idx}`);
                  }, idx * 100);
                });
              }
            }}
            className="px-3 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700 text-sm"
          >
            🔧 Debug Thumbs
          </button>
          <button
            onClick={() => {
              console.log('=== DATA INTEGRITY CHECK ===');
              const stored = localStorage.getItem('screenshots');
              
              if (!stored) {
                console.log('❌ No screenshots data found in localStorage');
                return;
              }
              
              try {
                const screenshots = JSON.parse(stored) as Screenshot[];
                console.log('✅ JSON parsing successful, found', screenshots.length, 'screenshots');
                
                let validCount = 0;
                let invalidCount = 0;
                const validScreenshots: Screenshot[] = [];
                
                screenshots.forEach((screenshot: Screenshot, index: number) => {
                  console.log(`\n--- Screenshot ${index + 1}: ${screenshot.filename} ---`);
                  
                  // Check required fields
                  if (!screenshot.filename || !screenshot.data || !screenshot.timestamp) {
                    console.error('❌ Missing required fields');
                    invalidCount++;
                    return;
                  }
                  
                  // Check data format
                  if (!screenshot.data.startsWith('data:image/')) {
                    console.error('❌ Invalid data URL format');
                    invalidCount++;
                    return;
                  }
                  
                  // Check base64 validity
                  try {
                    const base64Part = screenshot.data.split(',')[1];
                    if (base64Part) {
                      atob(base64Part);
                      console.log('✅ Valid base64 data');
                      validCount++;
                      validScreenshots.push(screenshot);
                    } else {
                      console.error('❌ No base64 data found');
                      invalidCount++;
                    }
                  } catch (error) {
                    console.error('❌ Invalid base64:', error);
                    invalidCount++;
                  }
                });
                
                console.log(`\n=== SUMMARY ===`);
                console.log(`Valid screenshots: ${validCount}`);
                console.log(`Invalid screenshots: ${invalidCount}`);
                
                if (invalidCount > 0) {
                  const shouldFix = confirm(`Found ${invalidCount} corrupted screenshots. Remove them and keep only the ${validCount} valid ones?`);
                  if (shouldFix) {
                    localStorage.setItem('screenshots', JSON.stringify(validScreenshots));
                    console.log('🔧 Cleaned up corrupted screenshots');
                    loadScreenshots();
                  }
                } else {
                  alert('All screenshots data is valid! 🎉');
                }
              } catch (error) {
                console.error('❌ JSON parsing failed:', error);
                const shouldClear = confirm('Screenshots data is corrupted and cannot be parsed. Clear all data?');
                if (shouldClear) {
                  localStorage.removeItem('screenshots');
                  console.log('🧹 Cleared corrupted data');
                  loadScreenshots();
                }
              }
            }}
            className="px-3 py-1 bg-orange-600 text-white rounded hover:bg-orange-700 text-sm"
          >
            🔍 Check Data
          </button>
          {screenshots.length > 0 && (
            <>
              <button
                onClick={exportStoredScreenshots}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
              >
                <ArrowDownTrayIcon className="h-4 w-4" />
                Export All
              </button>
              <button
                onClick={clearAllScreenshots}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
              >
                <TrashIcon className="h-4 w-4" />
                Clear All
              </button>
            </>
          )}
        </div>
      </div>

      {screenshots.length === 0 ? (
        <div className="text-center py-12">
          <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <span className="text-2xl">📸</span>
          </div>
          <h3 className="text-lg font-medium theme-text-primary mb-2">No Screenshots Yet</h3>
          <p className="theme-text-secondary">
            Start a timer to begin automatic screenshot capture or use debug buttons above
          </p>
        </div>
      ) : (
        <>
          {/* Screenshots Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {screenshots.map((screenshot, index) => (
              <div
                key={index}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div 
                  className="aspect-video bg-gray-100 relative group cursor-pointer overflow-hidden"
                  onClick={() => {
                    console.log('Thumbnail clicked:', screenshot.filename);
                    setSelectedScreenshot(screenshot);
                  }}
                >
                  <img
                    src={screenshot.data}
                    alt={screenshot.filename}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    loading="lazy"
                    style={{ 
                      imageRendering: 'auto',
                      backfaceVisibility: 'hidden',
                      transform: 'translate3d(0,0,0)' 
                    }}
                    onError={(e) => {
                      const errorMsg = '=== THUMBNAIL LOAD ERROR ===';
                      console.error(errorMsg);
                      addDebugInfo(`❌ ${errorMsg}`);
                      
                      const filename = `Failed: ${screenshot.filename}`;
                      console.error('Failed filename:', screenshot.filename);
                      addDebugInfo(filename);
                      
                      const srcLength = (e.target as HTMLImageElement).src.length;
                      console.error('Image element error event:', e);
                      console.error('Image element src length:', srcLength);
                      addDebugInfo(`Src length: ${srcLength}`);
                      
                      console.log('Original data type:', typeof screenshot.data);
                      console.log('Original data length:', screenshot.data?.length || 0);
                      addDebugInfo(`Data length: ${screenshot.data?.length || 0}`);
                      
                      console.log('Original data starts with:', screenshot.data?.substring(0, 50) || 'N/A');
                      addDebugInfo(`Data starts: ${screenshot.data?.substring(0, 30) || 'N/A'}`);
                      
                      console.log('Full data sample:', screenshot.data?.substring(0, 200) || 'N/A');
                      
                      // Validate the data format
                      if (screenshot.data) {
                        try {
                          if (!screenshot.data.startsWith('data:image/')) {
                            console.error('❌ Invalid data URL format - does not start with data:image/');
                            addDebugInfo('❌ Invalid data URL format');
                          } else {
                            console.log('✅ Data URL format looks correct');
                            addDebugInfo('✅ Data URL format OK');
                            
                            const mimeType = screenshot.data.split(';')[0].replace('data:', '');
                            console.log('📋 MIME type:', mimeType);
                            addDebugInfo(`MIME: ${mimeType}`);
                            
                            const base64Part = screenshot.data.split(',')[1];
                            if (base64Part) {
                              try {
                                const decoded = atob(base64Part);
                                console.log('✅ Base64 decode successful, size:', decoded.length, 'bytes');
                                addDebugInfo(`✅ Base64 OK: ${decoded.length} bytes`);
                                
                                // Check if it looks like image data
                                const firstBytes = decoded.substring(0, 10);
                                const hexBytes = Array.from(firstBytes).map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join(' ');
                                console.log('🔍 First bytes (hex):', hexBytes);
                                addDebugInfo(`First bytes: ${hexBytes}`);
                              } catch (decodeError) {
                                console.error('❌ Base64 decode failed:', decodeError);
                                addDebugInfo('❌ Base64 decode failed');
                              }
                            } else {
                              console.error('❌ No base64 data found after comma');
                              addDebugInfo('❌ No base64 data after comma');
                            }
                          }
                        } catch (error) {
                          console.error('❌ Data validation error:', error);
                          addDebugInfo('❌ Data validation error');
                        }
                      }
                      
                      const target = e.target as HTMLImageElement;
                      
                      // Try to reload the image once
                      if (!target.dataset.retried) {
                        target.dataset.retried = 'true';
                        console.log('🔄 Retrying image load in 100ms...');
                        addDebugInfo('🔄 Retrying load...');
                        setTimeout(() => {
                          target.src = screenshot.data;
                        }, 100);
                        return;
                      }
                      
                      console.error('❌ Retry failed - hiding thumbnail and showing fallback');
                      addDebugInfo('❌ Retry failed');
                      target.style.display = 'none';
                      // Show fallback content
                      const parent = target.parentElement;
                      if (parent && !parent.querySelector('.fallback-content')) {
                        const fallback = document.createElement('div');
                        fallback.className = 'fallback-content flex items-center justify-center h-full bg-gray-200 text-gray-500 cursor-pointer';
                        fallback.innerHTML = '<div class="text-center"><div class="text-2xl mb-2">📷</div><div class="text-sm">Image load failed</div><div class="text-xs mt-1">Click to debug</div></div>';
                        fallback.onclick = () => {
                          console.log('🐛 DEBUG CLICKED - Full screenshot object:', screenshot);
                          addDebugInfo(`🐛 Debug clicked: ${screenshot.filename}`);
                        };
                        parent.appendChild(fallback);
                      }
                    }}
                    onLoad={(e) => {
                      const target = e.target as HTMLImageElement;
                      console.log('✅ Thumbnail loaded successfully:', screenshot.filename);
                      console.log('Natural size:', target.naturalWidth, 'x', target.naturalHeight);
                      console.log('Computed style display:', window.getComputedStyle(target).display);
                      console.log('Computed style visibility:', window.getComputedStyle(target).visibility);
                      console.log('Computed style opacity:', window.getComputedStyle(target).opacity);
                      addDebugInfo(`✅ Loaded: ${screenshot.filename} (${target.naturalWidth}x${target.naturalHeight})`);
                      
                      // Force a repaint to ensure the image displays
                      console.log('Before opacity fix - opacity:', target.style.opacity);
                      target.style.opacity = '0';
                      requestAnimationFrame(() => {
                        target.style.opacity = '1';
                        console.log('After opacity fix - opacity:', target.style.opacity);
                        console.log('Image visibility check:', {
                          display: window.getComputedStyle(target).display,
                          visibility: window.getComputedStyle(target).visibility,
                          opacity: window.getComputedStyle(target).opacity,
                          zIndex: window.getComputedStyle(target).zIndex,
                          position: window.getComputedStyle(target).position
                        });
                      });
                    }}
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center">
                    <div className="bg-white bg-opacity-90 rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <EyeIcon className="h-6 w-6 text-gray-700" />
                    </div>
                  </div>
                </div>
                
                <div className="p-3">
                  <div className="text-xs theme-text-secondary mb-2">
                    {new Date(screenshot.timestamp).toLocaleString()}
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium theme-text-primary truncate">
                      {screenshot.filename.replace('screenshot-', '').replace('.png', '')}
                    </span>
                    
                    <div className="flex gap-1">
                      <button
                        onClick={() => downloadScreenshot(screenshot)}
                        className="p-1 text-blue-600 hover:text-blue-800"
                        title="Download"
                      >
                        <ArrowDownTrayIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => deleteScreenshot(index)}
                        className="p-1 text-red-600 hover:text-red-800"
                        title="Delete"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Screenshot Modal */}
      {selectedScreenshot && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedScreenshot(null)}
        >
          <div
            className="bg-white rounded-lg max-w-5xl max-h-[90vh] overflow-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            style={{ width: 'min(90vw, 1200px)' }}
          >
            <div className="p-4 border-b flex justify-between items-center bg-gray-50">
              <div>
                <h3 className="font-semibold text-lg">{selectedScreenshot.filename}</h3>
                <p className="text-sm theme-text-secondary">
                  {new Date(selectedScreenshot.timestamp).toLocaleString()}
                </p>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => downloadScreenshot(selectedScreenshot)}
                  className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1 text-sm"
                >
                  <ArrowDownTrayIcon className="h-4 w-4" />
                  Download
                </button>
                <button
                  onClick={() => setSelectedScreenshot(null)}
                  className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm"
                >
                  ✕ Close
                </button>
              </div>
            </div>
            
            <div className="p-4 bg-white">
              <img
                src={selectedScreenshot.data}
                alt={selectedScreenshot.filename}
                className="max-w-full max-h-[60vh] mx-auto rounded shadow-lg"
                style={{ 
                  objectFit: 'contain',
                  imageRendering: 'auto',
                  backfaceVisibility: 'hidden'
                }}
                onLoad={(e) => {
                  const target = e.target as HTMLImageElement;
                  console.log('Modal image loaded:', target.naturalWidth, 'x', target.naturalHeight);
                }}
                onError={(e) => {
                  console.error('Modal image failed to load');
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const parent = target.parentElement;
                  if (parent) {
                    parent.innerHTML = '<div class="flex items-center justify-center h-64 bg-gray-100 rounded"><div class="text-center text-gray-500"><div class="text-4xl mb-4">⚠️</div><div>Failed to load image</div></div></div>';
                  }
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}